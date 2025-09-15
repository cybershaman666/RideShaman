import { GoogleGenAI, Type } from "@google/genai";
import type { RideRequest, Vehicle, AssignmentResultData, ErrorResult, AssignmentAlternative, Tariff, RideLog } from '../types';
import { VehicleStatus, VehicleType } from '../types';

const GEMINI_API_KEY = process.env.API_KEY;
if (!GEMINI_API_KEY) {
  console.error("API_KEY environment variable not set for Gemini.");
}
const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY! });

/**
 * Generates an SMS message for the driver in the selected language.
 */
export function generateSms(ride: RideRequest | RideLog, t: (key: string, params?: any) => string): string {
  let formattedPickupTime = ride.pickupTime;
  
  if (ride.pickupTime === 'ihned') {
    formattedPickupTime = t('sms.pickupASAP');
  } else if (ride.pickupTime && !isNaN(new Date(ride.pickupTime).getTime())) {
    const date = new Date(ride.pickupTime);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    formattedPickupTime = `${hours}:${minutes}`;
  }

  const stopsText = ride.stops.map((stop, index) => `${index + 1}. ${stop}`).join(', ');

  const baseSms = `${t('sms.route')}: ${stopsText}. ${t('sms.name')}: ${ride.customerName}, ${t('sms.phone')}: ${ride.customerPhone}, ${t('sms.passengers')}: ${ride.passengers}, ${t('sms.pickupTime')}: ${formattedPickupTime}`;
  
  return ride.notes ? `${baseSms}, ${t('sms.note')}: ${ride.notes}` : baseSms;
}

// Simple in-memory cache for geocoding results
const geocodeCache = new Map<string, { lat: number; lon: number }>();
// Bounding box for South Moravia to prioritize local search results
const SOUTH_MORAVIA_VIEWBOX = '16.3,48.7,17.2,49.3'; // lon_min,lat_min,lon_max,lat_max

/**
 * Converts an address to geographic coordinates using Nominatim (OpenStreetMap).
 */
async function geocodeAddress(address: string): Promise<{ lat: number; lon: number }> {
    if (geocodeCache.has(address)) return geocodeCache.get(address)!;

    const fetchCoords = async (addrToTry: string, lang: string) => {
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addrToTry)}&countrycodes=cz&viewbox=${SOUTH_MORAVIA_VIEWBOX}&accept-language=${lang}`;
        const response = await fetch(url, { headers: { 'User-Agent': 'RapidDispatchAI/1.0' } });
        if (!response.ok) return null;
        const data = await response.json();
        return (data && data.length > 0) ? { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) } : null;
    };

    try {
        let result = await fetchCoords(address, 'cs');
        if (!result) {
            const city = address.split(',').map(p => p.trim()).pop();
            if (city && city.toLowerCase() !== address.toLowerCase()) {
                result = await fetchCoords(city, 'cs');
            }
        }
        
        if (result) {
            geocodeCache.set(address, result);
            return result;
        }
        throw new Error(`Address not found: ${address}`);
    } catch (error) {
        console.error("Geocoding error:", error);
        throw new Error(`Could not find coordinates for address: ${address}.`);
    }
}


/**
 * Gets route details (duration, distance) from OSRM.
 */
async function getOsrmRoute(coordinates: string): Promise<{ duration: number; distance: number } | null> {
     try {
        const response = await fetch(`https://router.project-osrm.org/route/v1/driving/${coordinates}?overview=false`);
        if (!response.ok) throw new Error('Network response was not ok for OSRM');
        const data = await response.json();
        if (data.code === 'Ok' && data.routes?.length > 0) {
            const route = data.routes[0];
            return { duration: route.duration, distance: route.distance };
        }
        return null;
    } catch (error) {
        console.error("OSRM error:", error);
        return null;
    }
}

/**
 * Calculates the price of a ride based on a tariff, prioritizing flat rates.
 */
function calculatePrice(
    pickupAddress: string,
    destinationAddress: string,
    rideDistanceKm: number,
    vehicleType: VehicleType,
    tariff: Tariff,
): number {
    const pickupLower = pickupAddress.toLowerCase();
    const destLower = destinationAddress.toLowerCase();

    for (const rate of tariff.flatRates) {
        const rateNameLower = rate.name.toLowerCase();
        if ((rateNameLower.includes("mikulov") && pickupLower.includes("mikulov") && destLower.includes("mikulov")) ||
            (rateNameLower.includes("hustopeč") && pickupLower.includes("hustopeče") && destLower.includes("hustopeče")) ||
            (rateNameLower.includes("zaječí") && (pickupLower.includes("zaječí") || destLower.includes("zaječí")))) {
            return rate.price;
        }
    }

    const pricePerKm = vehicleType === VehicleType.Car ? tariff.pricePerKmCar : tariff.pricePerKmVan;
    return Math.round(tariff.startingFee + (rideDistanceKm * pricePerKm));
}

/**
 * Main function to find the best vehicle for a multi-stop ride request.
 */
export async function findBestVehicle(
  rideRequest: RideRequest,
  vehicles: Vehicle[],
  isAiEnabled: boolean,
  tariff: Tariff,
  language: string,
): Promise<AssignmentResultData | ErrorResult> {
    if (isAiEnabled && !GEMINI_API_KEY) return { messageKey: "error.missingApiKey" };
    
    const vehiclesInService = vehicles.filter(v => v.status !== VehicleStatus.OutOfService && v.status !== VehicleStatus.NotDrivingToday);
    if (vehiclesInService.length === 0) return { messageKey: "error.noVehiclesInService" };
    
    const t = (key: string, params?: any) => key;
    let sms = generateSms(rideRequest, t);
    let optimizedStops: string[] | undefined = undefined;

    try {
        const allStopCoords = await Promise.all(rideRequest.stops.map(stop => geocodeAddress(stop)));
        const vehicleCoords = await Promise.all(vehiclesInService.map(v => geocodeAddress(v.location)));
        const pickupCoords = allStopCoords[0];
        
        // --- Optimize route if more than 2 stops and AI is enabled ---
        if (rideRequest.stops.length > 2 && isAiEnabled) {
            const travelTimeMatrix = await buildTravelTimeMatrix(allStopCoords);
            const optimalOrder = await getOptimalRouteOrder(travelTimeMatrix);
            
            const reorderedStops = [rideRequest.stops[0]];
            const reorderedCoords = [allStopCoords[0]];
            optimalOrder.forEach(i => {
                reorderedStops.push(rideRequest.stops[i + 1]);
                reorderedCoords.push(allStopCoords[i + 1]);
            });

            allStopCoords.splice(0, allStopCoords.length, ...reorderedCoords);
            optimizedStops = reorderedStops;
            sms = generateSms({ ...rideRequest, stops: optimizedStops }, t);
        }

        const mainRideRoute = await getOsrmRoute(allStopCoords.map(c => `${c.lon},${c.lat}`).join(';'));
        if (!mainRideRoute) return { messageKey: "error.mainRouteCalculationFailed" };

        const rideDistanceKm = mainRideRoute.distance / 1000;
        const rideDurationMinutes = Math.round(mainRideRoute.duration / 60);

        const etasData = await Promise.all(vehicleCoords.map(coords => getOsrmRoute(`${coords.lon},${coords.lat};${pickupCoords.lon},${pickupCoords.lat}`)));
        
        const alternativesWithEta: AssignmentAlternative[] = vehiclesInService.map((vehicle, index) => {
            const route = etasData[index];
            const eta = route ? Math.round(route.duration / 60) : 999;
            const waitTime = vehicle.status === VehicleStatus.Busy && vehicle.freeAt ? Math.max(0, Math.round((vehicle.freeAt - Date.now()) / 60000)) : 0;
            return {
                vehicle,
                eta: eta + waitTime,
                waitTime,
                estimatedPrice: calculatePrice(rideRequest.stops[0], rideRequest.stops[rideRequest.stops.length - 1], rideDistanceKm, vehicle.type, tariff),
            };
        });

        if (!isAiEnabled) {
            return {
                vehicle: vehiclesInService[0],
                eta: 0,
                estimatedPrice: 0,
                sms,
                alternatives: alternativesWithEta.sort((a, b) => a.eta - b.eta),
                rideRequest,
                rideDuration: rideDurationMinutes,
                rideDistance: rideDistanceKm,
                optimizedStops
            };
        }
        
        const suitableVehicles = alternativesWithEta.filter(alt => alt.vehicle.capacity >= rideRequest.passengers);
        if (suitableVehicles.length === 0) return { messageKey: "error.insufficientCapacity", message: `${rideRequest.passengers}` };
        
        suitableVehicles.sort((a, b) => a.eta - b.eta);
        const bestAlternative = await chooseBestVehicleWithAI(rideRequest, suitableVehicles);
        const otherAlternatives = suitableVehicles.filter(v => v.vehicle.id !== bestAlternative.vehicle.id);

        return {
            vehicle: bestAlternative.vehicle,
            eta: bestAlternative.eta,
            waitTime: bestAlternative.waitTime,
            estimatedPrice: bestAlternative.estimatedPrice,
            rideDuration: rideDurationMinutes,
            rideDistance: rideDistanceKm,
            sms,
            alternatives: otherAlternatives,
            rideRequest,
            optimizedStops,
        };

    } catch (e: any) {
        return { messageKey: "error.geocodingFailed", message: e.message };
    }
}

async function buildTravelTimeMatrix(coords: {lat: number, lon: number}[]) {
    const destinations = coords.slice(1);
    const matrix: number[][] = [];
    for (const origin of destinations) {
        const row: number[] = [];
        for (const destination of destinations) {
            if (origin === destination) {
                row.push(0);
                continue;
            }
            const route = await getOsrmRoute(`${origin.lon},${origin.lat};${destination.lon},${destination.lat}`);
            row.push(route ? Math.round(route.duration / 60) : 999);
        }
        matrix.push(row);
    }
    return matrix;
}

async function getOptimalRouteOrder(matrix: number[][]): Promise<number[]> {
    const prompt = `
        Solve the Traveling Salesperson Problem for the given travel time matrix.
        The matrix represents travel times in minutes between destinations (excluding the start point).
        The goal is to find the shortest path that visits each destination exactly once.
        The start point is fixed and is not part of the matrix.
        The matrix is zero-indexed, corresponding to destinations 1, 2, 3, etc.

        Travel Time Matrix (in minutes):
        ${JSON.stringify(matrix)}

        Return a single, valid JSON object containing an array of zero-based indices representing the optimal order of destinations to visit.
        For example, for 3 destinations (indices 0, 1, 2), a valid output would be {"optimal_order": [2, 0, 1]}.
        Do not include any other text or markdown.
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            temperature: 0,
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    optimal_order: {
                        type: Type.ARRAY,
                        items: { type: Type.INTEGER }
                    }
                },
                required: ["optimal_order"]
            },
        }
    });

    const result = JSON.parse(response.text.trim());
    return result.optimal_order;
}

async function chooseBestVehicleWithAI(rideRequest: RideRequest, suitableVehicles: AssignmentAlternative[]): Promise<AssignmentAlternative> {
    const vehicleDataForPrompt = suitableVehicles.map(alt => ({ id: alt.vehicle.id, name: alt.vehicle.name, capacity: alt.vehicle.capacity, eta: alt.eta, price: alt.estimatedPrice }));
    const prompt = `
        You are an expert taxi dispatcher. Your task is to select the single best vehicle for a customer from the provided list of options.
        **Ride Request Details:**
        - Number of Passengers: ${rideRequest.passengers}
        - Route: ${rideRequest.stops.join(" -> ")}
        **Vehicle Options (pre-sorted by ETA):**
        ${JSON.stringify(vehicleDataForPrompt, null, 2)}
        **Decision Criteria:**
        Your primary goal is to minimize the customer's wait time. Select the vehicle with the lowest 'eta'.
        If multiple vehicles have the same lowest ETA, choose the first one in the list.
        **Required Output:**
        Return a SINGLE, VALID JSON object containing only the ID of your chosen vehicle. Do not include any other text or markdown.
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash', contents: prompt, config: {
            temperature: 0, responseMimeType: "application/json",
            responseSchema: { type: Type.OBJECT, properties: { bestVehicleId: { type: Type.INTEGER } }, required: ["bestVehicleId"] },
        }
    });

    const choiceResult = JSON.parse(response.text.trim());
    const bestVehicleId = choiceResult.bestVehicleId;
    let bestAlternative = suitableVehicles.find(alt => alt.vehicle.id === bestVehicleId);
    if (!bestAlternative) {
        console.error("AI returned an invalid vehicle ID. Falling back to the first suitable vehicle.");
        bestAlternative = suitableVehicles[0];
    }
    return bestAlternative;
}
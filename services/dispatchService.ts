import { GoogleGenAI, Type } from "@google/genai";
import type { RideRequest, Vehicle, AssignmentResultData, ErrorResult, AssignmentAlternative, Tariff, RideLog, FlatRateRule, MessagingApp } from '../types';
import { VehicleStatus, VehicleType, MessagingApp as AppType } from '../types';

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

/**
 * Generates a shareable link for various messaging apps.
 */
export function generateShareLink(app: AppType, phone: string, text: string): string {
    const encodedText = encodeURIComponent(text);
    const cleanPhone = phone.replace(/\s/g, '');

    switch(app) {
        case AppType.WhatsApp:
            // The phone number needs to be in international format without '+' or '00' for wa.me links
            const internationalPhone = cleanPhone.startsWith('420') ? cleanPhone : `420${cleanPhone}`;
            return `https://wa.me/${internationalPhone}?text=${encodedText}`;
        case AppType.Telegram:
            // Telegram share link doesn't support phone numbers directly, it opens the share sheet.
            return `tg://share/url?text=${encodedText}`;
        case AppType.SMS:
        default:
            return `sms:${cleanPhone}?body=${encodedText}`;
    }
}

/**
 * Generates a Google Maps navigation URL for a multi-stop route.
 * Starts from the driver's current location to the first stop, then through subsequent stops.
 */
export function generateNavigationUrl(driverLocation: string, stops: string[]): string {
    if (!driverLocation || stops.length === 0) return 'https://maps.google.com';
    
    const waypoints = stops.slice(0, -1); // All stops except the last one are waypoints
    const destination = stops.slice(-1)[0]; // The last stop is the final destination

    const url = new URL('https://www.google.com/maps/dir/');
    url.pathname += `${encodeURIComponent(driverLocation)}/`;
    if (waypoints.length > 0) {
      url.pathname += `${waypoints.map(encodeURIComponent).join('/')}/`;
    }
    url.pathname += `${encodeURIComponent(destination)}`;
    
    return url.toString();
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
    const proxyUrl = 'https://corsproxy.io/?';

    const fetchCoords = async (addrToTry: string, lang: string) => {
        const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addrToTry)}&countrycodes=cz&viewbox=${SOUTH_MORAVIA_VIEWBOX}&accept-language=${lang}`;
        const url = `${proxyUrl}${nominatimUrl}`;
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
    passengers: number,
    tariff: Tariff
): number {
    const pickupLower = pickupAddress.toLowerCase();
    const destLower = destinationAddress.toLowerCase();

    // A ride for more than 4 passengers requires a van price, regardless of the vehicle used.
    // Also, if a van is used for a smaller ride, the van price still applies.
    const chargeVanPrice = vehicleType === VehicleType.Van || passengers > 4;

    for (const rate of tariff.flatRates) {
        const rateNameLower = rate.name.toLowerCase();
        if ((rateNameLower.includes("mikulov") && pickupLower.includes("mikulov") && destLower.includes("mikulov")) ||
            (rateNameLower.includes("hustopeč") && pickupLower.includes("hustopeče") && destLower.includes("hustopeče")) ||
            (rateNameLower.includes("zaječí") && (pickupLower.includes("zaječí") || destLower.includes("zaječí")))) {
            return chargeVanPrice ? rate.priceVan : rate.priceCar;
        }
    }

    const pricePerKm = chargeVanPrice ? tariff.pricePerKmVan : tariff.pricePerKmCar;
    return Math.round(tariff.startingFee + (rideDistanceKm * pricePerKm));
}

/**
 * Calculates a travel time matrix between a set of coordinates.
 */
async function buildTravelMatrix(coords: { lat: number; lon: number }[], unit: 'seconds' | 'minutes'): Promise<number[][]> {
    const matrix: number[][] = [];
    for (const origin of coords) {
        const row: number[] = [];
        for (const destination of coords) {
            if (origin === destination) {
                row.push(0);
                continue;
            }
            const route = await getOsrmRoute(`${origin.lon},${origin.lat};${destination.lon},${destination.lat}`);
            if (route) {
                const value = unit === 'minutes' ? Math.round(route.duration / 60) : route.duration;
                row.push(value);
            } else {
                row.push(unit === 'minutes' ? 999 : 99999); // Use a large number for errors
            }
        }
        matrix.push(row);
    }
    return matrix;
}

/**
 * Optimizes route order using a simple Nearest Neighbor heuristic.
 * This is a non-AI fallback for route optimization.
 * Returns the new order of original indices, e.g., [0, 2, 1, 3].
 */
function optimizeRouteNearestNeighbor(matrix: number[][]): number[] {
    if (matrix.length < 3) {
        return Array.from({ length: matrix.length }, (_, i) => i);
    }

    const numPoints = matrix.length;
    const path = [0]; // Start at the pickup location (index 0)
    const visited = new Set<number>([0]);
    let lastPoint = 0;

    while (path.length < numPoints) {
        let nearestPoint = -1;
        let minDistance = Infinity;

        for (let i = 0; i < numPoints; i++) {
            if (!visited.has(i)) {
                if (matrix[lastPoint][i] < minDistance) {
                    minDistance = matrix[lastPoint][i];
                    nearestPoint = i;
                }
            }
        }

        if (nearestPoint !== -1) {
            path.push(nearestPoint);
            visited.add(nearestPoint);
            lastPoint = nearestPoint;
        } else {
            for (let i = 0; i < numPoints; i++) {
                if (!visited.has(i)) {
                    path.push(i);
                    visited.add(i);
                }
            }
            break;
        }
    }
    return path;
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
  optimize: boolean
): Promise<AssignmentResultData | ErrorResult> {
    if (isAiEnabled && !GEMINI_API_KEY) return { messageKey: "error.missingApiKey" };
    
    const vehiclesInService = vehicles.filter(v => v.status !== VehicleStatus.OutOfService && v.status !== VehicleStatus.NotDrivingToday);
    if (vehiclesInService.length === 0) return { messageKey: "error.noVehiclesInService" };
    
    const t = (key: string, params?: any) => key;
    let sms = generateSms(rideRequest, t);
    let optimizedStops: string[] | undefined = undefined;

    try {
        let allStopCoords = await Promise.all(rideRequest.stops.map(stop => geocodeAddress(stop)));
        const vehicleCoords = await Promise.all(vehiclesInService.map(v => geocodeAddress(v.location)));
        const pickupCoords = allStopCoords[0];
        
        // --- Optimize route if more than 2 stops and requested ---
        if (rideRequest.stops.length > 2 && optimize) {
             let reorderingIndices: number[];

             if (isAiEnabled) {
                const travelTimeMatrix = await buildTravelMatrix(allStopCoords, 'minutes');
                const optimalDestinationOrder = await getOptimalRouteOrder(travelTimeMatrix, rideRequest.stops.length - 1);
                reorderingIndices = [0, ...optimalDestinationOrder]; // Prepend start index
            } else {
                // Use non-AI Nearest Neighbor heuristic
                const travelMatrix = await buildTravelMatrix(allStopCoords, 'seconds');
                reorderingIndices = optimizeRouteNearestNeighbor(travelMatrix);
            }

            const reorderedStops = reorderingIndices.map(i => rideRequest.stops[i]);
            const reorderedCoords = reorderingIndices.map(i => allStopCoords[i]);

            allStopCoords = reorderedCoords;
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
            const finalDestination = (optimizedStops || rideRequest.stops).slice(-1)[0];
            return {
                vehicle,
                eta: eta + waitTime,
                waitTime,
                estimatedPrice: calculatePrice(rideRequest.stops[0], finalDestination, rideDistanceKm, vehicle.type, rideRequest.passengers, tariff),
            };
        });

        alternativesWithEta.sort((a, b) => a.eta - b.eta);

        const suitableVehicles = alternativesWithEta.filter(alt => alt.vehicle.capacity >= rideRequest.passengers);
        if (suitableVehicles.length === 0) return { messageKey: "error.insufficientCapacity", message: `${rideRequest.passengers}` };
        
        let bestAlternative: AssignmentAlternative;
        let otherAlternatives: AssignmentAlternative[];

        if (isAiEnabled) {
            bestAlternative = await chooseBestVehicleWithAI(rideRequest, suitableVehicles);
            otherAlternatives = suitableVehicles.filter(v => v.vehicle.id !== bestAlternative.vehicle.id);
        } else {
            // In non-AI mode, the best vehicle is simply the first one in the list sorted by ETA.
            bestAlternative = suitableVehicles[0];
            otherAlternatives = suitableVehicles.slice(1);
        }

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

async function getOptimalRouteOrder(matrix: number[][], numDestinations: number): Promise<number[]> {
    const destinationIndices = Array.from({ length: numDestinations }, (_, i) => i + 1);

    const prompt = `
        You are a logistics expert tasked with finding the most efficient route.
        Given a travel time matrix, find the shortest path that starts at index 0 and visits all other specified destinations exactly once. The path does not need to return to the start.

        **Problem Details:**
        - **Start Point:** Index 0 (fixed).
        - **Destinations to Visit:** Indices ${JSON.stringify(destinationIndices)}.
        - **Travel Time Matrix (in minutes):** Each entry matrix[i][j] is the time from location i to location j.
        ${JSON.stringify(matrix)}

        **Required Output:**
        Return a single, valid JSON object with a key "optimal_order". The value should be an array of the destination indices (e.g., ${JSON.stringify(destinationIndices)}) in the most efficient order.
        For example, if the destinations are [1, 2, 3], a valid output showing the optimal path 0 -> 3 -> 1 -> 2 would be:
        {"optimal_order": [3, 1, 2]}

        Do not include any other text, explanations, or markdown formatting.
    `;

    try {
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
        // Basic validation
        if (Array.isArray(result.optimal_order) && result.optimal_order.length === numDestinations) {
            return result.optimal_order;
        } else {
            console.error("AI returned an invalid route order. Falling back to original order.", result);
            return destinationIndices; // Fallback to original order
        }
    } catch (error) {
        console.error("Error getting optimal route from AI. Falling back to original order.", error);
        return destinationIndices; // Fallback to original order on error
    }
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
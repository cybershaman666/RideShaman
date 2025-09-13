

import { GoogleGenAI, Type } from "@google/genai";
import type { RideRequest, Vehicle, AssignmentResultData, ErrorResult, AssignmentAlternative, Tariff } from '../types';
import { VehicleStatus, VehicleType } from '../types';

const GEMINI_API_KEY = process.env.API_KEY;
if (!GEMINI_API_KEY) {
  console.error("API_KEY environment variable not set for Gemini.");
}
const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY! });

/**
 * Generates an SMS message for the driver.
 */
export function generateSms(ride: RideRequest): string {
  let formattedPickupTime = ride.pickupTime;
  
  if (ride.pickupTime === 'ihned') {
    formattedPickupTime = 'co nejdříve';
  } else if (ride.pickupTime && !isNaN(new Date(ride.pickupTime).getTime())) {
    const date = new Date(ride.pickupTime);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    formattedPickupTime = `${hours}:${minutes}`;
  }

  const baseSms = `Odkud: ${ride.pickupAddress}, Kam: ${ride.destinationAddress}, Jméno: ${ride.customerName}, Telefon: ${ride.customerPhone}, Počet osob: ${ride.passengers}, Vyzvednout: ${formattedPickupTime}`;
  
  return ride.notes ? `${baseSms}, Poznámka: ${ride.notes}` : baseSms;
}

// Simple in-memory cache for geocoding results
const geocodeCache = new Map<string, { lat: number; lon: number }>();
// Bounding box for South Moravia to prioritize local search results
const SOUTH_MORAVIA_VIEWBOX = '16.3,48.7,17.2,49.3'; // lon_min,lat_min,lon_max,lat_max

/**
 * Converts an address to geographic coordinates using Nominatim (OpenStreetMap).
 * It includes a fallback to search for just the city if the full address is not found.
 * It prioritizes results within the South Moravia region.
 */
async function geocodeAddress(address: string): Promise<{ lat: number; lon: number }> {
    const cached = geocodeCache.get(address);
    if (cached) {
        return cached;
    }

    const fetchCoords = async (addrToTry: string) => {
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addrToTry)}&countrycodes=cz&viewbox=${SOUTH_MORAVIA_VIEWBOX}`;
        const response = await fetch(url, {
            headers: { 'User-Agent': 'RapidDispatchAI/1.0 (https://example.com)' }
        });
        if (!response.ok) return null;
        const data = await response.json();
        if (data && data.length > 0) {
            return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
        }
        return null;
    };

    try {
        // Attempt 1: Full address
        let result = await fetchCoords(address);

        // Attempt 2: Fallback to just the city/town if full address fails
        if (!result) {
            const parts = address.split(',').map(p => p.trim());
            const city = parts[parts.length - 1];
            if (city && city.toLowerCase() !== address.toLowerCase()) {
                console.log(`Geocoding for "${address}" failed. Falling back to "${city}".`);
                result = await fetchCoords(city);
            }
        }
        
        if (result) {
            geocodeCache.set(address, result); // Cache under the original full address
            return result;
        }

        throw new Error(`Address not found: ${address}`);
    } catch (error) {
        console.error("Geocoding error:", error);
        throw new Error(`Nepodařilo se najít souřadnice pro adresu: ${address}. Zkuste ji upřesnit.`);
    }
}


/**
 * Gets route details (duration, distance) from OSRM.
 */
async function getOsrmRoute(
    coordinates: string // format: lon1,lat1;lon2,lat2
): Promise<{ duration: number; distance: number } | null> {
     try {
        const response = await fetch(`https://router.project-osrm.org/route/v1/driving/${coordinates}?overview=false`);
        if (!response.ok) throw new Error('Network response was not ok for OSRM');
        const data = await response.json();
        if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
            const route = data.routes[0];
            return {
                duration: route.duration, // in seconds
                distance: route.distance, // in meters
            };
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
    rideRequest: RideRequest,
    rideDistanceKm: number,
    vehicleType: VehicleType,
    tariff: Tariff,
): number {
    const { pickupAddress, destinationAddress } = rideRequest;
    const pickupLower = pickupAddress.toLowerCase();
    const destLower = destinationAddress.toLowerCase();

    // Check for flat rates first using heuristics based on default tariff names
    for (const rate of tariff.flatRates) {
        const rateNameLower = rate.name.toLowerCase();

        // Heuristic for "V rámci [City]"
        if (rateNameLower.includes("v rámci mikulova")) {
            if (pickupLower.includes("mikulov") && destLower.includes("mikulov")) return rate.price;
        } else if (rateNameLower.includes("v rámci hustopečí")) {
            if (pickupLower.includes("hustopeče") && destLower.includes("hustopeče")) return rate.price;
        } 
        // Heuristic for "Location A - Location B"
        else if (rateNameLower.includes("zaječí") && rateNameLower.includes("diskotéka")) {
            if ((pickupLower.includes("zaječí") && destLower.includes("diskotéka")) ||
                (pickupLower.includes("diskotéka") && destLower.includes("zaječí"))) {
                return rate.price;
            }
        }
    }

    // If no flat rate matches, calculate metered fare
    const pricePerKm = vehicleType === VehicleType.Car ? tariff.pricePerKmCar : tariff.pricePerKmVan;
    const meteredPrice = tariff.startingFee + (rideDistanceKm * pricePerKm);
    
    return Math.round(meteredPrice);
}


/**
 * Finds the best vehicle for a given ride request.
 * Price calculation is done locally. AI is only used to select the best option.
 * Handles both AI and Manual modes.
 */
export async function findBestVehicle(
  rideRequest: RideRequest,
  vehicles: Vehicle[],
  isAiEnabled: boolean,
  tariff: Tariff,
): Promise<AssignmentResultData | ErrorResult> {

    if (isAiEnabled && !GEMINI_API_KEY) {
        return { message: "Chybí konfigurační klíč pro AI služby." };
    }
    
    const vehiclesInService = vehicles.filter(v => v.status !== VehicleStatus.OutOfService && v.status !== VehicleStatus.NotDrivingToday);
    
    if (vehiclesInService.length === 0) {
        return { message: "Všechna vozidla jsou momentálně mimo provoz." };
    }

    const sms = generateSms(rideRequest);
    
    // --- Step 1: Geocode all necessary locations ---
    let pickupCoords: { lat: number, lon: number };
    let destinationCoords: { lat: number, lon: number };
    let vehicleCoords: ({ lat: number, lon: number })[];

    try {
        // Geocode concurrently for speed
        [pickupCoords, destinationCoords] = await Promise.all([
            geocodeAddress(rideRequest.pickupAddress),
            geocodeAddress(rideRequest.destinationAddress)
        ]);
        
        const vehicleCoordsPromises = vehiclesInService.map(v => geocodeAddress(v.location));
        vehicleCoords = await Promise.all(vehicleCoordsPromises);

    } catch (e: any) {
        return { message: e.message || "Chyba při zjišťování polohy z adres." };
    }

    // --- Step 2: Get all ETAs from vehicles to pickup location from OSRM ---
    const etaPromises = vehicleCoords.map(coords => {
        const coordString = `${coords.lon},${coords.lat};${pickupCoords.lon},${pickupCoords.lat}`;
        return getOsrmRoute(coordString);
    });

    const etasData = await Promise.all(etaPromises);
    
    const alternativesWithEta: AssignmentAlternative[] = vehiclesInService.map((vehicle, index) => {
        const route = etasData[index];
        const eta = route ? Math.round(route.duration / 60) : 999;
        
        const waitTime = vehicle.status === VehicleStatus.Busy && vehicle.freeAt 
            ? Math.max(0, Math.round((vehicle.freeAt - Date.now()) / 60000))
            : 0;

        return {
            vehicle,
            eta: eta + waitTime,
            waitTime,
            estimatedPrice: 0 // Will be calculated next
        };
    });
    
    // --- Step 3: Get main ride distance/duration from OSRM ---
    const mainRideRoute = await getOsrmRoute(`${pickupCoords.lon},${pickupCoords.lat};${destinationCoords.lon},${destinationCoords.lat}`);

    if (!mainRideRoute) {
        return { message: "Nepodařilo se vypočítat vzdálenost hlavní trasy." };
    }
    const rideDistanceKm = mainRideRoute.distance / 1000;
    const rideDurationMinutes = Math.round(mainRideRoute.duration / 60);
    
    // --- Step 4: Calculate prices for all alternatives locally ---
    const alternativesWithPrice = alternativesWithEta.map(alt => ({
        ...alt,
        estimatedPrice: calculatePrice(rideRequest, rideDistanceKm, alt.vehicle.type, tariff),
    }));


    // --- Step 5: Handle Manual vs. AI mode ---
    if (!isAiEnabled) {
        return {
            vehicle: vehiclesInService[0], // Placeholder
            eta: 0,
            estimatedPrice: 0,
            sms,
            alternatives: alternativesWithPrice.sort((a,b) => a.eta - b.eta),
            rideRequest,
            rideDuration: rideDurationMinutes,
            rideDistance: rideDistanceKm,
        };
    }
    
    // --- Step 6 (AI): Ask AI to choose the best vehicle from the priced list ---
    const suitableVehicles = alternativesWithPrice.filter(
        alt => alt.vehicle.capacity >= rideRequest.passengers
    );

    if (suitableVehicles.length === 0) {
        return { message: `Žádné vozidlo nemá dostatečnou kapacitu pro ${rideRequest.passengers} cestujících.` };
    }
    
    suitableVehicles.sort((a, b) => a.eta - b.eta); // Pre-sort for the AI

    const vehicleDataForPrompt = suitableVehicles.map(alt => ({
        id: alt.vehicle.id,
        name: alt.vehicle.name,
        capacity: alt.vehicle.capacity,
        eta: alt.eta,
        price: alt.estimatedPrice
    }));

    const prompt = `
        You are an expert taxi dispatcher. Your task is to select the single best vehicle for a customer from the provided list of options.

        **Ride Request Details:**
        - Number of Passengers: ${rideRequest.passengers}
        - Pickup: "${rideRequest.pickupAddress}"
        - Destination: "${rideRequest.destinationAddress}"
        - Notes: ${rideRequest.notes || 'N/A'}

        **Vehicle Options (pre-sorted by ETA):**
        ${JSON.stringify(vehicleDataForPrompt, null, 2)}

        **Decision Criteria:**
        Your primary goal is to minimize the customer's wait time.
        1. Select the vehicle with the lowest 'eta'.
        2. All other factors are secondary. If multiple vehicles have the same lowest ETA, choose the first one in the list.

        **Required Output:**
        Return a SINGLE, VALID JSON object containing only the ID of your chosen vehicle. Do not include any other text or markdown.
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            temperature: 0, // Deterministic choice
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    bestVehicleId: {
                        type: Type.INTEGER,
                        description: 'The ID of the single best vehicle.'
                    }
                },
                required: ["bestVehicleId"]
            },
        }
    });
    
    const choiceResult = JSON.parse(response.text.trim());
    const bestVehicleId = choiceResult.bestVehicleId;

    let bestAlternative = suitableVehicles.find(alt => alt.vehicle.id === bestVehicleId);

    // Fallback if AI hallucinates an ID
    if (!bestAlternative) {
        console.error("AI returned an invalid vehicle ID. Falling back to the first suitable vehicle.");
        bestAlternative = suitableVehicles[0];
    }
    
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
        rideRequest
    };
}
export enum VehicleType {
  Car = 'CAR',
  Van = 'VAN',
}

export enum VehicleStatus {
  Available = 'AVAILABLE',
  Busy = 'BUSY',
  OutOfService = 'OUT_OF_SERVICE',
  NotDrivingToday = 'NOT_DRIVING_TODAY',
}

export enum RideStatus {
  Scheduled = 'SCHEDULED',
  OnTheWay = 'ON_THE_WAY',
  Completed = 'COMPLETED',
  Cancelled = 'CANCELLED',
}

export enum PersonRole {
  Driver = 'DRIVER',
  Management = 'MANAGEMENT',
  Dispatcher = 'DISPATCHER',
}

export enum MessagingApp {
  SMS = 'SMS',
  Telegram = 'Telegram',
  WhatsApp = 'WhatsApp',
}

export interface Person {
  id: number;
  name: string;
  phone: string;
  role: PersonRole;
}

export interface Vehicle {
  id: number;
  name: string;
  licensePlate: string;
  type: VehicleType;
  status: VehicleStatus;
  location: string;
  capacity: number;
  driverId: number | null; // Link to a Person
  // Timestamp for when the vehicle becomes free
  freeAt?: number; 
  // New vehicle management fields
  mileage?: number;
  serviceInterval?: number; // in km
  lastServiceMileage?: number; // in km
  technicalInspectionExpiry?: string; // YYYY-MM-DD
  vignetteExpiry?: string; // YYYY-MM-DD
  vehicleNotes?: string;
}

export interface RideRequest {
  stops: string[]; // First stop is pickup, the rest are destinations
  customerName: string;
  customerPhone: string;
  passengers: number;
  pickupTime: string;
  notes?: string;
}

export interface AssignmentAlternative {
  vehicle: Vehicle;
  eta: number;
  waitTime?: number;
  estimatedPrice: number;
}

export interface AssignmentResultData {
  vehicle: Vehicle; // Recommended vehicle
  eta: number;
  sms: string;
  estimatedPrice: number;
  waitTime?: number; // In case the recommended vehicle is busy
  rideDuration?: number;
  rideDistance?: number;
  alternatives: AssignmentAlternative[];
  rideRequest: RideRequest;
  optimizedStops?: string[]; // The reordered list of stops
  vehicleLocationCoords: { lat: number; lon: number };
  stopCoords: { lat: number; lon: number }[];
  navigationUrl: string;
}

export interface ErrorResult {
  messageKey: string;
  message?: string;
}

export interface RideLog {
  id: string;
  timestamp: number;
  vehicleName: string | null;
  vehicleLicensePlate: string | null;
  driverName: string | null;
  vehicleType: VehicleType | null;
  customerName: string;
  customerPhone: string;
  stops: string[]; // Full route, first is pickup
  pickupTime: string;
  status: RideStatus;
  vehicleId: number | null;
  smsSent: boolean;
  passengers: number;
  notes?: string;
  estimatedPrice?: number;
  // Timestamps for tracking and notifications
  estimatedPickupTimestamp?: number;
  estimatedCompletionTimestamp?: number;
}

// Types for customizable layout
export type WidgetId = 'dispatch' | 'vehicles' | 'rideLog' | 'map';

export interface LayoutItem {
  id: WidgetId;
  colStart: number;
  colSpan: number;
  rowStart: number;
  rowSpan: number;
}

export type LayoutConfig = LayoutItem[];

// Types for Notification System
export interface Notification {
  id: string;
  type: 'delay' | 'reminder';
  titleKey: string;
  messageKey: string;
  messageParams?: Record<string, string | number>;
  timestamp: number;
  rideLogId: string;
}

// Types for Pricing Tariff
export interface FlatRateRule {
  id: number;
  name: string;
  priceCar: number;
  priceVan: number;
}

export interface Tariff {
  startingFee: number;
  pricePerKmCar: number;
  pricePerKmVan: number;
  flatRates: FlatRateRule[];
}
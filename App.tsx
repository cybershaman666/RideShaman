import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { DispatchFormComponent } from './components/DispatchForm';
import { VehicleStatusTable } from './components/VehicleStatusTable';
import { AssignmentResult } from './components/AssignmentResult';
import { Vehicle, RideRequest, AssignmentResultData, VehicleStatus, VehicleType, ErrorResult, RideLog, RideStatus, LayoutConfig, LayoutItem, Notification, Person, PersonRole, WidgetId, Tariff, FlatRateRule, AssignmentAlternative } from './types';
import { findBestVehicle, generateSms } from './services/dispatchService';
import { LoadingSpinner } from './components/LoadingSpinner';
import { ShamanIcon, SettingsIcon, PhoneIcon, PriceTagIcon, BarChartIcon } from './components/icons';
import { EditVehicleModal } from './components/EditVehicleModal';
import { RideLogTable } from './components/RideLogTable';
import { AddVehicleModal } from './components/AddVehicleModal';
import { EditRideLogModal } from './components/EditRideLogModal';
import { OpenStreetMap } from './components/OpenStreetMap';
import { ManualAssignmentModal } from './components/ManualAssignmentModal';
import { DashboardWidget } from './components/DashboardWidget';
import { NotificationCenter } from './components/NotificationCenter';
import { ManagePeopleModal } from './components/PhoneDirectoryModal';
import { TariffSettingsModal } from './components/TariffSettingsModal';
import { AnalyticsModal } from './components/AnalyticsModal';
import { SmsPreviewModal } from './components/SmsPreviewModal';
import { useTranslation } from './contexts/LanguageContext';
import { SettingsModal } from './components/SettingsModal';


// Initial data for people
const initialPeople: Person[] = [
    { id: 1, name: 'Pavel Osička', phone: '736 168 796', role: PersonRole.Driver },
    { id: 2, name: 'Kuba', phone: '739 355 521', role: PersonRole.Driver },
    { id: 3, name: 'Kamil', phone: '730 635 302', role: PersonRole.Driver },
    { id: 4, name: 'Bubu', phone: '720 581 006', role: PersonRole.Driver },
    { id: 5, name: 'Adam', phone: '777 807 874', role: PersonRole.Driver },
    { id: 6, name: 'Honza', phone: '720 758 823', role: PersonRole.Driver },
    { id: 7, name: 'Vlado', phone: '792 892 655', role: PersonRole.Driver },
    { id: 8, name: 'Tomáš', phone: '773 567 403', role: PersonRole.Driver },
    { id: 9, name: 'René', phone: '776 203 667', role: PersonRole.Driver },
    { id: 10, name: 'Katka', phone: '603 172 900', role: PersonRole.Driver },
    { id: 11, name: 'Roman Michl', phone: '770 625 798', role: PersonRole.Management },
    { id: 12, name: 'Tomáš Michl', phone: '728 548 373', role: PersonRole.Management },
    { id: 13, name: 'Jirka', phone: '721 212 124', role: PersonRole.Dispatcher },
    { id: 14, name: 'Lukáš', phone: '702 020 505', role: PersonRole.Dispatcher },
];

// Initial mock data for vehicles, now referencing people by ID and including new service fields
const initialVehicles: Vehicle[] = [
  { id: 1, name: 'Škoda Superb #1', driverId: 1, licensePlate: '3J2 1234', type: VehicleType.Car, status: VehicleStatus.Available, location: 'Náměstí, Mikulov', capacity: 4, mileage: 150000, serviceInterval: 30000, lastServiceMileage: 145000, technicalInspectionExpiry: '2025-08-15', vignetteExpiry: '2025-01-31' },
  { id: 2, name: 'VW Passat #2', driverId: 2, licensePlate: '5B8 4567', type: VehicleType.Car, status: VehicleStatus.Available, location: 'Dukelské náměstí, Hustopeče', capacity: 4, mileage: 89000, serviceInterval: 30000, lastServiceMileage: 85000, technicalInspectionExpiry: '2024-11-20', vignetteExpiry: '2025-01-31' },
  { id: 3, name: 'Toyota Camry #3', driverId: 3, licensePlate: '1AX 8910', type: VehicleType.Car, status: VehicleStatus.Busy, location: 'Svatý kopeček, Mikulov', capacity: 4, freeAt: Date.now() + 15 * 60 * 1000, mileage: 45000, serviceInterval: 15000, lastServiceMileage: 40000, technicalInspectionExpiry: '2026-03-10', vignetteExpiry: '2025-01-31' },
  { id: 4, name: 'Ford Transit VAN', driverId: 4, licensePlate: '8E1 1121', type: VehicleType.Van, status: VehicleStatus.Available, location: 'Herbenova, Hustopeče', capacity: 8, mileage: 210000, serviceInterval: 40000, lastServiceMileage: 205000, technicalInspectionExpiry: '2025-05-01', vignetteExpiry: '2025-01-31' },
  { id: 5, name: 'Škoda Octavia #4', driverId: 5, licensePlate: '2CD 5678', type: VehicleType.Car, status: VehicleStatus.Available, location: 'Brněnská, Hustopeče', capacity: 4, mileage: 119500, serviceInterval: 30000, lastServiceMileage: 90000, technicalInspectionExpiry: '2024-09-30', vignetteExpiry: '2025-01-31' },
  { id: 6, name: 'Hyundai i30 #5', driverId: 6, licensePlate: '3EF 9012', type: VehicleType.Car, status: VehicleStatus.Available, location: 'Nádražní, Mikulov', capacity: 4, mileage: 62000, serviceInterval: 20000, lastServiceMileage: 60000, technicalInspectionExpiry: '2025-10-01', vignetteExpiry: '2025-01-31' },
  { id: 7, name: 'Renault Trafic VAN', driverId: 7, licensePlate: '4GH 3456', type: VehicleType.Van, status: VehicleStatus.Available, location: 'Pavlov', capacity: 8, mileage: 135000, serviceInterval: 40000, lastServiceMileage: 120000, technicalInspectionExpiry: '2025-02-28', vignetteExpiry: '2025-01-31' },
  { id: 8, name: 'VW Caddy #6', driverId: 8, licensePlate: '5IJ 7890', type: VehicleType.Car, status: VehicleStatus.Available, location: 'Zaječí', capacity: 4, mileage: 95000, serviceInterval: 30000, lastServiceMileage: 90000, technicalInspectionExpiry: '2025-07-15', vignetteExpiry: '2025-01-31' },
  { id: 9, name: 'Mercedes-Benz Vito', driverId: 9, licensePlate: '6KL 1234', type: VehicleType.Van, status: VehicleStatus.Available, location: 'Klentnice', capacity: 8, mileage: 180000, serviceInterval: 50000, lastServiceMileage: 175000, technicalInspectionExpiry: '2026-01-10', vignetteExpiry: '2025-01-31' },
  { id: 10, name: 'Škoda Fabia #7', driverId: 10, licensePlate: '7MN 5678', type: VehicleType.Car, status: VehicleStatus.Available, location: 'Sedlec', capacity: 4, mileage: 78000, serviceInterval: 30000, lastServiceMileage: 70000, technicalInspectionExpiry: '2025-12-01', vignetteExpiry: '2025-01-31' },
];


type SortKey = 'timestamp' | 'customerName';
type SortDirection = 'asc' | 'desc';

const DEFAULT_LAYOUT: LayoutConfig = [
    { id: 'dispatch', colStart: 1, colSpan: 2, rowStart: 1, rowSpan: 3 },
    { id: 'vehicles', colStart: 3, colSpan: 2, rowStart: 1, rowSpan: 3 },
    { id: 'map', colStart: 5, colSpan: 2, rowStart: 1, rowSpan: 3 },
    { id: 'rideLog', colStart: 1, colSpan: 6, rowStart: 4, rowSpan: 3 },
];

export const DEFAULT_TARIFF: Tariff = {
  startingFee: 50,
  pricePerKmCar: 40,
  pricePerKmVan: 60,
  flatRates: [
    { id: 1, name: "V rámci Hustopečí", price: 80 },
    { id: 2, name: "V rámci Mikulova", price: 100 },
    { id: 3, name: "Zaječí - diskotéka Retro", price: 200 },
  ],
};


const App: React.FC = () => {
  const { t, language } = useTranslation();

  const [people, setPeople] = useState<Person[]>(() => {
    try {
      const savedPeople = localStorage.getItem('rapid-dispatch-people');
      return savedPeople ? JSON.parse(savedPeople) : initialPeople;
    } catch {
      return initialPeople;
    }
  });

  const [vehicles, setVehicles] = useState<Vehicle[]>(() => {
    try {
      const savedVehicles = localStorage.getItem('rapid-dispatch-vehicles');
      return savedVehicles ? JSON.parse(savedVehicles) : initialVehicles;
    } catch {
      return initialVehicles;
    }
  });

  const [rideLog, setRideLog] = useState<RideLog[]>(() => {
    try {
      const savedLog = localStorage.getItem('rapid-dispatch-ride-log');
      return savedLog ? JSON.parse(savedLog) : [];
    } catch {
      return [];
    }
  });

  const [sortConfig, setSortConfig] = useState<{ key: SortKey, direction: SortDirection }>(() => {
    try {
      const savedConfig = localStorage.getItem('rapid-dispatch-sort-config');
      return savedConfig ? JSON.parse(savedConfig) : { key: 'timestamp', direction: 'desc' };
    } catch {
      return { key: 'timestamp', direction: 'desc' };
    }
  });

  const [tariff, setTariff] = useState<Tariff>(() => {
    try {
        const savedTariff = localStorage.getItem('rapid-dispatch-tariff');
        return savedTariff ? JSON.parse(savedTariff) : DEFAULT_TARIFF;
    } catch {
        return DEFAULT_TARIFF;
    }
  });

  const [assignmentResult, setAssignmentResult] = useState<AssignmentResultData | null>(null);
  const [error, setError] = useState<ErrorResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [isAddingVehicle, setIsAddingVehicle] = useState(false);
  const [editingRideLog, setEditingRideLog] = useState<RideLog | null>(null);
  const [manualAssignmentDetails, setManualAssignmentDetails] = useState<{rideRequest: RideRequest, vehicle: Vehicle, rideDuration: number, sms: string, estimatedPrice: number} | null>(null);
  const [smsToPreview, setSmsToPreview] = useState<{ sms: string; driverPhone?: string } | null>(null);

  const [isAiEnabled, setIsAiEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('rapid-dispatch-ai-enabled');
    return saved ? JSON.parse(saved) : true;
  });

  const [cooldown, setCooldown] = useState(0);
  
  const [layout, setLayout] = useState<LayoutConfig>(() => {
    try {
        const savedLayout = localStorage.getItem('rapid-dispatch-layout');
        return savedLayout ? JSON.parse(savedLayout) : DEFAULT_LAYOUT;
    } catch {
        return DEFAULT_LAYOUT;
    }
  });
  const [isEditMode, setIsEditMode] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  
  const [routeToPreview, setRouteToPreview] = useState<{ origin: string, destination: string } | null>(null);
  const [showCompletedRides, setShowCompletedRides] = useState(true);
  const [isPeopleModalOpen, setIsPeopleModalOpen] = useState(false);
  const [isTariffModalOpen, setIsTariffModalOpen] = useState(false);
  const [isAnalyticsModalOpen, setIsAnalyticsModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);


  // --- Data Persistence Effects ---
  useEffect(() => {
    localStorage.setItem('rapid-dispatch-people', JSON.stringify(people));
  }, [people]);

  useEffect(() => {
    localStorage.setItem('rapid-dispatch-vehicles', JSON.stringify(vehicles));
  }, [vehicles]);

  useEffect(() => {
    localStorage.setItem('rapid-dispatch-ride-log', JSON.stringify(rideLog));
  }, [rideLog]);

  useEffect(() => {
    localStorage.setItem('rapid-dispatch-sort-config', JSON.stringify(sortConfig));
  }, [sortConfig]);
  
  useEffect(() => {
    localStorage.setItem('rapid-dispatch-ai-enabled', JSON.stringify(isAiEnabled));
  }, [isAiEnabled]);
  
  useEffect(() => {
    localStorage.setItem('rapid-dispatch-layout', JSON.stringify(layout));
  }, [layout]);

  useEffect(() => {
    localStorage.setItem('rapid-dispatch-tariff', JSON.stringify(tariff));
  }, [tariff]);


  // Cooldown timer effect
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);
  
  // Auto-update vehicle status
  useEffect(() => {
      const interval = setInterval(() => {
          const now = Date.now();
          let needsUpdate = false;
          const updatedVehicles = vehicles.map(v => {
              if ((v.status === VehicleStatus.Busy || v.status === VehicleStatus.OutOfService) && v.freeAt && v.freeAt < now) {
                  needsUpdate = true;
                  return { ...v, status: VehicleStatus.Available, freeAt: undefined };
              }
              return v;
          });

          if (needsUpdate) {
              setVehicles(updatedVehicles);
          }
      }, 5000);
      return () => clearInterval(interval);
  }, [vehicles]);

  // Notification System Effect
  useEffect(() => {
    const checkNotifications = () => {
        const now = Date.now();
        const newNotifications: Notification[] = [];

        rideLog.forEach(log => {
            // Reminder for scheduled rides
            if (log.status === RideStatus.Scheduled) {
                 try {
                    const pickupTimestamp = new Date(log.pickupTime).getTime();
                    const minutesToPickup = (pickupTimestamp - now) / (1000 * 60);

                    const reminder15Id = `reminder-15-${log.id}`;
                    if (minutesToPickup <= 15 && minutesToPickup > 14 && !notifications.some(n => n.id === reminder15Id)) {
                        newNotifications.push({ id: reminder15Id, type: 'reminder', titleKey: 'notifications.scheduledRide.title', messageKey: 'notifications.scheduledRide.message15', messageParams: { customerName: log.customerName, pickupAddress: log.pickupAddress }, timestamp: now, rideLogId: log.id });
                    }
                    const reminder5Id = `reminder-5-${log.id}`;
                    if (minutesToPickup <= 5 && minutesToPickup > 4 && !notifications.some(n => n.id === reminder5Id)) {
                         newNotifications.push({ id: reminder5Id, type: 'reminder', titleKey: 'notifications.scheduledRide.title', messageKey: 'notifications.scheduledRide.message5', messageParams: { customerName: log.customerName, pickupAddress: log.pickupAddress }, timestamp: now, rideLogId: log.id });
                    }
                } catch(e) {
                  console.error("Could not parse schedule time for notification", e)
                }
            }
            
            // Reminder for unsent SMS
            if (log.status === RideStatus.OnTheWay && !log.smsSent) {
                const minutesSinceDispatch = (now - log.timestamp) / (1000 * 60);
                const notificationId = `sms-reminder-${log.id}`;

                // Check if 5 minutes have passed and notification doesn't exist yet
                if (minutesSinceDispatch >= 5 && !notifications.some(n => n.id === notificationId)) {
                    newNotifications.push({
                        id: notificationId,
                        type: 'delay', // Using 'delay' for a more urgent (red) look
                        titleKey: 'notifications.smsReminder.title',
                        messageKey: 'notifications.smsReminder.message',
                        messageParams: { customerName: log.customerName, driverName: log.driverName || 'N/A' },
                        timestamp: now,
                        rideLogId: log.id
                    });
                }
            }
        });
        
        if (newNotifications.length > 0) {
            setNotifications(prev => [...prev, ...newNotifications.filter(nn => !prev.some(p => p.id === nn.id))]);
        }
    };
    
    const interval = setInterval(checkNotifications, 10000);
    return () => clearInterval(interval);
  }, [rideLog, notifications]);

  // --- Handlers ---
  const handleScheduleRide = useCallback((rideRequest: RideRequest) => {
    const newLog: RideLog = {
        id: `ride-${Date.now()}`,
        timestamp: Date.now(),
        vehicleName: null,
        vehicleLicensePlate: null,
        driverName: null,
        vehicleType: null,
        customerName: rideRequest.customerName,
        customerPhone: rideRequest.customerPhone,
        pickupAddress: rideRequest.pickupAddress,
        destinationAddress: rideRequest.destinationAddress,
        passengers: rideRequest.passengers,
        pickupTime: rideRequest.pickupTime,
        status: RideStatus.Scheduled,
        vehicleId: null,
        smsSent: false,
        notes: rideRequest.notes,
        estimatedPrice: undefined,
        estimatedPickupTimestamp: new Date(rideRequest.pickupTime).getTime(),
        estimatedCompletionTimestamp: undefined,
    };

    setRideLog(prev => [newLog, ...prev]);
    alert(t('notifications.rideScheduled'));
  }, [t]);

  const handleSubmitDispatch = useCallback(async (rideRequest: RideRequest) => {
    setIsLoading(true);
    setError(null);
    setAssignmentResult(null);
    
    try {
        const result = await findBestVehicle(rideRequest, vehicles, isAiEnabled, tariff, language);
        if ('messageKey' in result) {
          setError(result);
        } else {
          setAssignmentResult(result);
        }
      } catch (e: any) {
        setError({ messageKey: "error.unknown", message: e.message || "An unknown error occurred." });
      } finally {
        setIsLoading(false);
        if (isAiEnabled) setCooldown(5);
      }
  }, [vehicles, isAiEnabled, tariff, language]);
  
  const getDriverName = (driverId: number | null) => {
    return people.find(p => p.id === driverId)?.name || t('general.unassigned');
  };

  const handleConfirmAssignment = useCallback((option: AssignmentAlternative) => {
    const { rideRequest, rideDuration } = assignmentResult!;
    const chosenVehicle = option.vehicle;
    
    if (!isAiEnabled) {
        setManualAssignmentDetails({ 
            rideRequest: assignmentResult!.rideRequest, 
            vehicle: chosenVehicle,
            rideDuration: rideDuration || 30,
            sms: generateSms(assignmentResult!.rideRequest, t),
            estimatedPrice: option.estimatedPrice
        });
        return;
    }
    
    const alternative = assignmentResult!.alternatives.find(a => a.vehicle.id === chosenVehicle.id) || assignmentResult;
    const durationInMinutes = rideDuration ? alternative.eta + rideDuration : alternative.eta + 30;
    const freeAt = Date.now() + durationInMinutes * 60 * 1000;
    
    setVehicles(prev => prev.map(v => v.id === chosenVehicle.id ? { ...v, status: VehicleStatus.Busy, freeAt, location: rideRequest.destinationAddress } : v));

    const newLog: RideLog = {
      id: `ride-${Date.now()}`,
      timestamp: Date.now(),
      vehicleName: chosenVehicle.name,
      vehicleLicensePlate: chosenVehicle.licensePlate,
      driverName: getDriverName(chosenVehicle.driverId),
      vehicleType: chosenVehicle.type,
      customerName: rideRequest.customerName,
      customerPhone: rideRequest.customerPhone,
      pickupAddress: rideRequest.pickupAddress,
      destinationAddress: rideRequest.destinationAddress,
      passengers: rideRequest.passengers,
      pickupTime: rideRequest.pickupTime,
      status: RideStatus.OnTheWay,
      vehicleId: chosenVehicle.id,
      smsSent: false,
      notes: rideRequest.notes,
      estimatedPrice: alternative.estimatedPrice,
      estimatedPickupTimestamp: Date.now() + alternative.eta * 60 * 1000,
      estimatedCompletionTimestamp: Date.now() + durationInMinutes * 60 * 1000,
    };

    setRideLog(prev => [newLog, ...prev]);
    setAssignmentResult(null);
  }, [assignmentResult, isAiEnabled, people, t]);
  
  const handleManualAssignmentConfirm = (durationInMinutes: number) => {
      if (!manualAssignmentDetails) return;
      
      const { rideRequest, vehicle, estimatedPrice } = manualAssignmentDetails;
      const alternative = assignmentResult?.alternatives.find(a => a.vehicle.id === vehicle.id);
      const eta = alternative?.eta ?? 0;
      const totalBusyTime = eta + durationInMinutes;
      const freeAt = Date.now() + totalBusyTime * 60 * 1000;

      setVehicles(prev => prev.map(v => v.id === vehicle.id ? { ...v, status: VehicleStatus.Busy, freeAt, location: rideRequest.destinationAddress } : v));

      const newLog: RideLog = {
        id: `ride-${Date.now()}`,
        timestamp: Date.now(),
        vehicleName: vehicle.name,
        vehicleLicensePlate: vehicle.licensePlate,
        driverName: getDriverName(vehicle.driverId),
        vehicleType: vehicle.type,
        customerName: rideRequest.customerName,
        customerPhone: rideRequest.customerPhone,
        pickupAddress: rideRequest.pickupAddress,
        destinationAddress: rideRequest.destinationAddress,
        passengers: rideRequest.passengers,
        pickupTime: rideRequest.pickupTime,
        status: RideStatus.OnTheWay,
        vehicleId: vehicle.id,
        smsSent: false,
        notes: rideRequest.notes,
        estimatedPrice: estimatedPrice,
        estimatedPickupTimestamp: Date.now() + (eta * 60 * 1000),
        estimatedCompletionTimestamp: Date.now() + totalBusyTime * 60 * 1000,
      };
      
      setRideLog(prev => [newLog, ...prev]);
      setAssignmentResult(null);
      setManualAssignmentDetails(null);
  };

  const handleClearResult = useCallback(() => {
    setAssignmentResult(null);
    setError(null);
  }, []);
  
  const handleRoutePreview = useCallback((origin: string, destination: string) => {
    if (origin.trim() && destination.trim()) {
      setRouteToPreview({ origin, destination });
    } else {
      setRouteToPreview(null);
    }
  }, []);

  const handleUpdateVehicle = (updatedVehicle: Vehicle) => {
    setVehicles(prev => prev.map(v => v.id === updatedVehicle.id ? updatedVehicle : v));
    setEditingVehicle(null);
  };
  
  const handleDeleteVehicle = (vehicleId: number) => {
      setVehicles(prev => prev.filter(v => v.id !== vehicleId));
      setEditingVehicle(null);
  };

  const handleAddVehicle = (newVehicleData: Omit<Vehicle, 'id' | 'freeAt' | 'driverId'>) => {
      const newVehicle: Vehicle = {
          ...newVehicleData,
          id: Date.now(),
          driverId: null,
      };
      setVehicles(prev => [...prev, newVehicle]);
      setIsAddingVehicle(false);
  };
  
  const handleAddPerson = (person: Omit<Person, 'id'>) => {
    const newPerson: Person = { ...person, id: Date.now() };
    setPeople(prev => [...prev, newPerson]);
  };
  
  const handleUpdatePerson = (updatedPerson: Person) => {
    setPeople(prev => prev.map(p => p.id === updatedPerson.id ? updatedPerson : p));
  };
  
  const handleDeletePerson = (personId: number) => {
    if (window.confirm(t('people.confirmDelete'))) {
      setPeople(prev => prev.filter(p => p.id !== personId));
      // Unassign this person from any vehicle they are driving
      setVehicles(prev => prev.map(v => v.driverId === personId ? { ...v, driverId: null } : v));
    }
  };

  const handleUpdateRideLog = (updatedLog: RideLog) => {
    const originalLog = rideLog.find(log => log.id === updatedLog.id);
    setRideLog(prev => prev.map(log => log.id === updatedLog.id ? updatedLog : log));

    if (originalLog && originalLog.status !== updatedLog.status && updatedLog.vehicleId) {
        if (updatedLog.status === RideStatus.Completed || updatedLog.status === RideStatus.Cancelled) {
            setVehicles(prev => prev.map(v => (v.id === updatedLog.vehicleId && v.status === VehicleStatus.Busy) ? { ...v, status: VehicleStatus.Available, freeAt: undefined } : v));
        } else if (updatedLog.status === RideStatus.OnTheWay) {
            setVehicles(prev => prev.map(v => v.id === updatedLog.vehicleId ? { ...v, status: VehicleStatus.Busy, freeAt: updatedLog.estimatedCompletionTimestamp } : v));
        }
    }
    
    // Show SMS preview if a scheduled ride is dispatched
    if (originalLog && originalLog.status === RideStatus.Scheduled && updatedLog.status === RideStatus.OnTheWay && updatedLog.vehicleId) {
        const smsText = generateSms(updatedLog, t);
        const assignedVehicle = vehicles.find(v => v.id === updatedLog.vehicleId);
        const driver = people.find(p => p.id === assignedVehicle?.driverId);
        setSmsToPreview({ sms: smsText, driverPhone: driver?.phone });
    }

    setEditingRideLog(null);
  };

  const handleDeleteRideLog = (logId: string) => {
    if (window.confirm(t('rideLog.confirmDelete'))) {
        setRideLog(prev => prev.filter(log => log.id !== logId));
    }
  };
  
  const handleRideStatusChange = (logId: string, newStatus: RideStatus) => {
    const logToUpdate = rideLog.find(log => log.id === logId);
    if (logToUpdate) {
      handleUpdateRideLog({ ...logToUpdate, status: newStatus });
    }
  };

  const handleToggleSmsSent = (logId: string) => {
    setRideLog(prev => prev.map(log => log.id === logId ? { ...log, smsSent: !log.smsSent } : log));
  };
  
  const handleSort = (key: SortKey) => {
    setSortConfig(prev => ({ key, direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc' }));
  };
  
  const handleLayoutChange = (updatedItem: LayoutItem) => {
    setLayout(prev => prev.map(item => item.id === updatedItem.id ? updatedItem : item));
  };
  
  const resetLayout = () => {
    if(window.confirm(t('settings.layout.confirmReset'))) setLayout(DEFAULT_LAYOUT);
  };

  const handleSaveData = () => {
    const dataToSave = { vehicles, rideLog, people, tariff };
    const jsonString = JSON.stringify(dataToSave, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rapid-dispatch-data-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const escapeCsvCell = (cell: any): string => {
    if (cell === null || cell === undefined) {
        return '';
    }
    const cellString = String(cell);
    if (/[",\n\r]/.test(cellString)) {
        return `"${cellString.replace(/"/g, '""')}"`;
    }
    return cellString;
  };

  const handleExportCsv = () => {
    if (rideLog.length === 0) {
        alert(t('notifications.noRidesToExport'));
        return;
    }

    const headers = [
        'ID', t('csv.timestamp'), t('csv.vehicle'), t('csv.licensePlate'), t('csv.vehicleType'), t('csv.driverName'),
        t('csv.customerName'), t('csv.customerPhone'), t('csv.pickupAddress'), t('csv.destinationAddress'),
        t('csv.pickupTime'), t('csv.status'), t('csv.smsSent'), t('csv.estimatedPrice'), t('csv.notes')
    ];

    const rows = rideLog.map(log => [
        log.id,
        new Date(log.timestamp).toLocaleString(language),
        log.vehicleName,
        log.vehicleLicensePlate,
        log.vehicleType ? t(`vehicleType.${log.vehicleType}`) : '',
        log.driverName,
        log.customerName,
        log.customerPhone,
        log.pickupAddress,
        log.destinationAddress,
        log.pickupTime,
        t(`rideStatus.${log.status}`),
        log.smsSent ? t('general.yes') : t('general.no'),
        log.estimatedPrice ?? '',
        log.notes ?? ''
    ].map(escapeCsvCell));

    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rapid-dispatch-historie-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleLoadData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const parsedData = JSON.parse(e.target?.result as string);
            if (Array.isArray(parsedData.vehicles) && Array.isArray(parsedData.rideLog) && Array.isArray(parsedData.people)) {
                setVehicles(parsedData.vehicles);
                setRideLog(parsedData.rideLog);
                setPeople(parsedData.people);
                if (parsedData.tariff) {
                    setTariff(parsedData.tariff);
                }
                alert(t('notifications.dataLoadedSuccess'));
            } else {
                throw new Error("Invalid data structure in JSON file.");
            }
        } catch (error) {
            alert(t('notifications.dataLoadedError'));
        } finally {
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };
    reader.readAsText(file);
  };
  
  const triggerLoadFile = () => {
    if (window.confirm(t('settings.data.confirmLoad'))) {
        fileInputRef.current?.click();
    }
  };
  
  const handleDismissNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const sortedRideLog = useMemo(() => {
    const filtered = showCompletedRides ? [...rideLog] : rideLog.filter(log => log.status !== RideStatus.Completed && log.status !== RideStatus.Cancelled);
    const sorted = filtered.sort((a, b) => {
        if (sortConfig.key === 'timestamp') return a.timestamp - b.timestamp;
        return a.customerName.localeCompare(b.customerName, language);
    });
    return sortConfig.direction === 'asc' ? sorted : sorted.reverse();
  }, [rideLog, sortConfig, showCompletedRides, language]);

  const widgetMap: Record<WidgetId, React.ReactNode> = {
    dispatch: <DispatchFormComponent onSubmit={handleSubmitDispatch} onSchedule={handleScheduleRide} isLoading={isLoading} rideHistory={rideLog} cooldownTime={cooldown} onRoutePreview={handleRoutePreview} />,
    vehicles: <VehicleStatusTable vehicles={vehicles} people={people} onEdit={setEditingVehicle} onAddVehicleClick={() => setIsAddingVehicle(true)} />,
    map: <OpenStreetMap vehicles={vehicles} people={people} routeToPreview={routeToPreview} confirmedAssignment={assignmentResult} />,
    rideLog: <RideLogTable logs={sortedRideLog} onSort={handleSort} sortConfig={sortConfig} onToggleSmsSent={handleToggleSmsSent} onEdit={setEditingRideLog} onStatusChange={handleRideStatusChange} onDelete={handleDeleteRideLog} showCompleted={showCompletedRides} onToggleShowCompleted={() => setShowCompletedRides(prev => !prev)} />,
  };
  
  return (
    <div className="flex flex-col p-4 sm:p-6 lg:p-8">
      <NotificationCenter notifications={notifications} onDismiss={handleDismissNotification} />
      <header className="flex flex-wrap justify-between items-center mb-6 gap-4 flex-shrink-0">
        <div className="flex items-center space-x-3">
          <ShamanIcon className="text-amber-400" />
          <h1 className="text-3xl font-bold text-white">Ride<span className="text-amber-400">Shaman</span></h1>
        </div>
        <div className="flex items-center flex-wrap gap-4">
            <div className="flex items-center space-x-2">
                <button onClick={() => setIsTariffModalOpen(true)} className="flex items-center justify-center p-2 text-sm font-medium rounded-md shadow-sm bg-slate-700 hover:bg-slate-600 transition-colors" aria-label={t('header.manageTariff')}><PriceTagIcon /></button>
                <button onClick={() => setIsPeopleModalOpen(true)} className="flex items-center justify-center p-2 text-sm font-medium rounded-md shadow-sm bg-slate-700 hover:bg-slate-600 transition-colors" aria-label={t('header.managePeople')}><PhoneIcon /></button>
                <button onClick={() => setIsAnalyticsModalOpen(true)} className="flex items-center justify-center p-2 text-sm font-medium rounded-md shadow-sm bg-slate-700 hover:bg-slate-600 transition-colors" aria-label={t('header.showAnalytics')}><BarChartIcon /></button>
            </div>
            <div className="flex items-center space-x-2">
                 <button onClick={() => setIsSettingsModalOpen(true)} className="flex items-center justify-center p-2 text-sm font-medium rounded-md shadow-sm bg-slate-700 hover:bg-slate-600 transition-colors" aria-label={t('header.settings')}><SettingsIcon /></button>
            </div>
        </div>
      </header>

      <main className="relative flex-grow">
        <div className={`grid grid-cols-6 gap-6 transition-all duration-300 ${isEditMode ? 'opacity-50' : ''}`}>
           {layout.map(item => (<DashboardWidget key={item.id} layoutItem={item} isEditMode={isEditMode} onLayoutChange={handleLayoutChange}>{widgetMap[item.id]}</DashboardWidget>))}
        </div>
      </main>
      
      {(isLoading || assignmentResult || error) && (
           <div className="fixed inset-0 bg-black/70 z-50 flex justify-center items-start pt-24 p-4 animate-fade-in overflow-y-auto">
              {isLoading && !assignmentResult && <LoadingSpinner />}
              {assignmentResult && (<AssignmentResult result={assignmentResult} error={error} onClear={handleClearResult} onConfirm={handleConfirmAssignment} isAiMode={isAiEnabled} people={people} className="max-w-4xl w-full"/>)}
              {error && !assignmentResult && (<AssignmentResult result={null} error={error} onClear={handleClearResult} onConfirm={() => {}} isAiMode={isAiEnabled} people={people} className="max-w-xl w-full"/>)}
           </div>
      )}

      {/* Modals */}
      {editingVehicle && (<EditVehicleModal vehicle={editingVehicle} people={people} onSave={handleUpdateVehicle} onClose={() => setEditingVehicle(null)} onDelete={handleDeleteVehicle}/>)}
      {isAddingVehicle && (<AddVehicleModal onSave={handleAddVehicle} onClose={() => setIsAddingVehicle(false)}/>)}
      {editingRideLog && (<EditRideLogModal log={editingRideLog} vehicles={vehicles} people={people} onSave={handleUpdateRideLog} onClose={() => setEditingRideLog(null)}/>)}
      {manualAssignmentDetails && (<ManualAssignmentModal details={manualAssignmentDetails} people={people} onConfirm={handleManualAssignmentConfirm} onClose={() => setManualAssignmentDetails(null)}/>)}
      {isPeopleModalOpen && (<ManagePeopleModal people={people} onAdd={handleAddPerson} onUpdate={handleUpdatePerson} onDelete={handleDeletePerson} onClose={() => setIsPeopleModalOpen(false)}/>)}
      {isTariffModalOpen && (<TariffSettingsModal initialTariff={tariff} onSave={setTariff} onClose={() => setIsTariffModalOpen(false)} />)}
      {isAnalyticsModalOpen && <AnalyticsModal rideLog={rideLog} vehicles={vehicles} onClose={() => setIsAnalyticsModalOpen(false)} />}
      {smsToPreview && <SmsPreviewModal sms={smsToPreview.sms} driverPhone={smsToPreview.driverPhone} onClose={() => setSmsToPreview(null)} />}
      {isSettingsModalOpen && (
        <SettingsModal 
          isOpen={isSettingsModalOpen}
          onClose={() => setIsSettingsModalOpen(false)}
          isAiEnabled={isAiEnabled}
          onToggleAi={() => setIsAiEnabled(!isAiEnabled)}
          isEditMode={isEditMode}
          onToggleEditMode={() => setIsEditMode(!isEditMode)}
          onResetLayout={resetLayout}
          onSaveData={handleSaveData}
          onLoadData={triggerLoadFile}
          onExportCsv={handleExportCsv}
        />
      )}
      
      <input type="file" ref={fileInputRef} onChange={handleLoadData} accept=".json" className="hidden" aria-hidden="true"/>
    </div>
  );
};

export default App;
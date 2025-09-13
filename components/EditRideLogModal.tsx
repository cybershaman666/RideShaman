import React, { useState, useEffect } from 'react';
import type { RideLog, Vehicle, Person } from '../types';
import { RideStatus, VehicleStatus, PersonRole } from '../types';
import { CloseIcon } from './icons';

interface EditRideLogModalProps {
  log: RideLog;
  vehicles: Vehicle[];
  people: Person[];
  onSave: (log: RideLog) => void;
  onClose: () => void;
}

export const EditRideLogModal: React.FC<EditRideLogModalProps> = ({ log, vehicles, people, onSave, onClose }) => {
  const [formData, setFormData] = useState<RideLog>(log);

  const availableVehicles = vehicles.filter(v => v.status === VehicleStatus.Available);
  const drivers = people.filter(p => p.role === PersonRole.Driver);

  useEffect(() => {
    setFormData(log);
  }, [log]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;

    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? (value ? parseInt(value, 10) : undefined) : value,
    }));
  };
  
  const handleVehicleSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedVehicleId = e.target.value ? parseInt(e.target.value, 10) : null;
    
    if (!selectedVehicleId) {
        // Clear all assignment fields if vehicle is deselected
        setFormData(prev => ({
            ...prev,
            vehicleId: null,
            vehicleName: null,
            vehicleLicensePlate: null,
            vehicleType: null,
            driverName: null,
        }));
        return;
    }

    const selectedVehicle = vehicles.find(v => v.id === selectedVehicleId);
    if (selectedVehicle) {
        const driver = people.find(p => p.id === selectedVehicle.driverId);
        setFormData(prev => ({
            ...prev,
            vehicleId: selectedVehicle.id,
            vehicleName: selectedVehicle.name,
            vehicleLicensePlate: selectedVehicle.licensePlate,
            vehicleType: selectedVehicle.type,
            driverName: driver ? driver.name : null, // Auto-fill driver from vehicle
        }));
    }
  };


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let dataToSave = { ...formData };
    
    // If a vehicle is newly assigned and status is set to OnTheWay, estimate a completion time
    // This is crucial for the vehicle to become available again automatically
    if (dataToSave.vehicleId && dataToSave.status === RideStatus.OnTheWay && log.status !== RideStatus.OnTheWay) {
        try {
            const pickupTimestamp = new Date(dataToSave.pickupTime).getTime();
            // If pickup is in the future, base completion on that. Otherwise, base it on now.
            const baseTimestamp = pickupTimestamp > Date.now() ? pickupTimestamp : Date.now();
            // Assume 30 min ride duration as a default
            dataToSave.estimatedCompletionTimestamp = baseTimestamp + 30 * 60 * 1000;
        } catch (err) {
             // Fallback if date is invalid (e.g., 'ihned'), use now + 30 mins
             dataToSave.estimatedCompletionTimestamp = Date.now() + 30 * 60 * 1000;
        }
    }
    
    onSave(dataToSave);
  };

  return (
    <div
      className="fixed inset-0 bg-black/70 z-50 flex justify-center items-center p-4 animate-fade-in"
      aria-labelledby="edit-log-title"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-slate-800 rounded-lg shadow-2xl w-full max-w-lg relative">
        <div className="flex justify-between items-center p-6 border-b border-slate-700">
          <h2 id="edit-log-title" className="text-xl font-semibold">
            Upravit záznam jízdy
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
            aria-label="Zavřít modální okno"
          >
            <CloseIcon />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="customerName" className="block text-sm font-medium text-gray-300 mb-1">Jméno zákazníka</label>
                <input type="text" id="customerName" name="customerName" value={formData.customerName} onChange={handleChange} className="w-full bg-slate-700 border border-slate-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"/>
              </div>
              <div>
                <label htmlFor="customerPhone" className="block text-sm font-medium text-gray-300 mb-1">Telefonní číslo</label>
                <input type="tel" id="customerPhone" name="customerPhone" value={formData.customerPhone} onChange={handleChange} className="w-full bg-slate-700 border border-slate-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"/>
              </div>
            </div>
            <div>
              <label htmlFor="pickupAddress" className="block text-sm font-medium text-gray-300 mb-1">Adresa nástupu</label>
              <input type="text" id="pickupAddress" name="pickupAddress" value={formData.pickupAddress} onChange={handleChange} className="w-full bg-slate-700 border border-slate-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"/>
            </div>
            <div>
              <label htmlFor="destinationAddress" className="block text-sm font-medium text-gray-300 mb-1">Adresa cíle</label>
              <input type="text" id="destinationAddress" name="destinationAddress" value={formData.destinationAddress} onChange={handleChange} className="w-full bg-slate-700 border border-slate-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"/>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="pickupTime" className="block text-sm font-medium text-gray-300 mb-1">Čas vyzvednutí</label>
                <input type="text" id="pickupTime" name="pickupTime" value={formData.pickupTime} onChange={handleChange} className="w-full bg-slate-700 border border-slate-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"/>
              </div>
              <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-300 mb-1">Status</label>
                <select id="status" name="status" value={formData.status} onChange={handleChange} className="w-full bg-slate-700 border border-slate-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500">
                  {Object.values(RideStatus).map(status => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="border-t border-slate-700 pt-4">
                <h3 className="text-md font-semibold text-gray-200 mb-2">Přiřazení</h3>
                <p className="text-xs text-gray-400 mb-3">Vyberte vozidlo pro přiřazení. Řidič se vyplní automaticky, ale můžete ho změnit.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="vehicleId" className="block text-sm font-medium text-gray-300 mb-1">Dostupná vozidla</label>
                        <select
                            id="vehicleId"
                            name="vehicleId"
                            value={formData.vehicleId || ''}
                            onChange={handleVehicleSelect}
                            className="w-full bg-slate-700 border border-slate-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                        >
                            <option value="">-- Nepřiřazeno --</option>
                            {availableVehicles.map(v => (
                                <option key={v.id} value={v.id}>{v.name} ({v.licensePlate})</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="driverName" className="block text-sm font-medium text-gray-300 mb-1">Řidič</label>
                        <select
                            id="driverName"
                            name="driverName"
                            value={formData.driverName || ''}
                            onChange={handleChange}
                            className="w-full bg-slate-700 border border-slate-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                        >
                            <option value="">-- Vyberte řidiče --</option>
                            {drivers.map(d => (
                                <option key={d.id} value={d.name}>{d.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="sm:col-span-2">
                        <label htmlFor="estimatedPrice" className="block text-sm font-medium text-gray-300 mb-1">Odhadovaná cena (Kč)</label>
                        <input type="number" id="estimatedPrice" name="estimatedPrice" value={formData.estimatedPrice || ''} onChange={handleChange} className="w-full bg-slate-700 border border-slate-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"/>
                    </div>
                </div>
            </div>

            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-300 mb-1">Poznámka</label>
              <textarea id="notes" name="notes" value={formData.notes || ''} onChange={handleChange} rows={3} className="w-full bg-slate-700 border border-slate-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"/>
            </div>
          </div>
          <div className="flex justify-end items-center p-6 bg-slate-900/50 border-t border-slate-700 rounded-b-lg space-x-3">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium rounded-md bg-slate-600 text-gray-200 hover:bg-slate-500 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-slate-800">
              Zrušit
            </button>
            <button type="submit" className="px-4 py-2 text-sm font-medium rounded-md shadow-sm text-white bg-amber-600 hover:bg-amber-700 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-slate-800">
              Uložit změny
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
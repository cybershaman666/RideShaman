import React, { useState, useEffect } from 'react';
import type { Vehicle, Person } from '../types';
import { VehicleStatus, VehicleType, PersonRole } from '../types';
import { CloseIcon } from './icons';

interface EditVehicleModalProps {
  vehicle: Vehicle;
  people: Person[];
  onSave: (vehicle: Vehicle) => void;
  onClose: () => void;
  onDelete: (vehicleId: number) => void;
}

export const EditVehicleModal: React.FC<EditVehicleModalProps> = ({ vehicle, people, onSave, onClose, onDelete }) => {
  const [formData, setFormData] = useState<Vehicle>(vehicle);
  const [outOfServiceMinutes, setOutOfServiceMinutes] = useState<number>(60);
  
  const drivers = people.filter(p => p.role === PersonRole.Driver);

  useEffect(() => {
    setFormData(vehicle);
  }, [vehicle]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => {
      let finalValue: any = value;
      if (name === 'capacity' || name === 'driverId') {
        finalValue = value ? parseInt(value, 10) : null;
      }
      
      const newFormData = { ...prev, [name]: finalValue };

      if (name === 'status' && value !== VehicleStatus.Busy && value !== VehicleStatus.OutOfService) {
        newFormData.freeAt = undefined;
      }
      return newFormData;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let dataToSave = { ...formData };
    if (dataToSave.status === VehicleStatus.OutOfService) {
        dataToSave.freeAt = Date.now() + outOfServiceMinutes * 60 * 1000;
    }
    onSave(dataToSave);
  };

  const handleDelete = () => {
    if (window.confirm(`Opravdu chcete smazat vozidlo "${vehicle.name}"? Tato akce je nevratná.`)) {
      onDelete(vehicle.id);
    }
  };


  return (
    <div
      className="fixed inset-0 bg-black/70 z-50 flex justify-center items-center p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-slate-800 rounded-lg shadow-2xl w-full max-w-md relative">
        <div className="flex justify-between items-center p-6 border-b border-slate-700">
          <h2 className="text-xl font-semibold">
            Upravit vozidlo: <span className="text-amber-400">{vehicle.name}</span>
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors" aria-label="Zavřít"><CloseIcon /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            <div>
              <label htmlFor="driverId" className="block text-sm font-medium text-gray-300 mb-1">
                Přiřazený řidič
              </label>
              <select
                id="driverId"
                name="driverId"
                value={formData.driverId === null ? '' : formData.driverId}
                onChange={handleChange}
                className="w-full bg-slate-700 border border-slate-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              >
                  <option value="">-- Nikdo nepřiřazen --</option>
                  {drivers.map(driver => (
                      <option key={driver.id} value={driver.id}>{driver.name}</option>
                  ))}
              </select>
            </div>
            <div>
              <label htmlFor="licensePlate" className="block text-sm font-medium text-gray-300 mb-1">SPZ</label>
              <input type="text" id="licensePlate" name="licensePlate" value={formData.licensePlate} onChange={handleChange} className="w-full bg-slate-700 border border-slate-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500" />
            </div>
            <div>
              <label htmlFor="location" className="block text-sm font-medium text-gray-300 mb-1">Lokace</label>
              <input type="text" id="location" name="location" value={formData.location} onChange={handleChange} className="w-full bg-slate-700 border border-slate-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label htmlFor="type" className="block text-sm font-medium text-gray-300 mb-1">Typ</label>
                <select id="type" name="type" value={formData.type} onChange={handleChange} className="w-full bg-slate-700 border border-slate-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500">
                  {Object.values(VehicleType).map(type => (<option key={type} value={type}>{type}</option>))}
                </select>
              </div>
              <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-300 mb-1">Status</label>
                <select id="status" name="status" value={formData.status} onChange={handleChange} className="w-full bg-slate-700 border border-slate-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500">
                  {Object.values(VehicleStatus).map(status => (<option key={status} value={status}>{status}</option>))}
                </select>
              </div>
               <div>
                <label htmlFor="capacity" className="block text-sm font-medium text-gray-300 mb-1">Kapacita</label>
                <input type="number" id="capacity" name="capacity" value={formData.capacity} onChange={handleChange} min="1" className="w-full bg-slate-700 border border-slate-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500" />
              </div>
            </div>
            {formData.status === VehicleStatus.OutOfService && (
                <div className="pt-2">
                    <label htmlFor="outOfServiceMinutes" className="block text-sm font-medium text-gray-300 mb-1">Doba nedostupnosti (v minutách)</label>
                    <input type="number" id="outOfServiceMinutes" name="outOfServiceMinutes" value={outOfServiceMinutes} onChange={(e) => setOutOfServiceMinutes(parseInt(e.target.value, 10) || 0)} min="1" required className="w-full bg-slate-700 border border-slate-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500" />
                </div>
            )}
          </div>
          <div className="flex justify-between items-center p-6 bg-slate-900/50 border-t border-slate-700 rounded-b-lg">
            <button type="button" onClick={handleDelete} className="px-4 py-2 text-sm font-medium rounded-md bg-red-800 text-red-100 hover:bg-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-slate-800">Smazat vozidlo</button>
            <div className="space-x-3">
                <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium rounded-md bg-slate-600 text-gray-200 hover:bg-slate-500 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-slate-800">Zrušit</button>
                <button type="submit" className="px-4 py-2 text-sm font-medium rounded-md shadow-sm text-white bg-amber-600 hover:bg-amber-700 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-slate-800">Uložit změny</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
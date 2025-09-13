import React, { useState } from 'react';
import type { Vehicle } from '../types';
import { VehicleStatus, VehicleType } from '../types';
import { CloseIcon } from './icons';

interface AddVehicleModalProps {
  onSave: (vehicle: Omit<Vehicle, 'id' | 'freeAt' | 'driverId'>) => void;
  onClose: () => void;
}

const initialVehicleState: Omit<Vehicle, 'id' | 'freeAt' | 'driverId'> = {
  name: '',
  licensePlate: '',
  type: VehicleType.Car,
  status: VehicleStatus.Available,
  location: '',
  capacity: 4,
};

export const AddVehicleModal: React.FC<AddVehicleModalProps> = ({ onSave, onClose }) => {
  const [formData, setFormData] = useState(initialVehicleState);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'capacity' ? parseInt(value, 10) || 1 : value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.name.trim() && formData.location.trim() && formData.licensePlate.trim() && formData.capacity > 0) {
      onSave(formData);
    } else {
      alert("Vyplňte prosím všechna povinná pole.");
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/70 z-50 flex justify-center items-center p-4 animate-fade-in"
      aria-labelledby="add-vehicle-title"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-slate-800 rounded-lg shadow-2xl w-full max-w-md relative">
        <div className="flex justify-between items-center p-6 border-b border-slate-700">
          <h2 id="add-vehicle-title" className="text-xl font-semibold">
            Přidat nové vozidlo
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
          <div className="p-6 space-y-4">
             <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-1">
                Název vozidla
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                placeholder="např. Škoda Octavia #4"
                className="w-full bg-slate-700 border border-slate-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              />
            </div>
            <div>
              <label htmlFor="licensePlate" className="block text-sm font-medium text-gray-300 mb-1">
                SPZ
              </label>
              <input
                type="text"
                id="licensePlate"
                name="licensePlate"
                value={formData.licensePlate}
                onChange={handleChange}
                required
                placeholder="např. 1AB 2345"
                className="w-full bg-slate-700 border border-slate-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              />
            </div>
            <div>
              <label htmlFor="location" className="block text-sm font-medium text-gray-300 mb-1">
                Lokace
              </label>
              <input
                type="text"
                id="location"
                name="location"
                value={formData.location}
                onChange={handleChange}
                required
                placeholder="např. Anděl, Praha"
                className="w-full bg-slate-700 border border-slate-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="type" className="block text-sm font-medium text-gray-300 mb-1">
                  Typ
                </label>
                <select
                  id="type"
                  name="type"
                  value={formData.type}
                  onChange={handleChange}
                  className="w-full bg-slate-700 border border-slate-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                >
                  {Object.values(VehicleType).map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
               <div>
                <label htmlFor="capacity" className="block text-sm font-medium text-gray-300 mb-1">
                  Kapacita
                </label>
                <input
                  type="number"
                  id="capacity"
                  name="capacity"
                  value={formData.capacity}
                  onChange={handleChange}
                  min="1"
                  required
                  className="w-full bg-slate-700 border border-slate-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                />
              </div>
            </div>
          </div>
          <div className="flex justify-end items-center p-6 bg-slate-900/50 border-t border-slate-700 rounded-b-lg space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium rounded-md bg-slate-600 text-gray-200 hover:bg-slate-500 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-slate-800"
            >
              Zrušit
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium rounded-md shadow-sm text-white bg-amber-600 hover:bg-amber-700 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-slate-800"
            >
              Přidat vozidlo
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
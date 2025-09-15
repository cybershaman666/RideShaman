import React, { useState, useEffect } from 'react';
import type { RideLog, Vehicle, Person } from '../types';
import { RideStatus, VehicleStatus, PersonRole } from '../types';
import { CloseIcon, PlusIcon, TrashIcon } from './icons';
import { useTranslation } from '../contexts/LanguageContext';

interface EditRideLogModalProps {
  log: RideLog;
  vehicles: Vehicle[];
  people: Person[];
  onSave: (log: RideLog) => void;
  onClose: () => void;
}

export const EditRideLogModal: React.FC<EditRideLogModalProps> = ({ log, vehicles, people, onSave, onClose }) => {
  const { t } = useTranslation();
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
  
  const handleStopChange = (index: number, value: string) => {
    const newStops = [...formData.stops];
    newStops[index] = value;
    setFormData(prev => ({...prev, stops: newStops}));
  };
  
  const addStop = () => {
    setFormData(prev => ({...prev, stops: [...prev.stops, '']}));
  };

  const removeStop = (index: number) => {
    if(formData.stops.length > 2) {
      setFormData(prev => ({...prev, stops: prev.stops.filter((_, i) => i !== index)}));
    }
  };
  
  const handleVehicleSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedVehicleId = e.target.value ? parseInt(e.target.value, 10) : null;
    
    if (!selectedVehicleId) {
        setFormData(prev => ({ ...prev, vehicleId: null, vehicleName: null, vehicleLicensePlate: null, vehicleType: null, driverName: null }));
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
            driverName: driver ? driver.name : null,
        }));
    }
  };


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let dataToSave = { ...formData };
    
    if (dataToSave.vehicleId && dataToSave.status === RideStatus.OnTheWay && log.status !== RideStatus.OnTheWay) {
        try {
            const pickupTimestamp = new Date(dataToSave.pickupTime).getTime();
            const baseTimestamp = pickupTimestamp > Date.now() ? pickupTimestamp : Date.now();
            dataToSave.estimatedCompletionTimestamp = baseTimestamp + 30 * 60 * 1000;
        } catch (err) {
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
            {t('rideLog.edit.title')}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors" aria-label={t('general.closeModal')}><CloseIcon /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="customerName" className="block text-sm font-medium text-gray-300 mb-1">{t('dispatch.customerName')}</label>
                <input type="text" id="customerName" name="customerName" value={formData.customerName} onChange={handleChange} className="w-full bg-slate-700 border border-slate-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"/>
              </div>
              <div>
                <label htmlFor="customerPhone" className="block text-sm font-medium text-gray-300 mb-1">{t('dispatch.customerPhone')}</label>
                <input type="tel" id="customerPhone" name="customerPhone" value={formData.customerPhone} onChange={handleChange} className="w-full bg-slate-700 border border-slate-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"/>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">{t('dispatch.stops.title')}</label>
              <div className="space-y-2">
                {formData.stops.map((stop, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <input type="text" value={stop} onChange={(e) => handleStopChange(index, e.target.value)} className="flex-grow bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-white"/>
                    {formData.stops.length > 2 && <button type="button" onClick={() => removeStop(index)} className="p-1 text-red-500 hover:text-red-400 rounded-full"><TrashIcon size={18}/></button>}
                  </div>
                ))}
              </div>
              <button type="button" onClick={addStop} className="mt-2 flex items-center space-x-2 text-sm text-amber-400 hover:text-amber-300">
                <PlusIcon size={16}/><span>{t('dispatch.stops.addStop')}</span>
              </button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="pickupTime" className="block text-sm font-medium text-gray-300 mb-1">{t('dispatch.pickupTime')}</label>
                <input type="text" id="pickupTime" name="pickupTime" value={formData.pickupTime} onChange={handleChange} className="w-full bg-slate-700 border border-slate-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"/>
              </div>
              <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-300 mb-1">{t('rideLog.table.status')}</label>
                <select id="status" name="status" value={formData.status} onChange={handleChange} className="w-full bg-slate-700 border border-slate-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500">
                  {Object.values(RideStatus).map(status => (<option key={status} value={status}>{t(`rideStatus.${status}`)}</option>))}
                </select>
              </div>
            </div>
            
            <div className="border-t border-slate-700 pt-4">
                <h3 className="text-md font-semibold text-gray-200 mb-2">{t('rideLog.edit.assignmentTitle')}</h3>
                <p className="text-xs text-gray-400 mb-3">{t('rideLog.edit.assignmentHelp')}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="vehicleId" className="block text-sm font-medium text-gray-300 mb-1">{t('rideLog.edit.availableVehicles')}</label>
                        <select id="vehicleId" name="vehicleId" value={formData.vehicleId || ''} onChange={handleVehicleSelect} className="w-full bg-slate-700 border border-slate-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500">
                            <option value="">-- {t('general.unassigned')} --</option>
                            {availableVehicles.map(v => (<option key={v.id} value={v.id}>{v.name} ({v.licensePlate})</option>))}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="driverName" className="block text-sm font-medium text-gray-300 mb-1">{t('rideLog.table.driver')}</label>
                        <select id="driverName" name="driverName" value={formData.driverName || ''} onChange={handleChange} className="w-full bg-slate-700 border border-slate-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500">
                            <option value="">-- {t('rideLog.edit.selectDriver')} --</option>
                            {drivers.map(d => (<option key={d.id} value={d.name}>{d.name}</option>))}
                        </select>
                    </div>
                    <div className="sm:col-span-2">
                        <label htmlFor="estimatedPrice" className="block text-sm font-medium text-gray-300 mb-1">{t('rideLog.table.price')} (Kč)</label>
                        <input type="number" id="estimatedPrice" name="estimatedPrice" value={formData.estimatedPrice || ''} onChange={handleChange} className="w-full bg-slate-700 border border-slate-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"/>
                    </div>
                </div>
            </div>

            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-300 mb-1">{t('dispatch.notes')}</label>
              <textarea id="notes" name="notes" value={formData.notes || ''} onChange={handleChange} rows={3} className="w-full bg-slate-700 border border-slate-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"/>
            </div>
          </div>
          <div className="flex justify-end items-center p-6 bg-slate-900/50 border-t border-slate-700 rounded-b-lg space-x-3">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium rounded-md bg-slate-600 text-gray-200 hover:bg-slate-500 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-slate-800">
              {t('general.cancel')}
            </button>
            <button type="submit" className="px-4 py-2 text-sm font-medium rounded-md shadow-sm text-white bg-amber-600 hover:bg-amber-700 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-slate-800">
              {t('general.saveChanges')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
import React, { useState } from 'react';
import type { Tariff, FlatRateRule } from '../types';
import { CloseIcon, PlusIcon, UndoIcon } from './icons';
import { DEFAULT_TARIFF } from '../App';
import { useTranslation } from '../contexts/LanguageContext';

interface TariffSettingsModalProps {
  initialTariff: Tariff;
  onSave: (tariff: Tariff) => void;
  onClose: () => void;
}

const NumberInput: React.FC<{
  label: string;
  id: string;
  value: number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}> = ({ label, id, value, onChange }) => (
  <div>
    <label htmlFor={id} className="block text-sm font-medium text-gray-300 mb-1">{label}</label>
    <div className="relative">
      <input
        type="number"
        id={id}
        name={id}
        value={value}
        onChange={onChange}
        min="0"
        className="w-full bg-slate-700 border border-slate-600 rounded-md shadow-sm py-2 pl-3 pr-10 text-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
      />
      <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400">Kč</span>
    </div>
  </div>
);

export const TariffSettingsModal: React.FC<TariffSettingsModalProps> = ({ initialTariff, onSave, onClose }) => {
  const { t } = useTranslation();
  const [tariff, setTariff] = useState<Tariff>(initialTariff);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setTariff(prev => ({ ...prev, [name]: parseInt(value, 10) || 0 }));
  };
  
  const handleFlatRateChange = (id: number, field: 'name' | 'price', value: string | number) => {
    setTariff(prev => ({
        ...prev,
        flatRates: prev.flatRates.map(rate => 
            rate.id === id ? { ...rate, [field]: value } : rate
        )
    }));
  };
  
  const addFlatRate = () => {
    const newRate: FlatRateRule = { id: Date.now(), name: '', price: 0 };
    setTariff(prev => ({ ...prev, flatRates: [...prev.flatRates, newRate] }));
  };
  
  const deleteFlatRate = (id: number) => {
    setTariff(prev => ({...prev, flatRates: prev.flatRates.filter(rate => rate.id !== id)}));
  };

  const handleSave = () => {
    onSave(tariff);
    onClose();
  };
  
  const handleReset = () => {
    if (window.confirm(t('tariff.confirmReset'))) {
        setTariff(DEFAULT_TARIFF);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex justify-center items-center p-4 animate-fade-in" role="dialog" aria-modal="true">
      <div className="bg-slate-800 rounded-lg shadow-2xl w-full max-w-lg relative">
        <div className="flex justify-between items-center p-6 border-b border-slate-700">
          <h2 className="text-xl font-semibold">{t('tariff.title')}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors" aria-label={t('general.close')}><CloseIcon /></button>
        </div>
        
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
            <section>
                <h3 className="text-lg font-medium text-amber-400 mb-3">{t('tariff.rideRates')}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <NumberInput label={t('tariff.startingFee')} id="startingFee" value={tariff.startingFee} onChange={handleChange} />
                    <NumberInput label={t('tariff.pricePerKmCar')} id="pricePerKmCar" value={tariff.pricePerKmCar} onChange={handleChange} />
                    <NumberInput label={t('tariff.pricePerKmVan')} id="pricePerKmVan" value={tariff.pricePerKmVan} onChange={handleChange} />
                </div>
            </section>
            
            <section>
                <div className="flex justify-between items-center mb-3">
                    <h3 className="text-lg font-medium text-amber-400">{t('tariff.flatRates')}</h3>
                    <button onClick={addFlatRate} className="flex items-center space-x-2 px-3 py-1 text-sm font-medium rounded-md bg-green-600 hover:bg-green-700 transition-colors"><PlusIcon size={16}/><span>{t('general.add')}</span></button>
                </div>
                <div className="space-y-3">
                    {tariff.flatRates.map(rate => (
                        <div key={rate.id} className="grid grid-cols-10 gap-3 items-center">
                            <div className="col-span-6">
                                <label htmlFor={`rate-name-${rate.id}`} className="sr-only">{t('tariff.routeName')}</label>
                                <input 
                                    type="text" 
                                    id={`rate-name-${rate.id}`}
                                    value={rate.name} 
                                    onChange={(e) => handleFlatRateChange(rate.id, 'name', e.target.value)}
                                    placeholder={t('tariff.routeNamePlaceholder')}
                                    className="w-full bg-slate-700 border border-slate-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                                />
                            </div>
                            <div className="col-span-3">
                                 <label htmlFor={`rate-price-${rate.id}`} className="sr-only">{t('tariff.price')}</label>
                                 <div className="relative">
                                    <input 
                                        type="number" 
                                        id={`rate-price-${rate.id}`}
                                        value={rate.price} 
                                        onChange={(e) => handleFlatRateChange(rate.id, 'price', parseInt(e.target.value, 10) || 0)}
                                        className="w-full bg-slate-700 border border-slate-600 rounded-md shadow-sm py-2 pl-3 pr-10 text-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                                    />
                                    <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400">Kč</span>
                                </div>
                            </div>
                            <div className="col-span-1">
                                <button onClick={() => deleteFlatRate(rate.id)} className="p-2 text-red-500 hover:text-red-400 rounded-full hover:bg-red-500/10" aria-label={t('tariff.deleteFlatRate')}><CloseIcon size={18}/></button>
                            </div>
                        </div>
                    ))}
                    {tariff.flatRates.length === 0 && (
                        <p className="text-gray-400 text-sm text-center py-2">{t('tariff.noFlatRates')}</p>
                    )}
                </div>
            </section>
        </div>

        <div className="flex justify-between items-center p-6 bg-slate-900/50 border-t border-slate-700 rounded-b-lg">
            <button type="button" onClick={handleReset} className="flex items-center space-x-2 px-4 py-2 text-sm font-medium rounded-md bg-slate-600 text-gray-200 hover:bg-slate-500 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-slate-800"><UndoIcon size={16}/><span>{t('tariff.resetToDefault')}</span></button>
            <div className="space-x-3">
                <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium rounded-md bg-slate-600 text-gray-200 hover:bg-slate-500 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-slate-800">{t('general.cancel')}</button>
                <button type="button" onClick={handleSave} className="px-4 py-2 text-sm font-medium rounded-md shadow-sm text-white bg-amber-600 hover:bg-amber-700 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-slate-800">{t('tariff.saveTariff')}</button>
            </div>
        </div>
      </div>
    </div>
  );
};
import React, { useState, useEffect, useMemo, useRef } from 'react';
import type { RideRequest, RideLog } from '../types';
import { useTranslation } from '../contexts/LanguageContext';

interface DispatchFormProps {
  onSubmit: (rideRequest: RideRequest) => void;
  onSchedule: (rideRequest: RideRequest) => void;
  isLoading: boolean;
  rideHistory: RideLog[];
  cooldownTime: number;
  onRoutePreview: (origin: string, destination: string) => void;
}

// Simple InputField for non-autocomplete fields
const InputField: React.FC<{
    label: string, 
    id: string, 
    value: string | number, 
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void, 
    type?: string, 
    error?: string
}> = ({label, id, value, onChange, type='text', error}) => (
    <div>
      <label htmlFor={id} className="block text-xs font-medium text-gray-300 mb-1">{label}</label>
      <input
        type={type}
        id={id}
        name={id}
        value={value}
        onChange={onChange}
        className={`w-full bg-slate-700 border ${error ? 'border-red-500' : 'border-slate-600'} rounded-md shadow-sm py-1 px-3 text-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500`}
      />
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
);

// Autocomplete InputField component using historical suggestions
const AutocompleteInputField: React.FC<{
  label: string;
  id: string;
  value: string;
  onChange: (value: string) => void;
  suggestions: string[];
  error?: string;
  hint?: string;
}> = ({ label, id, value, onChange, suggestions, error, hint }) => {
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Close suggestions when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filterSuggestions = (userInput: string) => {
    const historyFiltered = suggestions.filter(
      suggestion => suggestion.toLowerCase().includes(userInput.toLowerCase())
    );
    setFilteredSuggestions(historyFiltered);
    setShowSuggestions(historyFiltered.length > 0);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const userInput = e.target.value;
    onChange(userInput);
    
    if (userInput) {
      filterSuggestions(userInput);
    } else {
      setFilteredSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const onSuggestionClick = (suggestion: string) => {
    onChange(suggestion);
    setShowSuggestions(false);
  };
  
  return (
    <div className="relative" ref={wrapperRef}>
      <label htmlFor={id} className="block text-xs font-medium text-gray-300 mb-1">{label}</label>
      <input
        type="text"
        id={id}
        name={id}
        value={value}
        onChange={handleChange}
        onFocus={() => value && filterSuggestions(value)} // Show suggestions on focus if there's text
        className={`w-full bg-slate-700 border ${error ? 'border-red-500' : 'border-slate-600'} rounded-md shadow-sm py-1 px-3 text-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500`}
        autoComplete="off"
      />
      {hint && !error && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
      {showSuggestions && filteredSuggestions.length > 0 && (
        <ul className="absolute z-10 w-full bg-slate-800 border border-slate-600 rounded-md mt-1 max-h-40 overflow-y-auto shadow-lg">
          {filteredSuggestions.map((suggestion, index) => (
            <li
              key={index}
              onClick={() => onSuggestionClick(suggestion)}
              className="px-3 py-2 text-sm text-gray-200 cursor-pointer hover:bg-slate-700"
            >
              {suggestion}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};


export const DispatchFormComponent: React.FC<DispatchFormProps> = ({ onSubmit, onSchedule, isLoading, rideHistory, cooldownTime, onRoutePreview }) => {
  const { t } = useTranslation();
  const [pickupAddress, setPickupAddress] = useState('Náměstí, Mikulov');
  const [destinationAddress, setDestinationAddress] = useState('Dukelské náměstí, Hustopeče');
  const [customerName, setCustomerName] = useState('Jan Novák');
  const [customerPhone, setCustomerPhone] = useState('777 123 456');
  const [passengers, setPassengers] = useState(1);
  const [pickupTime, setPickupTime] = useState('ihned');
  const [isScheduled, setIsScheduled] = useState(false);
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Partial<Record<keyof RideRequest, string>>>({});

  const uniqueAddresses = useMemo(() => {
    const addresses = new Set<string>();
    rideHistory.forEach(log => {
        if(log.pickupAddress) addresses.add(log.pickupAddress);
        if(log.destinationAddress) addresses.add(log.destinationAddress);
    });
    return Array.from(addresses);
  }, [rideHistory]);

  const uniqueCustomerNames = useMemo(() => {
      const names = new Set<string>(rideHistory.map(log => log.customerName).filter(Boolean));
      return Array.from(names);
  }, [rideHistory]);
  
  // Debounced effect for route preview
  useEffect(() => {
    const handler = setTimeout(() => {
        onRoutePreview(pickupAddress, destinationAddress);
    }, 800); // 800ms debounce

    return () => {
        clearTimeout(handler);
    };
  }, [pickupAddress, destinationAddress, onRoutePreview]);

  
  const formatDateForPicker = (date: Date): string => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };
  
  const handleScheduleToggle = (checked: boolean) => {
    setIsScheduled(checked);
    if (checked) {
      if (pickupTime === 'ihned') {
        const defaultScheduleTime = new Date(Date.now() + 60 * 60 * 1000);
        setPickupTime(formatDateForPicker(defaultScheduleTime));
      }
    } else {
      setPickupTime('ihned');
    }
  };

  const handleQuickTimeSelect = (minutes?: number) => {
    if (typeof minutes === 'undefined') {
      setIsScheduled(false);
      setPickupTime('ihned');
    } else {
      const newTime = new Date(Date.now() + minutes * 60 * 1000);
      setPickupTime(formatDateForPicker(newTime));
      if (!isScheduled) {
        setIsScheduled(true);
      }
    }
  };


  const validateForm = (): boolean => {
      const newErrors: Partial<Record<keyof RideRequest, string>> = {};
      if (!pickupAddress.trim()) newErrors.pickupAddress = t('dispatch.validation.pickupRequired');
      if (!destinationAddress.trim()) newErrors.destinationAddress = t('dispatch.validation.destinationRequired');
      if (!customerName.trim()) newErrors.customerName = t('dispatch.validation.nameRequired');
      if (!customerPhone.trim()) newErrors.customerPhone = t('dispatch.validation.phoneRequired');
      if (!pickupTime.trim()) newErrors.pickupTime = t('dispatch.validation.pickupTimeRequired');
      if (isScheduled && new Date(pickupTime).getTime() <= Date.now()) newErrors.pickupTime = t('dispatch.validation.futureTimeRequired');
      if (passengers <= 0) newErrors.passengers = t('dispatch.validation.positivePassengers');

      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
        const rideRequest: RideRequest = {
          pickupAddress,
          destinationAddress,
          customerName,
          customerPhone,
          passengers,
          pickupTime,
          notes,
        };
        if (isScheduled) {
            onSchedule(rideRequest);
        } else {
            onSubmit(rideRequest);
        }
    }
  };

  const isOnCooldown = cooldownTime > 0;

  return (
    <div className="bg-slate-800 p-2 rounded-lg shadow-2xl flex flex-col h-full">
        <h2 className="text-md font-semibold mb-1 border-b border-slate-700 pb-1">{t('dispatch.newRide')}</h2>
        <form onSubmit={handleSubmit} className="space-y-1 flex-grow flex flex-col">
        <div className="flex-grow space-y-1 overflow-y-auto pr-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <AutocompleteInputField 
                    label={t('dispatch.pickupAddress')} 
                    id="pickupAddress" 
                    value={pickupAddress} 
                    onChange={setPickupAddress} 
                    suggestions={uniqueAddresses} 
                    error={errors.pickupAddress} 
                    hint={t('dispatch.addressHint')}
                />
                <AutocompleteInputField 
                    label={t('dispatch.destinationAddress')} 
                    id="destinationAddress" 
                    value={destinationAddress} 
                    onChange={setDestinationAddress} 
                    suggestions={uniqueAddresses} 
                    error={errors.destinationAddress}
                    hint={t('dispatch.addressHint')}
                />
            </div>
            <AutocompleteInputField label={t('dispatch.customerName')} id="customerName" value={customerName} onChange={setCustomerName} suggestions={uniqueCustomerNames} error={errors.customerName} />
            <InputField label={t('dispatch.customerPhone')} id="customerPhone" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} type="tel" error={errors.customerPhone} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <InputField label={t('dispatch.passengers')} id="passengers" value={passengers} onChange={e => setPassengers(Math.max(1, parseInt(e.target.value, 10) || 1))} type="number" error={errors.passengers} />
                <div>
                    <div className="flex justify-between items-center mb-1">
                        <label className="block text-xs font-medium text-gray-300">{t('dispatch.pickupTime')}</label>
                        <div className="flex items-center">
                            <input
                                type="checkbox"
                                id="isScheduled"
                                checked={isScheduled}
                                onChange={(e) => handleScheduleToggle(e.target.checked)}
                                className="h-4 w-4 rounded bg-slate-700 border-slate-600 text-amber-500 focus:ring-amber-600 focus:ring-offset-slate-800 cursor-pointer"
                            />
                            <label htmlFor="isScheduled" className="ml-2 text-sm text-gray-300 cursor-pointer">{t('dispatch.schedule')}</label>
                        </div>
                    </div>

                    {isScheduled ? (
                        <input
                            type="datetime-local"
                            id="pickupTime"
                            name="pickupTime"
                            value={pickupTime === 'ihned' ? formatDateForPicker(new Date()) : pickupTime}
                            onChange={(e) => setPickupTime(e.target.value)}
                            min={formatDateForPicker(new Date())}
                            className={`w-full bg-slate-700 border ${errors.pickupTime ? 'border-red-500' : 'border-slate-600'} rounded-md shadow-sm py-1 px-3 text-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500`}
                        />
                    ) : (
                        <input
                            type="text"
                            value={t('dispatch.asap')}
                            readOnly
                            className="w-full bg-slate-600 border border-slate-500 rounded-md shadow-sm py-1 px-3 text-gray-300 cursor-default"
                        />
                    )}
                    
                    {errors.pickupTime && <p className="mt-1 text-xs text-red-400">{errors.pickupTime}</p>}
                    
                    <div className="flex items-center space-x-1 mt-1">
                        <button type="button" onClick={() => handleQuickTimeSelect()} className="px-2 py-0.5 text-xs font-medium rounded-full bg-slate-600 hover:bg-slate-500 transition-colors">{t('dispatch.asap')}</button>
                        <button type="button" onClick={() => handleQuickTimeSelect(10)} className="px-2 py-0.5 text-xs font-medium rounded-full bg-slate-600 hover:bg-slate-500 transition-colors">+10 min</button>
                        <button type="button" onClick={() => handleQuickTimeSelect(20)} className="px-2 py-0.5 text-xs font-medium rounded-full bg-slate-600 hover:bg-slate-500 transition-colors">+20 min</button>
                        <button type="button" onClick={() => handleQuickTimeSelect(30)} className="px-2 py-0.5 text-xs font-medium rounded-full bg-slate-600 hover:bg-slate-500 transition-colors">+30 min</button>
                    </div>
                </div>
            </div>
            
            <div>
                <label htmlFor="notes" className="block text-xs font-medium text-gray-300 mb-1">{t('dispatch.notesOptional')}</label>
                <textarea
                id="notes"
                name="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={1}
                className="w-full bg-slate-700 border border-slate-600 rounded-md shadow-sm py-1 px-3 text-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                placeholder={t('dispatch.notesPlaceholder')}
                ></textarea>
            </div>
        </div>


        <button
            type="submit"
            disabled={isLoading || (isOnCooldown && !isScheduled)}
            className="w-full flex justify-center py-1 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 focus:ring-offset-slate-800 disabled:bg-amber-800 disabled:cursor-not-allowed transition-colors mt-auto"
        >
            {isScheduled 
                ? t('dispatch.scheduleRide') 
                : isLoading
                ? t('dispatch.findingVehicle')
                : isOnCooldown 
                ? t('dispatch.cooldown', { cooldownTime })
                : t('dispatch.findVehicle')}
        </button>
        </form>
    </div>
  );
};
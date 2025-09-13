import React, { useState, useEffect, useMemo, useRef } from 'react';
import type { RideRequest, RideLog } from '../types';

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
      <label htmlFor={id} className="block text-sm font-medium text-gray-300 mb-1">{label}</label>
      <input
        type={type}
        id={id}
        name={id}
        value={value}
        onChange={onChange}
        className={`w-full bg-slate-700 border ${error ? 'border-red-500' : 'border-slate-600'} rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500`}
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
      <label htmlFor={id} className="block text-sm font-medium text-gray-300 mb-1">{label}</label>
      <input
        type="text"
        id={id}
        name={id}
        value={value}
        onChange={handleChange}
        onFocus={() => value && filterSuggestions(value)} // Show suggestions on focus if there's text
        className={`w-full bg-slate-700 border ${error ? 'border-red-500' : 'border-slate-600'} rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500`}
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
      if (!pickupAddress.trim()) newErrors.pickupAddress = "Adresa nástupu je povinná.";
      if (!destinationAddress.trim()) newErrors.destinationAddress = "Cílová adresa je povinná.";
      if (!customerName.trim()) newErrors.customerName = "Jméno zákazníka je povinné.";
      if (!customerPhone.trim()) newErrors.customerPhone = "Telefonní číslo je povinné.";
      if (!pickupTime.trim()) newErrors.pickupTime = "Čas vyzvednutí je povinný.";
      if (isScheduled && new Date(pickupTime).getTime() <= Date.now()) newErrors.pickupTime = "Plánovaný čas musí být v budoucnosti.";
      if (passengers <= 0) newErrors.passengers = "Počet cestujících musí být kladné číslo.";

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
    <div className="bg-slate-800 p-6 rounded-lg shadow-2xl flex flex-col h-full">
        <h2 className="text-2xl font-semibold mb-4 border-b border-slate-700 pb-3">Nová Jízda</h2>
        <form onSubmit={handleSubmit} className="space-y-4 flex-grow flex flex-col">
        <div className="flex-grow space-y-4 overflow-y-auto pr-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <AutocompleteInputField 
                    label="Adresa nástupu" 
                    id="pickupAddress" 
                    value={pickupAddress} 
                    onChange={setPickupAddress} 
                    suggestions={uniqueAddresses} 
                    error={errors.pickupAddress} 
                    hint="Hledání upřednostněno pro Jižní Moravu."
                />
                <AutocompleteInputField 
                    label="Adresa cíle" 
                    id="destinationAddress" 
                    value={destinationAddress} 
                    onChange={setDestinationAddress} 
                    suggestions={uniqueAddresses} 
                    error={errors.destinationAddress}
                    hint="Hledání upřednostněno pro Jižní Moravu."
                />
            </div>
            <AutocompleteInputField label="Jméno zákazníka" id="customerName" value={customerName} onChange={setCustomerName} suggestions={uniqueCustomerNames} error={errors.customerName} />
            <InputField label="Telefonní číslo" id="customerPhone" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} type="tel" error={errors.customerPhone} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InputField label="Počet cestujících" id="passengers" value={passengers} onChange={e => setPassengers(Math.max(1, parseInt(e.target.value, 10) || 1))} type="number" error={errors.passengers} />
                <div>
                    <div className="flex justify-between items-center mb-1">
                        <label className="block text-sm font-medium text-gray-300">Čas vyzvednutí</label>
                        <div className="flex items-center">
                            <input
                                type="checkbox"
                                id="isScheduled"
                                checked={isScheduled}
                                onChange={(e) => handleScheduleToggle(e.target.checked)}
                                className="h-4 w-4 rounded bg-slate-700 border-slate-600 text-amber-500 focus:ring-amber-600 focus:ring-offset-slate-800 cursor-pointer"
                            />
                            <label htmlFor="isScheduled" className="ml-2 text-sm text-gray-300 cursor-pointer">Naplánovat</label>
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
                            className={`w-full bg-slate-700 border ${errors.pickupTime ? 'border-red-500' : 'border-slate-600'} rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500`}
                        />
                    ) : (
                        <input
                            type="text"
                            value="Ihned"
                            readOnly
                            className="w-full bg-slate-600 border border-slate-500 rounded-md shadow-sm py-2 px-3 text-gray-300 cursor-default"
                        />
                    )}
                    
                    {errors.pickupTime && <p className="mt-1 text-xs text-red-400">{errors.pickupTime}</p>}
                    
                    <div className="flex items-center space-x-2 mt-2">
                        <button type="button" onClick={() => handleQuickTimeSelect()} className="px-3 py-1 text-xs font-medium rounded-full bg-slate-600 hover:bg-slate-500 transition-colors">ihned</button>
                        <button type="button" onClick={() => handleQuickTimeSelect(10)} className="px-3 py-1 text-xs font-medium rounded-full bg-slate-600 hover:bg-slate-500 transition-colors">+10 min</button>
                        <button type="button" onClick={() => handleQuickTimeSelect(20)} className="px-3 py-1 text-xs font-medium rounded-full bg-slate-600 hover:bg-slate-500 transition-colors">+20 min</button>
                        <button type="button" onClick={() => handleQuickTimeSelect(30)} className="px-3 py-1 text-xs font-medium rounded-full bg-slate-600 hover:bg-slate-500 transition-colors">+30 min</button>
                    </div>
                </div>
            </div>
            
            <div>
                <label htmlFor="notes" className="block text-sm font-medium text-gray-300 mb-1">Poznámka (volitelné)</label>
                <textarea
                id="notes"
                name="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full bg-slate-700 border border-slate-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                placeholder="např. 5. patro, u zadního vchodu..."
                ></textarea>
            </div>
        </div>


        <button
            type="submit"
            disabled={isLoading || (isOnCooldown && !isScheduled)}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 focus:ring-offset-slate-800 disabled:bg-amber-800 disabled:cursor-not-allowed transition-colors mt-auto"
        >
            {isScheduled 
                ? 'Naplánovat jízdu' 
                : isLoading
                ? 'Hledám vozidlo...'
                : isOnCooldown 
                ? `Zkuste to znovu za ${cooldownTime}s`
                : 'Najít vozidlo'}
        </button>
        </form>
    </div>
  );
};
import React, { useState, useMemo } from 'react';
import type { Vehicle, Person } from '../types';
import { VehicleStatus, VehicleType } from '../types';
import { CarIcon, EditIcon, PlusIcon, WrenchIcon } from './icons';
import { Countdown } from './Countdown';

interface VehicleStatusTableProps {
  vehicles: Vehicle[];
  people: Person[];
  onEdit: (vehicle: Vehicle) => void;
  onAddVehicleClick: () => void;
}

const FilterSelect: React.FC<{
    label: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
    options: { value: string; label: string }[];
}> = ({ label, value, onChange, options }) => (
    <div>
        <label htmlFor={label} className="sr-only">{label}</label>
        <select
            id={label}
            value={value}
            onChange={onChange}
            className="block w-full pl-3 pr-10 py-1 text-sm bg-slate-700 border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
        >
            {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </select>
    </div>
);

export const VehicleStatusTable: React.FC<VehicleStatusTableProps> = ({ vehicles, people, onEdit, onAddVehicleClick }) => {
  const [typeFilter, setTypeFilter] = useState<'all' | VehicleType>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | VehicleStatus>('all');
  const [hideInactive, setHideInactive] = useState(true);

  const getStatusClass = (status: VehicleStatus) => {
    switch (status) {
      case VehicleStatus.Available: return 'text-green-400';
      case VehicleStatus.Busy: return 'text-yellow-400';
      case VehicleStatus.OutOfService: return 'text-red-400';
      case VehicleStatus.NotDrivingToday: return 'text-sky-400';
      default: return 'text-gray-400';
    }
  };
  
  const getStatusDotClass = (status: VehicleStatus) => {
    switch (status) {
      case VehicleStatus.Available: return 'bg-green-500';
      case VehicleStatus.Busy: return 'bg-yellow-500';
      case VehicleStatus.OutOfService: return 'bg-red-500';
      case VehicleStatus.NotDrivingToday: return 'bg-sky-500';
      default: return 'bg-gray-500';
    }
  };

  const filteredVehicles = useMemo(() => {
    return vehicles.filter(vehicle => {
      if (hideInactive && (vehicle.status === VehicleStatus.OutOfService || vehicle.status === VehicleStatus.NotDrivingToday)) {
          return false;
      }
      const typeMatch = typeFilter === 'all' || vehicle.type === typeFilter;
      const statusMatch = statusFilter === 'all' || vehicle.status === statusFilter;
      return typeMatch && statusMatch;
    });
  }, [vehicles, typeFilter, statusFilter, hideInactive]);
  
  const typeOptions = [
    { value: 'all', label: 'Všechny typy' },
    { value: VehicleType.Car, label: 'Osobák' },
    { value: VehicleType.Van, label: 'Dodávka' },
  ];

  const statusOptions = [
    { value: 'all', label: 'Všechny stavy' },
    { value: VehicleStatus.Available, label: 'Volné' },
    { value: VehicleStatus.Busy, label: 'Obsazené' },
    { value: VehicleStatus.OutOfService, label: 'Mimo provoz' },
    { value: VehicleStatus.NotDrivingToday, label: 'Dnes nejede' },
  ];

  return (
    <div className="bg-slate-800 p-2 rounded-lg shadow-2xl flex flex-col h-full">
        <div className="flex-shrink-0 flex justify-between items-center mb-1 border-b border-slate-700 pb-1 flex-wrap gap-2">
            <h2 className="text-md font-semibold">Status Vozidel</h2>
            <div className="flex items-center gap-x-2 flex-wrap gap-y-2 justify-end">
                <div className="flex items-center gap-x-2">
                    <FilterSelect label="Filtrovat podle typu" value={typeFilter} onChange={e => setTypeFilter(e.target.value as 'all' | VehicleType)} options={typeOptions} />
                    <FilterSelect label="Filtrovat podle statusu" value={statusFilter} onChange={e => setStatusFilter(e.target.value as 'all' | VehicleStatus)} options={statusOptions} />
                </div>
                 <div className="flex items-center space-x-2 border-l border-slate-600 pl-2">
                    <label htmlFor="hide-inactive" className="text-sm font-medium text-gray-300 cursor-pointer">Skrýt neaktivní</label>
                    <button
                        onClick={() => setHideInactive(prev => !prev)}
                        type="button"
                        className={`${hideInactive ? 'bg-amber-600' : 'bg-slate-600'} relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-slate-800`}
                        role="switch"
                        aria-checked={hideInactive}
                        id="hide-inactive"
                    >
                        <span aria-hidden="true" className={`${hideInactive ? 'translate-x-5' : 'translate-x-0'} pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`} />
                    </button>
                </div>
                <button
                    onClick={onAddVehicleClick}
                    className="flex items-center space-x-2 px-3 py-1 text-sm font-medium rounded-md shadow-sm text-white bg-amber-600 hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 focus:ring-offset-slate-800 transition-colors"
                    aria-label="Přidat nové vozidlo"
                >
                    <PlusIcon />
                    <span>Přidat</span>
                </button>
            </div>
        </div>
        <div className="flex-grow overflow-y-auto -mr-2 -ml-2 pr-2 pl-2">
            <table className="min-w-full divide-y divide-slate-700">
                <thead className="bg-slate-800 sticky top-0">
                <tr>
                    <th scope="col" className="py-1 pl-4 pr-3 text-left text-sm font-semibold text-gray-300 sm:pl-0">Vozidlo</th>
                    <th scope="col" className="px-3 py-1 text-left text-sm font-semibold text-gray-300">Status</th>
                    <th scope="col" className="px-3 py-1 text-left text-sm font-semibold text-gray-300">Lokace</th>
                    <th scope="col" className="px-3 py-1 text-left text-sm font-semibold text-gray-300">Upozornění</th>
                    <th scope="col" className="relative py-1 pl-3 pr-4 sm:pr-0 text-right text-sm font-semibold text-gray-300">
                        Akce
                    </th>
                </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                {filteredVehicles.map((vehicle) => {
                    const driver = people.find(p => p.id === vehicle.driverId);
                    
                    const warnings = [];
                    // Check for service
                    if (vehicle.mileage && vehicle.lastServiceMileage && vehicle.serviceInterval && vehicle.mileage >= vehicle.lastServiceMileage + vehicle.serviceInterval - 1000) {
                        const kmOver = vehicle.mileage - (vehicle.lastServiceMileage + vehicle.serviceInterval);
                        if (kmOver > 0) {
                            warnings.push(`Servis po termínu o ${kmOver} km.`);
                        } else {
                            const kmToService = (vehicle.lastServiceMileage + vehicle.serviceInterval) - vehicle.mileage;
                            warnings.push(`Servis za ${kmToService} km.`);
                        }
                    }

                    // Check for tech inspection
                    if (vehicle.technicalInspectionExpiry) {
                        const expiryDate = new Date(vehicle.technicalInspectionExpiry);
                        const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
                        if (expiryDate < new Date()) {
                            warnings.push('STK propadlá!');
                        } else if (expiryDate < thirtyDaysFromNow) {
                            warnings.push(`STK končí ${expiryDate.toLocaleDateString('cs-CZ')}.`);
                        }
                    }
                    
                    // Check for vignette
                    if (vehicle.vignetteExpiry) {
                        const expiryDate = new Date(vehicle.vignetteExpiry);
                        const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
                        if (expiryDate < new Date()) {
                            warnings.push('Dálniční známka propadlá!');
                        } else if (expiryDate < thirtyDaysFromNow) {
                            warnings.push(`Dálniční známka končí ${expiryDate.toLocaleDateString('cs-CZ')}.`);
                        }
                    }


                    return (
                    <tr key={vehicle.id} className="hover:bg-slate-700/50 transition-colors">
                    <td className="whitespace-nowrap py-1 pl-4 pr-3 text-sm sm:pl-0">
                        <div className="flex items-center">
                        <div className="h-7 w-7 flex-shrink-0">
                             <CarIcon className={vehicle.type === VehicleType.Car ? "text-amber-400" : "text-gray-200"} size={28} />
                        </div>
                        <div className="ml-2">
                            <div className="font-medium text-white text-sm">{vehicle.name}</div>
                            <div className="text-gray-400 text-xs">{driver?.name || <span className="italic text-gray-500">Nepřiřazen</span>}</div>
                            {driver?.phone && <a href={`tel:${driver.phone}`} className="text-teal-400 text-xs font-mono hover:underline">{driver.phone}</a>}
                            <div className="mt-0.5 font-mono text-xs text-gray-500 bg-slate-700 px-1.5 py-0.5 rounded w-fit">{vehicle.licensePlate}</div>
                        </div>
                        </div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-1 text-sm">
                        <div className="flex items-center">
                        <div className={`h-2.5 w-2.5 rounded-full mr-2 ${getStatusDotClass(vehicle.status)}`}></div>
                        <span className={`${getStatusClass(vehicle.status)} capitalize text-xs`}>
                            {vehicle.status}
                            {(vehicle.status === VehicleStatus.Busy || vehicle.status === VehicleStatus.OutOfService) && vehicle.freeAt && <Countdown freeAt={vehicle.freeAt} />}
                        </span>
                        </div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-1 text-sm text-gray-400">{vehicle.location}</td>
                    <td className="whitespace-nowrap px-3 py-1 text-sm text-gray-400">
                        {warnings.length > 0 && (
                            <div className="flex items-center space-x-2" title={warnings.join('\n')}>
                                <WrenchIcon className="text-yellow-400" size={18} />
                                <span className="text-xs text-yellow-400">{warnings.length}</span>
                            </div>
                        )}
                    </td>
                    <td className="relative whitespace-nowrap py-1 pl-3 pr-4 text-right text-sm font-medium sm:pr-0">
                        <button
                        onClick={() => onEdit(vehicle)}
                        className="text-amber-400 hover:text-amber-300 transition-colors p-2 -m-2 rounded-full"
                        aria-label={`Upravit vozidlo ${vehicle.name}`}
                        >
                        <EditIcon size={18} />
                        </button>
                    </td>
                    </tr>
                )})}
                </tbody>
            </table>
        </div>
    </div>
  );
};
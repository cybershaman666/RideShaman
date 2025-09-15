import React, { useState, useMemo } from 'react';
import type { Vehicle, Person } from '../types';
import { VehicleStatus, VehicleType } from '../types';
import { CarIcon, EditIcon, PlusIcon, WrenchIcon, AlertTriangleIcon } from './icons';
import { Countdown } from './Countdown';
import { useTranslation } from '../contexts/LanguageContext';

interface VehicleStatusTableProps {
  vehicles: Vehicle[];
  people: Person[];
  onEdit: (vehicle: Vehicle) => void;
  onAddVehicleClick: () => void;
}

type WarningLevel = 'info' | 'warning' | 'urgent';

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
  const { t } = useTranslation();
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
    { value: 'all', label: t('vehicles.filters.allTypes') },
    { value: VehicleType.Car, label: t(`vehicleType.${VehicleType.Car}`) },
    { value: VehicleType.Van, label: t(`vehicleType.${VehicleType.Van}`) },
  ];

  const statusOptions = [
    { value: 'all', label: t('vehicles.filters.allStatuses') },
    { value: VehicleStatus.Available, label: t(`vehicleStatus.${VehicleStatus.Available}`) },
    { value: VehicleStatus.Busy, label: t(`vehicleStatus.${VehicleStatus.Busy}`) },
    { value: VehicleStatus.OutOfService, label: t(`vehicleStatus.${VehicleStatus.OutOfService}`) },
    { value: VehicleStatus.NotDrivingToday, label: t(`vehicleStatus.${VehicleStatus.NotDrivingToday}`) },
  ];

  return (
    <div className="bg-slate-800 p-2 rounded-lg shadow-2xl flex flex-col h-full">
        <div className="flex-shrink-0 flex justify-between items-center mb-1 border-b border-slate-700 pb-1 flex-wrap gap-2">
            <h2 className="text-md font-semibold">{t('vehicles.title')}</h2>
            <div className="flex items-center gap-x-2 flex-wrap gap-y-2 justify-end">
                <div className="flex items-center gap-x-2">
                    <FilterSelect label={t('vehicles.filters.filterByType')} value={typeFilter} onChange={e => setTypeFilter(e.target.value as 'all' | VehicleType)} options={typeOptions} />
                    <FilterSelect label={t('vehicles.filters.filterByStatus')} value={statusFilter} onChange={e => setStatusFilter(e.target.value as 'all' | VehicleStatus)} options={statusOptions} />
                </div>
                 <div className="flex items-center space-x-2 border-l border-slate-600 pl-2">
                    <label htmlFor="hide-inactive" className="text-sm font-medium text-gray-300 cursor-pointer">{t('vehicles.filters.hideInactive')}</label>
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
                    aria-label={t('vehicles.addVehicle')}
                >
                    <PlusIcon />
                    <span>{t('general.add')}</span>
                </button>
            </div>
        </div>
        <div className="flex-grow overflow-y-auto -mr-2 -ml-2 pr-2 pl-2">
            <table className="min-w-full divide-y divide-slate-700">
                <thead className="bg-slate-800 sticky top-0">
                <tr>
                    <th scope="col" className="py-1 pl-4 pr-3 text-left text-sm font-semibold text-gray-300 sm:pl-0">{t('vehicles.table.vehicle')}</th>
                    <th scope="col" className="px-3 py-1 text-left text-sm font-semibold text-gray-300">{t('vehicles.table.status')}</th>
                    <th scope="col" className="px-3 py-1 text-left text-sm font-semibold text-gray-300">{t('vehicles.table.location')}</th>
                    <th scope="col" className="px-3 py-1 text-left text-sm font-semibold text-gray-300">{t('vehicles.table.warnings')}</th>
                    <th scope="col" className="relative py-1 pl-3 pr-4 sm:pr-0 text-right text-sm font-semibold text-gray-300">
                        {t('vehicles.table.actions')}
                    </th>
                </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                {filteredVehicles.map((vehicle) => {
                    const driver = people.find(p => p.id === vehicle.driverId);
                    
                    const warnings: { text: string; level: WarningLevel }[] = [];
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);

                    // Check for service
                    if (vehicle.mileage && vehicle.lastServiceMileage && vehicle.serviceInterval && vehicle.mileage >= vehicle.lastServiceMileage + vehicle.serviceInterval - 1000) {
                        const kmOver = vehicle.mileage - (vehicle.lastServiceMileage + vehicle.serviceInterval);
                        if (kmOver > 0) {
                            warnings.push({ text: t('vehicles.warnings.serviceOverdue', { km: kmOver }), level: 'urgent' });
                        } else {
                            const kmToService = (vehicle.lastServiceMileage + vehicle.serviceInterval) - vehicle.mileage;
                            warnings.push({ text: t('vehicles.warnings.serviceDue', { km: kmToService }), level: 'warning' });
                        }
                    }

                    // Check for tech inspection
                    if (vehicle.technicalInspectionExpiry) {
                        const expiryDate = new Date(vehicle.technicalInspectionExpiry);
                        const diffTime = expiryDate.getTime() - today.getTime();
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                        if (diffDays < 0) {
                           warnings.push({ text: t('vehicles.warnings.inspectionExpired'), level: 'urgent' });
                        } else if (diffDays <= 5) {
                            warnings.push({ text: t('vehicles.warnings.inspectionExpiresSoon', { days: diffDays }), level: 'urgent' });
                        } else if (diffDays <= 30) {
                            warnings.push({ text: t('vehicles.warnings.inspectionExpires', { date: expiryDate.toLocaleDateString() }), level: 'warning' });
                        }
                    }
                    
                    // Check for vignette
                    if (vehicle.vignetteExpiry) {
                        const expiryDate = new Date(vehicle.vignetteExpiry);
                        const diffTime = expiryDate.getTime() - today.getTime();
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                        
                        if (diffDays < 0) {
                            warnings.push({ text: t('vehicles.warnings.vignetteExpired'), level: 'urgent' });
                        } else if (diffDays <= 5) {
                            warnings.push({ text: t('vehicles.warnings.vignetteExpiresSoon', { days: diffDays }), level: 'urgent' });
                        } else if (diffDays <= 30) {
                            warnings.push({ text: t('vehicles.warnings.vignetteExpires', { date: expiryDate.toLocaleDateString() }), level: 'warning' });
                        }
                    }

                    const highestSeverity = warnings.reduce((maxLevel, w) => {
                        if (w.level === 'urgent') return 'urgent';
                        if (w.level === 'warning' && maxLevel !== 'urgent') return 'warning';
                        return maxLevel;
                    }, 'info' as WarningLevel);


                    return (
                    <tr key={vehicle.id} className="hover:bg-slate-700/50 transition-colors">
                    <td className="whitespace-nowrap py-1 pl-4 pr-3 text-sm sm:pl-0">
                        <div className="flex items-center">
                        <div className="h-7 w-7 flex-shrink-0">
                             <CarIcon className={vehicle.type === VehicleType.Car ? "text-amber-400" : "text-gray-200"} size={28} />
                        </div>
                        <div className="ml-2">
                            <div className="font-medium text-white text-sm">{vehicle.name}</div>
                            <div className="text-gray-400 text-xs">{driver?.name || <span className="italic text-gray-500">{t('general.unassigned')}</span>}</div>
                            {driver?.phone && <a href={`tel:${driver.phone}`} className="text-teal-400 text-xs font-mono hover:underline">{driver.phone}</a>}
                            <div className="mt-0.5 font-mono text-xs text-gray-500 bg-slate-700 px-1.5 py-0.5 rounded w-fit">{vehicle.licensePlate}</div>
                        </div>
                        </div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-1 text-sm">
                        <div className="flex items-center">
                        <div className={`h-2.5 w-2.5 rounded-full mr-2 ${getStatusDotClass(vehicle.status)}`}></div>
                        <span className={`${getStatusClass(vehicle.status)} capitalize text-xs`}>
                            {t(`vehicleStatus.${vehicle.status}`)}
                            {(vehicle.status === VehicleStatus.Busy || vehicle.status === VehicleStatus.OutOfService) && vehicle.freeAt && <Countdown freeAt={vehicle.freeAt} />}
                        </span>
                        </div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-1 text-sm text-gray-400">{vehicle.location}</td>
                    <td className="whitespace-nowrap px-3 py-1 text-sm text-gray-400">
                        {warnings.length > 0 && (
                            <div className="flex items-center space-x-2" title={warnings.map(w => w.text).join('\n')}>
                                {highestSeverity === 'urgent' ? (
                                    <AlertTriangleIcon className="text-red-500" size={18} />
                                ) : (
                                    <WrenchIcon className="text-yellow-400" size={18} />
                                )}
                                <span className={`text-xs font-semibold ${highestSeverity === 'urgent' ? 'text-red-500' : 'text-yellow-400'}`}>
                                    {warnings.length}
                                </span>
                            </div>
                        )}
                    </td>
                    <td className="relative whitespace-nowrap py-1 pl-3 pr-4 text-right text-sm font-medium sm:pr-0">
                        <button
                        onClick={() => onEdit(vehicle)}
                        className="text-amber-400 hover:text-amber-300 transition-colors p-2 -m-2 rounded-full"
                        aria-label={t('vehicles.editVehicle', { name: vehicle.name })}
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
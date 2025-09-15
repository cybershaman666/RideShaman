import React from 'react';
import { RideLog, VehicleType, RideStatus } from '../types';
import { CarIcon, ArrowUpIcon, ArrowDownIcon, EditIcon, TrashIcon } from './icons';
import { useTranslation } from '../contexts/LanguageContext';

interface RideLogTableProps {
  logs: RideLog[];
  onSort: (key: 'timestamp' | 'customerName') => void;
  sortConfig: {
    key: 'timestamp' | 'customerName';
    direction: 'asc' | 'desc';
  };
  onToggleSmsSent: (logId: string) => void;
  onEdit: (log: RideLog) => void;
  onStatusChange: (logId: string, newStatus: RideStatus) => void;
  onDelete: (logId: string) => void;
  showCompleted: boolean;
  onToggleShowCompleted: () => void;
}

const SortableHeader: React.FC<{
  label: string;
  sortKey: 'timestamp' | 'customerName';
  onSort: (key: 'timestamp' | 'customerName') => void;
  sortConfig: RideLogTableProps['sortConfig'];
  className?: string;
}> = ({ label, sortKey, onSort, sortConfig, className }) => {
  const { t } = useTranslation();
  const isSorted = sortConfig.key === sortKey;
  const direction = isSorted ? sortConfig.direction : null;

  return (
     <th scope="col" className={`py-1 text-left text-sm font-semibold text-gray-300 ${className}`}>
        <button
          onClick={() => onSort(sortKey)}
          className="flex items-center space-x-1 group"
          aria-label={t('rideLog.table.sortBy', { label })}
        >
          <span>{label}</span>
          <span className="opacity-50 group-hover:opacity-100 transition-opacity">
            {direction === 'asc' && <ArrowUpIcon size={14} />}
            {direction === 'desc' && <ArrowDownIcon size={14} />}
          </span>
        </button>
      </th>
  );
};


export const RideLogTable: React.FC<RideLogTableProps> = ({ logs, onSort, sortConfig, onToggleSmsSent, onEdit, onStatusChange, onDelete, showCompleted, onToggleShowCompleted }) => {
  const { t, language } = useTranslation();
  
  const getStatusSelectClass = (status: RideStatus) => {
    const base = "w-full rounded-md border-0 py-1 pl-3 pr-8 text-xs font-medium focus:ring-2 focus:ring-inset focus:ring-amber-500 cursor-pointer transition-colors capitalize";
    switch (status) {
      case RideStatus.Scheduled:
        return `${base} bg-sky-400/10 text-sky-400 ring-1 ring-inset ring-sky-400/20 hover:bg-sky-400/20`;
      case RideStatus.OnTheWay:
        return `${base} bg-yellow-400/10 text-yellow-400 ring-1 ring-inset ring-yellow-400/20 hover:bg-yellow-400/20`;
      case RideStatus.Completed:
        return `${base} bg-green-500/10 text-green-400 ring-1 ring-inset ring-green-500/20 hover:bg-green-500/20`;
      case RideStatus.Cancelled:
        return `${base} bg-red-400/10 text-red-400 ring-1 ring-inset ring-red-400/20 hover:bg-red-400/20`;
      default:
        return `${base} bg-gray-400/10 text-gray-400 ring-1 ring-inset ring-gray-400/20 hover:bg-gray-400/20`;
    }
  };
  
  const renderRoute = (stops: string[]) => {
    if (!stops || stops.length === 0) return 'N/A';
    if (stops.length === 1) return stops[0];
    if (stops.length === 2) {
      return (
        <div className="flex flex-col max-h-16 overflow-hidden" title={`${stops[0]} -> ${stops[1]}`}>
          <span className="truncate"><strong>{t('rideLog.table.from')}:</strong> {stops[0]}</span>
          <span className="truncate"><strong>{t('rideLog.table.to')}:</strong> {stops[1]}</span>
        </div>
      );
    }
    const fullRouteTooltip = stops.map((s, i) => `${i + 1}. ${s}`).join('\n');
    return (
      <div className="flex flex-col max-h-16 overflow-hidden" title={fullRouteTooltip}>
        <span className="truncate"><strong>{t('rideLog.table.from')}:</strong> {stops[0]}</span>
        <span className="truncate"><strong>{t('rideLog.table.to')}:</strong> {stops[stops.length - 1]} (+{stops.length - 2} {t('rideLog.table.stops')})</span>
      </div>
    );
  };

  return (
    <div className="bg-slate-800 p-2 rounded-lg shadow-2xl flex flex-col h-full">
      <div className="flex-shrink-0 flex justify-between items-center mb-1 border-b border-slate-700 pb-1">
        <h2 className="text-md font-semibold">{t('rideLog.title')}</h2>
        <div className="flex items-center space-x-3">
            <label htmlFor="show-inactive" className="text-sm font-medium text-gray-300 cursor-pointer">
                {t('rideLog.showInactive')}
            </label>
            <button
                onClick={onToggleShowCompleted}
                type="button"
                className={`${
                showCompleted ? 'bg-amber-600' : 'bg-slate-600'
                } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-slate-900`}
                role="switch"
                aria-checked={showCompleted}
                id="show-inactive"
            >
                <span
                aria-hidden="true"
                className={`${
                    showCompleted ? 'translate-x-5' : 'translate-x-0'
                } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
                />
            </button>
        </div>
      </div>
      {logs.length === 0 ? (
         <p className="text-gray-400 text-center py-4">
             {showCompleted ? t('rideLog.noRidesYet') : t('rideLog.noActiveRides')}
         </p>
      ) : (
        <div className="flex-grow overflow-y-auto -mr-2 -ml-2 pr-2 pl-2">
          <table className="min-w-full divide-y divide-slate-700">
            <thead className="bg-slate-800 sticky top-0 z-10">
              <tr>
                <SortableHeader label={t('rideLog.table.time')} sortKey="timestamp" onSort={onSort} sortConfig={sortConfig} className="pl-4 pr-3 sm:pl-0" />
                <th scope="col" className="px-3 py-1 text-left text-sm font-semibold text-gray-300">{t('rideLog.table.driver')}</th>
                <SortableHeader label={t('rideLog.table.customer')} sortKey="customerName" onSort={onSort} sortConfig={sortConfig} className="px-3" />
                <th scope="col" className="px-3 py-1 text-left text-sm font-semibold text-gray-300">{t('rideLog.table.phone')}</th>
                <th scope="col" className="px-3 py-1 text-left text-sm font-semibold text-gray-300">{t('rideLog.table.route')}</th>
                <th scope="col" className="px-3 py-1 text-left text-sm font-semibold text-gray-300">{t('rideLog.table.price')}</th>
                <th scope="col" className="px-3 py-1 text-left text-sm font-semibold text-gray-300">{t('rideLog.table.status')}</th>
                <th scope="col" className="px-3 py-1 text-left text-sm font-semibold text-gray-300">{t('rideLog.table.sms')}</th>
                <th scope="col" className="relative py-1 pl-3 pr-4 sm:pr-0 text-right text-sm font-semibold text-gray-300">{t('rideLog.table.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {logs.map((log) => (
                <tr key={log.id} className={`${log.status === RideStatus.Scheduled ? 'bg-sky-900/50' : ''} hover:bg-slate-700/50`}>
                  <td className="whitespace-nowrap py-2 pl-4 pr-3 text-sm text-gray-400 sm:pl-0">
                    {new Date(log.timestamp).toLocaleString(language)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-sm">
                    <div className="flex items-center">
                      {log.vehicleType && (
                        <div className={`${log.vehicleType === VehicleType.Car ? 'text-gray-400' : 'text-gray-200'} mr-3 flex-shrink-0`}>
                          <CarIcon />
                        </div>
                      )}
                      <div>
                        <div className="font-medium text-white">{log.driverName || <span className="text-sky-400 italic">{t('rideLog.table.awaitingAssignment')}</span>}</div>
                        {log.vehicleName && <div className="text-gray-400 text-xs">{log.vehicleName} ({log.vehicleLicensePlate})</div>}
                      </div>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-sm text-gray-400">{log.customerName}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-sm text-gray-400">{log.customerPhone}</td>
                  <td className="px-3 py-2 text-sm text-gray-400 max-w-xs">
                    {renderRoute(log.stops)}
                    <span className="truncate text-teal-400 text-xs"><strong>{t('rideLog.table.pickup')}:</strong> {log.pickupTime}</span>
                    {log.notes && (
                      <span className="truncate text-yellow-300 text-xs" title={log.notes}>
                        <strong>{t('rideLog.table.note')}:</strong> {log.notes}
                      </span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-sm font-medium text-white">
                     {log.estimatedPrice ? `${log.estimatedPrice} Kč` : t('general.notApplicable')}
                  </td>
                   <td className="whitespace-nowrap px-3 py-2 text-sm text-gray-400">
                     <select
                        value={log.status}
                        onChange={(e) => onStatusChange(log.id, e.target.value as RideStatus)}
                        className={getStatusSelectClass(log.status)}
                        aria-label={t('rideLog.table.changeStatusFor', { customerName: log.customerName })}
                    >
                        {Object.values(RideStatus).map(status => (
                            <option key={status} value={status} className="bg-slate-800 text-white">
                                {t(`rideStatus.${status}`)}
                            </option>
                        ))}
                    </select>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-sm">
                    <input
                      type="checkbox"
                      checked={log.smsSent}
                      onChange={() => onToggleSmsSent(log.id)}
                      className="h-5 w-5 rounded bg-slate-700 border-slate-600 text-amber-500 focus:ring-amber-600 focus:ring-offset-slate-800 cursor-pointer"
                      aria-label={t('rideLog.table.markSmsSentFor', { customerName: log.customerName })}
                    />
                  </td>
                  <td className="relative whitespace-nowrap py-2 pl-3 pr-4 text-right text-sm font-medium sm:pr-0">
                    <button
                      onClick={() => onEdit(log)}
                      className="text-amber-400 hover:text-amber-300 transition-colors p-2 -m-2 rounded-full"
                      aria-label={t('rideLog.table.editRideFor', { customerName: log.customerName })}
                    >
                      <EditIcon />
                    </button>
                    <button
                      onClick={() => onDelete(log.id)}
                      className="text-gray-500 hover:text-red-500 transition-colors p-2 -m-2 ml-1 rounded-full"
                      aria-label={t('rideLog.table.deleteRideFor', { customerName: log.customerName })}
                    >
                      <TrashIcon size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
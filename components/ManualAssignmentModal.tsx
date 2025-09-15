import React, { useState, useEffect } from 'react';
import type { RideRequest, Vehicle, Person } from '../types';
import { CloseIcon, ClipboardIcon, CheckCircleIcon, SendIcon } from './icons';
import { useTranslation } from '../contexts/LanguageContext';

interface ManualAssignmentModalProps {
  details: {
    rideRequest: RideRequest;
    vehicle: Vehicle;
    rideDuration: number;
    sms: string;
  };
  people: Person[];
  onConfirm: (durationInMinutes: number) => void;
  onClose: () => void;
}

export const ManualAssignmentModal: React.FC<ManualAssignmentModalProps> = ({ details, people, onConfirm, onClose }) => {
  const { t } = useTranslation();
  const { rideRequest, vehicle, rideDuration, sms } = details;
  const [duration, setDuration] = useState(rideDuration);
  const [copied, setCopied] = useState(false);
  
  const driver = people.find(p => p.id === vehicle.driverId);
  const driverPhoneNumber = driver?.phone.replace(/\s/g, '');

  useEffect(() => {
    setDuration(rideDuration);
  }, [rideDuration]);

  const handleCopy = () => {
    if (sms) {
      navigator.clipboard.writeText(sms).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (duration > 0) {
      onConfirm(duration);
    } else {
      alert(t('manualAssignment.validation.validDuration'));
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/70 z-50 flex justify-center items-start pt-24 p-4 animate-fade-in overflow-y-auto"
      aria-labelledby="manual-assign-title"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-slate-800 rounded-lg shadow-2xl w-full max-w-md relative">
        <div className="flex justify-between items-center p-6 border-b border-slate-700">
          <h2 id="manual-assign-title" className="text-xl font-semibold">
            {t('manualAssignment.title')}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
            aria-label={t('general.closeModal')}
          >
            <CloseIcon />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            <div className='text-sm space-y-2'>
                <p><strong className='text-gray-400'>{t('manualAssignment.customer')}:</strong> {rideRequest.customerName}</p>
                <p><strong className='text-gray-400'>{t('manualAssignment.route')}:</strong> {rideRequest.pickupAddress} <span className='text-gray-400'>→</span> {rideRequest.destinationAddress}</p>
                <p><strong className='text-gray-400'>{t('manualAssignment.vehicle')}:</strong> {vehicle.name} ({driver?.name || t('general.unassigned')})</p>
            </div>
            <div className='border-t border-slate-700 pt-4'>
              <label htmlFor="duration" className="block text-sm font-medium text-gray-300 mb-1">
                {t('manualAssignment.busyDuration')}
              </label>
              <input
                type="number"
                id="duration"
                name="duration"
                value={duration}
                onChange={(e) => setDuration(parseInt(e.target.value, 10) || 0)}
                min="1"
                required
                className="w-full bg-slate-700 border border-slate-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              />
               <p className="mt-2 text-xs text-gray-400">
                {t('manualAssignment.googleMapsEstimate', { duration: rideDuration })}
              </p>
            </div>
            
            {/* SMS Message */}
            <div className="border-t border-slate-700 pt-4">
                {driver?.phone && <p className="mb-2"><strong className='text-gray-400'>{t('smsPreview.driverPhone')}:</strong> <a href={`tel:${driver.phone}`} className="font-mono text-teal-400 hover:underline">{driver.phone}</a></p>}
                <h4 className="text-sm text-gray-400 font-medium mb-2">{t('assignment.smsSuggestion')}</h4>
                <div className="relative bg-slate-900 p-4 rounded-lg border border-slate-700">
                <p className="text-gray-200 whitespace-pre-wrap font-mono text-sm">{sms}</p>
                <div className="absolute top-2 right-2 flex items-center space-x-2">
                    <button
                        onClick={() => {
                            if (driverPhoneNumber) {
                                window.location.href = `sms:${driverPhoneNumber}?body=${encodeURIComponent(sms)}`;
                            }
                        }}
                        disabled={!driverPhoneNumber}
                        className="p-2 rounded-md bg-slate-700 text-gray-300 transition-colors enabled:hover:bg-slate-600 enabled:hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                        title={driverPhoneNumber ? t('assignment.sendSmsApp') : t('assignment.noDriverAssigned')}
                    >
                        <SendIcon className="w-5 h-5"/>
                    </button>
                    <button
                        type="button"
                        onClick={handleCopy}
                        className="p-2 rounded-md bg-slate-700 hover:bg-slate-600 text-gray-300 hover:text-white transition-colors"
                        title={t('assignment.copyText')}
                    >
                        {copied ? <CheckCircleIcon className="w-5 h-5 text-green-400" /> : <ClipboardIcon className="w-5 h-5"/>}
                    </button>
                </div>
                </div>
            </div>

          </div>
          <div className="flex justify-end items-center p-6 bg-slate-900/50 border-t border-slate-700 rounded-b-lg space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium rounded-md bg-slate-600 text-gray-200 hover:bg-slate-500 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-slate-800"
            >
              {t('general.cancel')}
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium rounded-md shadow-sm text-white bg-amber-600 hover:bg-amber-700 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-slate-800"
            >
              {t('manualAssignment.confirmAndAssign')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
import React, { useState } from 'react';
import { CloseIcon, ClipboardIcon, CheckCircleIcon, SendIcon } from './icons';

interface SmsPreviewModalProps {
  sms: string;
  driverPhone?: string;
  onClose: () => void;
}

export const SmsPreviewModal: React.FC<SmsPreviewModalProps> = ({ sms, driverPhone, onClose }) => {
  const [copied, setCopied] = useState(false);
  const cleanDriverPhone = driverPhone?.replace(/\s/g, '');

  const handleCopy = () => {
    navigator.clipboard.writeText(sms).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div
      className="fixed inset-0 bg-black/70 z-50 flex justify-center items-center p-4 animate-fade-in"
      aria-labelledby="sms-preview-title"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-slate-800 rounded-lg shadow-2xl w-full max-w-md relative">
        <div className="flex justify-between items-center p-6 border-b border-slate-700">
          <h2 id="sms-preview-title" className="text-xl font-semibold">
            Připravená SMS pro řidiče
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
            aria-label="Zavřít modální okno"
          >
            <CloseIcon />
          </button>
        </div>
        <div className="p-6">
          {driverPhone && (
            <p className="mb-4">
              <strong className='text-gray-400'>Telefon řidiče:</strong> 
              <a href={`tel:${driverPhone}`} className="font-mono text-teal-400 hover:underline ml-2">{driverPhone}</a>
            </p>
          )}
          <div className="relative bg-slate-900 p-4 rounded-lg border border-slate-700">
            <p className="text-gray-200 whitespace-pre-wrap font-mono text-sm">{sms}</p>
            <div className="absolute top-2 right-2 flex items-center space-x-2">
              <a
                href={`sms:${cleanDriverPhone}?body=${encodeURIComponent(sms)}`}
                target="_blank"
                rel="noopener noreferrer"
                className={`p-2 rounded-md bg-slate-700 text-gray-300 transition-colors ${!cleanDriverPhone ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-600 hover:text-white'}`}
                title={cleanDriverPhone ? "Odeslat přes výchozí aplikaci" : "Telefonní číslo řidiče není k dispozici"}
                onClick={(e) => !cleanDriverPhone && e.preventDefault()}
              >
                <SendIcon className="w-5 h-5"/>
              </a>
              <button
                type="button"
                onClick={handleCopy}
                className="p-2 rounded-md bg-slate-700 hover:bg-slate-600 text-gray-300 hover:text-white transition-colors"
                title="Kopírovat text"
              >
                {copied ? <CheckCircleIcon className="w-5 h-5 text-green-400" /> : <ClipboardIcon className="w-5 h-5"/>}
              </button>
            </div>
          </div>
        </div>
        <div className="flex justify-end items-center p-6 bg-slate-900/50 border-t border-slate-700 rounded-b-lg">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium rounded-md shadow-sm text-white bg-amber-600 hover:bg-amber-700 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-slate-800"
          >
            Zavřít
          </button>
        </div>
      </div>
    </div>
  );
};

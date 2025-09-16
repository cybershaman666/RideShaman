import React from 'react';
import { CloseIcon, UploadIcon, DownloadIcon, CsvIcon, UndoIcon, TrashIcon } from './icons';
import { useTranslation } from '../contexts/LanguageContext';
import { AiToggle } from './AiToggle';
import type { WidgetId, MessagingApp, FuelPrices } from '../types';
import { MessagingApp as AppType } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isAiEnabled: boolean;
  onToggleAi: () => void;
  messagingApp: MessagingApp;
  onMessagingAppChange: (app: MessagingApp) => void;
  isEditMode: boolean;
  onToggleEditMode: () => void;
  onResetLayout: () => void;
  onSaveData: () => void;
  onLoadData: () => void;
  onExportCsv: () => void;
  onClearRideHistory: () => void;
  widgetVisibility: Record<WidgetId, boolean>;
  onWidgetVisibilityChange: (widgetId: WidgetId, isVisible: boolean) => void;
  fuelPrices: FuelPrices;
  onFuelPricesChange: (prices: FuelPrices) => void;
}

const VisibilityToggle: React.FC<{
  label: string;
  isChecked: boolean;
  onToggle: () => void;
}> = ({ label, isChecked, onToggle }) => (
  <div className="flex justify-between items-center bg-slate-700/50 p-3 rounded-lg">
    <label className="text-gray-200 cursor-pointer" onClick={onToggle}>{label}</label>
    <button
      onClick={onToggle}
      type="button"
      className={`${isChecked ? 'bg-amber-600' : 'bg-slate-600'} relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-slate-800`}
      role="switch"
      aria-checked={isChecked}
    >
      <span aria-hidden="true" className={`${isChecked ? 'translate-x-5' : 'translate-x-0'} pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`} />
    </button>
  </div>
);

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen, onClose, isAiEnabled, onToggleAi, messagingApp, onMessagingAppChange,
  isEditMode, onToggleEditMode, onResetLayout, onSaveData, onLoadData, onExportCsv, onClearRideHistory,
  widgetVisibility, onWidgetVisibilityChange, fuelPrices, onFuelPricesChange
}) => {
  const { t, language, changeLanguage } = useTranslation();

  if (!isOpen) return null;
  
  const widgetIds: WidgetId[] = ['dispatch', 'vehicles', 'map', 'rideLog'];

  const handleFuelPriceChange = (fuelType: keyof FuelPrices, value: string) => {
    onFuelPricesChange({
      ...fuelPrices,
      [fuelType]: parseFloat(value) || 0,
    });
  };

  return (
    <div
      className="fixed inset-0 bg-black/70 z-50 flex justify-center items-center p-4 animate-fade-in"
      aria-labelledby="settings-title"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-slate-800 rounded-lg shadow-2xl w-full max-w-2xl relative">
        <header className="flex justify-between items-center p-6 border-b border-slate-700">
          <h2 id="settings-title" className="text-xl font-semibold">{t('settings.title')}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white" aria-label={t('general.close')}>
            <CloseIcon />
          </button>
        </header>

        <main className="p-6 space-y-8 max-h-[70vh] overflow-y-auto">
          {/* General Settings */}
          <section>
            <h3 className="text-lg font-medium text-amber-400 mb-4">{t('settings.general.title')}</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center bg-slate-700/50 p-3 rounded-lg">
                <label htmlFor="language-select" className="text-gray-200">{t('settings.general.language')}</label>
                <select
                  id="language-select"
                  value={language}
                  onChange={(e) => changeLanguage(e.target.value)}
                  className="bg-slate-700 border border-slate-600 rounded-md py-1 px-3"
                >
                  <option value="cs">Čeština</option>
                  <option value="en">English</option>
                  <option value="de">Deutsch</option>
                </select>
              </div>
              <div className="flex justify-between items-center bg-slate-700/50 p-3 rounded-lg">
                <span className="text-gray-200">{t('settings.general.aiMode')}</span>
                <AiToggle isEnabled={isAiEnabled} onToggle={onToggleAi} />
              </div>
            </div>
          </section>
          
          {/* Communication Settings */}
          <section>
            <h3 className="text-lg font-medium text-amber-400 mb-4">{t('settings.communication.title')}</h3>
            <div className="space-y-4">
               <div className="flex justify-between items-center bg-slate-700/50 p-3 rounded-lg">
                <label htmlFor="messaging-app-select" className="text-gray-200">{t('settings.communication.preferredApp')}</label>
                <select
                  id="messaging-app-select"
                  value={messagingApp}
                  onChange={(e) => onMessagingAppChange(e.target.value as MessagingApp)}
                  className="bg-slate-700 border border-slate-600 rounded-md py-1 px-3"
                >
                  {Object.values(AppType).map(app => (
                    <option key={app} value={app}>{app}</option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          {/* Fuel Price Settings */}
          <section>
            <h3 className="text-lg font-medium text-amber-400 mb-4">{t('settings.fuel.title')}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-slate-700/50 p-3 rounded-lg">
                <label htmlFor="diesel-price" className="block text-sm font-medium text-gray-300 mb-1">{t('settings.fuel.diesel')}</label>
                <div className="relative">
                  <input type="number" step="0.1" id="diesel-price" value={fuelPrices.DIESEL} onChange={(e) => handleFuelPriceChange('DIESEL', e.target.value)} className="w-full bg-slate-700 border border-slate-600 rounded-md py-1 pl-3 pr-12 text-white" />
                  <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400">Kč/L</span>
                </div>
              </div>
              <div className="bg-slate-700/50 p-3 rounded-lg">
                <label htmlFor="petrol-price" className="block text-sm font-medium text-gray-300 mb-1">{t('settings.fuel.petrol')}</label>
                <div className="relative">
                  <input type="number" step="0.1" id="petrol-price" value={fuelPrices.PETROL} onChange={(e) => handleFuelPriceChange('PETROL', e.target.value)} className="w-full bg-slate-700 border border-slate-600 rounded-md py-1 pl-3 pr-12 text-white" />
                  <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400">Kč/L</span>
                </div>
              </div>
            </div>
          </section>

          {/* Visibility Settings */}
          <section>
            <h3 className="text-lg font-medium text-amber-400 mb-4">{t('settings.visibility.title')}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {widgetIds.map(id => (
                 <VisibilityToggle 
                    key={id}
                    label={t(`settings.visibility.${id}`)}
                    isChecked={widgetVisibility[id]}
                    onToggle={() => onWidgetVisibilityChange(id, !widgetVisibility[id])}
                 />
              ))}
            </div>
          </section>

          {/* Layout Settings */}
          <section>
            <h3 className="text-lg font-medium text-amber-400 mb-4">{t('settings.layout.title')}</h3>
            <div className="flex flex-wrap gap-4">
              <button
                onClick={onToggleEditMode}
                className={`flex-1 px-4 py-2 text-sm font-medium rounded-md shadow-sm transition-colors ${
                  isEditMode ? 'bg-amber-600 text-white' : 'bg-slate-700 hover:bg-slate-600'
                }`}
              >
                {isEditMode ? t('settings.layout.finishEditing') : t('settings.layout.editLayout')}
              </button>
              <button
                onClick={onResetLayout}
                className="flex items-center space-x-2 flex-1 px-4 py-2 text-sm font-medium rounded-md shadow-sm bg-slate-700 hover:bg-slate-600 transition-colors"
              >
                <UndoIcon size={16} />
                <span>{t('settings.layout.resetLayout')}</span>
              </button>
            </div>
          </section>

          {/* Data Management */}
          <section>
            <h3 className="text-lg font-medium text-amber-400 mb-4">{t('settings.data.title')}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <button
                onClick={onSaveData}
                className="flex items-center justify-center space-x-2 px-3 py-2 text-sm font-medium rounded-md shadow-sm bg-slate-700 hover:bg-slate-600 transition-colors"
              >
                <DownloadIcon />
                <span>{t('settings.data.save')}</span>
              </button>
              <button
                onClick={onLoadData}
                className="flex items-center justify-center space-x-2 px-3 py-2 text-sm font-medium rounded-md shadow-sm bg-slate-700 hover:bg-slate-600 transition-colors"
              >
                <UploadIcon />
                <span>{t('settings.data.load')}</span>
              </button>
              <button
                onClick={onExportCsv}
                className="flex items-center justify-center space-x-2 px-3 py-2 text-sm font-medium rounded-md shadow-sm bg-slate-700 hover:bg-slate-600 transition-colors"
              >
                <CsvIcon />
                <span>{t('settings.data.exportCsv')}</span>
              </button>
              <button
                onClick={onClearRideHistory}
                className="col-span-1 sm:col-span-3 flex items-center justify-center space-x-2 px-3 py-2 text-sm font-medium rounded-md shadow-sm bg-red-800 text-red-100 hover:bg-red-700 transition-colors"
              >
                <TrashIcon />
                <span>{t('settings.data.clearHistory')}</span>
              </button>
            </div>
          </section>
        </main>

        <footer className="p-6 bg-slate-900/50 border-t border-slate-700 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 text-sm font-medium rounded-md shadow-sm text-white bg-amber-600 hover:bg-amber-700"
          >
            {t('general.close')}
          </button>
        </footer>
      </div>
    </div>
  );
};

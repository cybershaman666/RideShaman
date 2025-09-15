import React from 'react';
import { CloseIcon, UploadIcon, DownloadIcon, CsvIcon, UndoIcon } from './icons';
import { useTranslation } from '../contexts/LanguageContext';
import { AiToggle } from './AiToggle';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isAiEnabled: boolean;
  onToggleAi: () => void;
  isEditMode: boolean;
  onToggleEditMode: () => void;
  onResetLayout: () => void;
  onSaveData: () => void;
  onLoadData: () => void;
  onExportCsv: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen, onClose, isAiEnabled, onToggleAi, isEditMode, onToggleEditMode,
  onResetLayout, onSaveData, onLoadData, onExportCsv
}) => {
  const { t, language, changeLanguage } = useTranslation();

  if (!isOpen) return null;

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
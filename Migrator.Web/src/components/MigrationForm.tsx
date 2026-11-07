import React, { useState, useRef } from 'react';
import {
  Folder,
  Globe,
  Key,
  Mail,
  User,
  ArrowRight,
  Eye,
  EyeOff,
  AlertCircle,
  Settings,
  Upload,
  Download,
  CheckCircle2,
  Smartphone
} from 'lucide-react';
import { RunMigrationRequest, AppLanguage, SourceMode } from '../types';
import { getTranslation } from '../services/localization';
import { exportConfiguration, importConfiguration } from '../services/config';

interface MigrationFormProps {
  request: RunMigrationRequest;
  onChange: (req: RunMigrationRequest) => void;
  onSubmit: () => void;
  isProcessing: boolean;
  errors: Record<string, string>;
  lang: AppLanguage;
  localFolderName?: string;
  onSelectLocalFolder: () => void;
  hasLocalDirectoryHandle: boolean;
}

export const MigrationForm: React.FC<MigrationFormProps> = ({
  request,
  onChange,
  onSubmit,
  isProcessing,
  errors,
  lang,
  localFolderName,
  onSelectLocalFolder,
  hasLocalDirectoryHandle
}) => {
  const t = getTranslation(lang);
  const [showTargetPat, setShowTargetPat] = useState(false);
  const [showSourcePat, setShowSourcePat] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateField = <K extends keyof RunMigrationRequest>(key: K, value: RunMigrationRequest[K]) => {
    onChange({ ...request, [key]: value });
  };

  const handleModeChange = (mode: SourceMode) => {
    updateField('sourceMode', mode);
  };

  // Export configuration as JSON matching Desktop format (PascalCase)
  const handleExportConfig = () => {
    const json = exportConfiguration(request);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'migration-config.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Import configuration from JSON (accepts PascalCase & camelCase)
  const handleImportConfig = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const imported = importConfiguration(text);
        onChange({
          ...request,
          ...imported,
          sourceMode: imported.sourceMode ?? request.sourceMode
        });
      } catch {
        alert(t.importErrorMessage);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const hasErrors = Object.keys(errors).length > 0;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!isProcessing) onSubmit();
      }}
      className="space-y-4"
    >
      {/* Validation Summary */}
      {hasErrors && (
        <div className="bg-errorRed/10 border border-errorRed/40 rounded-lg p-3 text-xs text-errorRed animate-shake">
          <div className="flex items-center gap-2 font-semibold mb-1">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{t.validationSummaryHeader}</span>
          </div>
          <ul className="list-disc list-inside space-y-0.5 pl-1 text-[11px] text-errorRed/90">
            {Object.values(errors).map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Mode Switcher Tabs */}
      <div className="bg-[#161B22] border border-[#30363D] rounded-lg p-1.5 flex flex-col sm:flex-row gap-1">
        <button
          type="button"
          onClick={() => handleModeChange('remote')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-xs font-medium transition-colors ${
            request.sourceMode === 'remote'
              ? 'bg-[#21262D] text-[#E6EDF3] border border-[#30363D] shadow-sm'
              : 'text-[#8B949E] hover:text-[#E6EDF3]'
          }`}
        >
          <Globe className="w-3.5 h-3.5 text-brandBlue" />
          <span>{t.sourceModeRemote}</span>
        </button>

        <button
          type="button"
          onClick={() => handleModeChange('local')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-xs font-medium transition-colors ${
            request.sourceMode === 'local'
              ? 'bg-[#21262D] text-[#E6EDF3] border border-[#30363D] shadow-sm'
              : 'text-[#8B949E] hover:text-[#E6EDF3]'
          }`}
        >
          <Folder className="w-3.5 h-3.5 text-accentGreenBorder" />
          <span>{t.sourceModeLocal}</span>
        </button>
      </div>

      {/* Mobile Tip Card when on Local mode */}
      {request.sourceMode === 'local' && (
        <div className="sm:hidden bg-[#161B22] border border-[#30363D] rounded-lg p-2.5 flex items-start gap-2 text-xs text-[#8B949E]">
          <Smartphone className="w-4 h-4 text-brandBlue shrink-0 mt-0.5" />
          <span>{t.mobileWarningText}</span>
        </div>
      )}

      {/* Source Section */}
      <div className="bg-[#161B22] border border-[#30363D] rounded-lg p-4 space-y-3 shadow-sm">
        <h2 className="text-xs font-semibold text-[#8B949E] uppercase tracking-wider flex items-center gap-2">
          <span>Origem</span>
        </h2>

        {request.sourceMode === 'remote' ? (
          <div>
            <label className="block text-xs font-medium text-[#E6EDF3] mb-1">
              {t.sourceRepoLabel}
            </label>
            <div className="relative">
              <input
                type="text"
                value={request.sourceRepoUrl}
                onChange={(e) => updateField('sourceRepoUrl', e.target.value)}
                placeholder={t.sourceRepoPlaceholder}
                className={`w-full bg-[#0D1117] border rounded-md px-3 py-2 text-xs text-[#E6EDF3] focus:outline-none transition-colors ${
                  errors.sourceRepoUrl ? 'border-errorRed focus:border-errorRed' : 'border-[#30363D] focus:border-borderFocus'
                }`}
              />
            </div>
          </div>
        ) : (
          <div>
            <label className="block text-xs font-medium text-[#E6EDF3] mb-1">
              Pasta do Repositório Local (.git):
            </label>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <button
                type="button"
                onClick={onSelectLocalFolder}
                className="flex items-center justify-center gap-2 bg-[#21262D] hover:bg-[#30363D] border border-[#30363D] px-3.5 py-2 rounded-md text-xs font-medium text-[#E6EDF3] transition-colors shrink-0"
              >
                <Folder className="w-4 h-4 text-accentGreenBorder" />
                <span>{t.sourceLocalPickerBtn}</span>
              </button>
              <div className="flex-1 bg-[#0D1117] border border-[#30363D] rounded-md px-3 py-2 text-xs text-[#8B949E] truncate">
                {hasLocalDirectoryHandle ? (
                  <span className="text-accentGreenBorder font-medium flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {localFolderName || 'Pasta selecionada'}
                  </span>
                ) : (
                  <span>Nenhuma pasta selecionada</span>
                )}
              </div>
            </div>
            {errors.sourceRepoUrl && (
              <p className="text-[11px] text-errorRed mt-1">{errors.sourceRepoUrl}</p>
            )}
          </div>
        )}

        {/* Source PAT (Optional) */}
        {request.sourceMode === 'remote' && (
          <div>
            <label className="block text-xs font-medium text-[#E6EDF3] mb-1">
              {t.sourcePatTokenLabel}
            </label>
            <div className="relative">
              <input
                type={showSourcePat ? 'text' : 'password'}
                value={request.sourcePatToken || ''}
                onChange={(e) => updateField('sourcePatToken', e.target.value)}
                placeholder={t.sourcePatTokenPlaceholder}
                className="w-full bg-[#0D1117] border border-[#30363D] rounded-md px-3 py-2 pr-10 text-xs text-[#E6EDF3] focus:border-borderFocus focus:outline-none transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowSourcePat(!showSourcePat)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8B949E] hover:text-[#E6EDF3] p-1"
                aria-label={showSourcePat ? 'Ocultar token' : 'Exibir token'}
              >
                {showSourcePat ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        )}

        {/* Filter Original Email */}
        <div>
          <label className="block text-xs font-medium text-[#E6EDF3] mb-1">
            {t.originalEmailLabel}
          </label>
          <div className="relative">
            <input
              type="email"
              value={request.filterOriginalEmail}
              onChange={(e) => updateField('filterOriginalEmail', e.target.value)}
              placeholder={t.originalEmailPlaceholder}
              className={`w-full bg-[#0D1117] border rounded-md px-3 py-2 text-xs text-[#E6EDF3] focus:outline-none transition-colors ${
                errors.filterOriginalEmail ? 'border-errorRed focus:border-errorRed' : 'border-[#30363D] focus:border-borderFocus'
              }`}
            />
          </div>
        </div>
      </div>

      {/* Target Section */}
      <div className="bg-[#161B22] border border-[#30363D] rounded-lg p-4 space-y-3 shadow-sm">
        <h2 className="text-xs font-semibold text-[#8B949E] uppercase tracking-wider flex items-center gap-2">
          <span>Destino (Repositório Ghost)</span>
        </h2>

        {/* Target Remote URL */}
        <div>
          <label className="block text-xs font-medium text-[#E6EDF3] mb-1">
            {t.remoteUrlLabel}
          </label>
          <div className="relative">
            <input
              type="text"
              value={request.targetRemoteUrl}
              onChange={(e) => updateField('targetRemoteUrl', e.target.value)}
              placeholder={t.remoteUrlPlaceholder}
              className={`w-full bg-[#0D1117] border rounded-md px-3 py-2 text-xs text-[#E6EDF3] focus:outline-none transition-colors ${
                errors.targetRemoteUrl ? 'border-errorRed focus:border-errorRed' : 'border-[#30363D] focus:border-borderFocus'
              }`}
            />
          </div>
        </div>

        {/* Target PAT */}
        <div>
          <label className="block text-xs font-medium text-[#E6EDF3] mb-1 flex items-center gap-1.5">
            <Key className="w-3 h-3 text-brandBlue" />
            {t.patTokenLabel}
          </label>
          <div className="relative">
            <input
              type={showTargetPat ? 'text' : 'password'}
              value={request.targetPatToken}
              onChange={(e) => updateField('targetPatToken', e.target.value)}
              placeholder={t.patTokenPlaceholder}
              className={`w-full bg-[#0D1117] border rounded-md px-3 py-2 pr-10 text-xs text-[#E6EDF3] focus:outline-none transition-colors ${
                errors.targetPatToken ? 'border-errorRed focus:border-errorRed' : 'border-[#30363D] focus:border-borderFocus'
              }`}
            />
            <button
              type="button"
              onClick={() => setShowTargetPat(!showTargetPat)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8B949E] hover:text-[#E6EDF3] p-1"
              aria-label={showTargetPat ? 'Ocultar token' : 'Exibir token'}
            >
              {showTargetPat ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* New Author Info (2 columns on tablet/desktop) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-[#E6EDF3] mb-1 flex items-center gap-1.5">
              <User className="w-3 h-3 text-[#8B949E]" />
              {t.newNameLabel}
            </label>
            <input
              type="text"
              value={request.newAuthorName}
              onChange={(e) => updateField('newAuthorName', e.target.value)}
              placeholder={t.newNamePlaceholder}
              className={`w-full bg-[#0D1117] border rounded-md px-3 py-2 text-xs text-[#E6EDF3] focus:outline-none transition-colors ${
                errors.newAuthorName ? 'border-errorRed focus:border-errorRed' : 'border-[#30363D] focus:border-borderFocus'
              }`}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#E6EDF3] mb-1 flex items-center gap-1.5">
              <Mail className="w-3 h-3 text-[#8B949E]" />
              {t.newEmailLabel}
            </label>
            <input
              type="email"
              value={request.newAuthorEmail}
              onChange={(e) => updateField('newAuthorEmail', e.target.value)}
              placeholder={t.newEmailPlaceholder}
              className={`w-full bg-[#0D1117] border rounded-md px-3 py-2 text-xs text-[#E6EDF3] focus:outline-none transition-colors ${
                errors.newAuthorEmail ? 'border-errorRed focus:border-errorRed' : 'border-[#30363D] focus:border-borderFocus'
              }`}
            />
          </div>
        </div>
      </div>

      {/* Advanced Settings Checkbox */}
      <div className="bg-[#161B22] border border-[#30363D] rounded-lg p-3">
        <label className="flex items-start sm:items-center gap-2.5 cursor-pointer text-xs text-[#E6EDF3]">
          <input
            type="checkbox"
            checked={request.useAdvancedSettings}
            onChange={(e) => updateField('useAdvancedSettings', e.target.checked)}
            className="mt-0.5 sm:mt-0 accent-accentGreen rounded"
          />
          <div className="flex items-center gap-1.5">
            <Settings className="w-3.5 h-3.5 text-[#8B949E]" />
            <span>{t.useAdvancedSettingsLabel}</span>
          </div>
        </label>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-1">
        {/* Import/Export buttons */}
        <div className="flex items-center gap-2 order-2 sm:order-1">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImportConfig}
            accept=".json"
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium text-[#E6EDF3] bg-[#21262D] hover:bg-[#30363D] border border-[#30363D] transition-colors"
          >
            <Upload className="w-3.5 h-3.5 text-[#8B949E]" />
            <span>{t.importConfigButton}</span>
          </button>
          <button
            type="button"
            onClick={handleExportConfig}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium text-[#E6EDF3] bg-[#21262D] hover:bg-[#30363D] border border-[#30363D] transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-[#8B949E]" />
            <span>{t.exportConfigButton}</span>
          </button>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isProcessing}
          className="order-1 sm:order-2 flex items-center justify-center gap-2 px-6 py-2.5 rounded-md text-xs font-bold text-white bg-accentGreen hover:bg-accentGreenHover border border-accentGreenBorder shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {isProcessing ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>{t.processingButton}</span>
            </>
          ) : (
            <>
              <span>{t.migrateButton}</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </form>
  );
};

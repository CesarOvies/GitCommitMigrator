import React, { useRef, useEffect, useState } from 'react';
import { Terminal, Copy, Check, Trash2 } from 'lucide-react';
import { LogEntry, AppLanguage } from '../types';
import { getTranslation } from '../services/localization';

interface EventLogProps {
  logs: LogEntry[];
  onClear: () => void;
  lang: AppLanguage;
}

export const EventLog: React.FC<EventLogProps> = ({ logs, onClear, lang }) => {
  const t = getTranslation(lang);
  const logContainerRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  const handleCopy = async () => {
    if (logs.length === 0) return;
    const text = logs.map((l) => `[${l.timestamp}] [${l.type.toUpperCase()}] ${l.message}`).join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  if (logs.length === 0) {
    return null;
  }

  return (
    <div className="w-full bg-[#161B22] border border-[#30363D] rounded-lg overflow-hidden my-4 shadow-sm">
      {/* Header bar */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#21262D] border-b border-[#30363D] text-xs text-[#8B949E]">
        <div className="flex items-center gap-1.5 font-mono">
          <Terminal className="w-3.5 h-3.5 text-accentGreenBorder" />
          <span className="font-semibold text-[#E6EDF3]">Log de Execução</span>
          <span>({logs.length})</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-2 py-1 hover:bg-[#30363D] rounded text-[#E6EDF3] transition-colors"
            title={t.copyLogButton}
          >
            {copied ? <Check className="w-3.5 h-3.5 text-accentGreenBorder" /> : <Copy className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{copied ? t.logCopied : t.copyLogButton}</span>
          </button>
          <button
            onClick={onClear}
            className="flex items-center gap-1 px-2 py-1 hover:bg-[#30363D] rounded text-[#8B949E] hover:text-errorRed transition-colors"
            title={t.clearLogButton}
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t.clearLogButton}</span>
          </button>
        </div>
      </div>

      {/* Log body */}
      <div
        ref={logContainerRef}
        tabIndex={0}
        aria-label="Log de Execução"
        className="p-3 font-mono text-[11px] sm:text-xs leading-relaxed max-h-52 overflow-y-auto space-y-1 bg-[#0D1117]/80 focus:outline-none focus:ring-1 focus:ring-borderFocus"
      >
        {logs.map((log) => {
          let colorClass = 'text-[#E6EDF3]';
          if (log.type === 'success') colorClass = 'text-accentGreenBorder font-semibold';
          if (log.type === 'error') colorClass = 'text-errorRed font-semibold';
          if (log.type === 'warn') colorClass = 'text-yellow-400';

          return (
            <div key={log.id} className="flex items-start gap-2 break-words">
              <span className="text-[#8B949E] shrink-0 select-none">[{log.timestamp}]</span>
              <span className={colorClass}>{log.message}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};


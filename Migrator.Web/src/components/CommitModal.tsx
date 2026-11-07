import React, { useState, useMemo } from 'react';
import { Calendar, CheckSquare, Square, X, Filter } from 'lucide-react';
import { CommitMetadata, AppLanguage } from '../types';
import { getTranslation } from '../services/localization';

interface CommitModalProps {
  isOpen: boolean;
  commits: CommitMetadata[];
  onConfirm: (selected: CommitMetadata[]) => void;
  onCancel: () => void;
  lang: AppLanguage;
}

type SelectionMode = 'all' | 'single' | 'period';

export const CommitModal: React.FC<CommitModalProps> = ({
  isOpen,
  commits,
  onConfirm,
  onCancel,
  lang
}) => {
  const t = getTranslation(lang);
  const [mode, setMode] = useState<SelectionMode>('all');
  const [selectedSingleIndex, setSelectedSingleIndex] = useState<number>(0);

  // Default dates from commits range
  const { minDate, maxDate } = useMemo(() => {
    if (commits.length === 0) return { minDate: '', maxDate: '' };
    const dates = commits.map((c) => new Date(c.when).toISOString().split('T')[0]);
    dates.sort();
    return { minDate: dates[0], maxDate: dates[dates.length - 1] };
  }, [commits]);

  const [startDate, setStartDate] = useState<string>(minDate);
  const [endDate, setEndDate] = useState<string>(maxDate);
  const [checkedSet, setCheckedSet] = useState<Set<number>>(new Set(commits.map((_, i) => i)));

  if (!isOpen) return null;

  const handleModeChange = (newMode: SelectionMode) => {
    setMode(newMode);
    if (newMode === 'all') {
      setCheckedSet(new Set(commits.map((_, i) => i)));
    } else if (newMode === 'single') {
      setCheckedSet(new Set([selectedSingleIndex]));
    } else if (newMode === 'period') {
      applyPeriodFilter(startDate || minDate, endDate || maxDate);
    }
  };

  const applyPeriodFilter = (start: string, end: string) => {
    if (!start || !end) return;
    const startTs = new Date(`${start}T00:00:00`).getTime();
    const endTs = new Date(`${end}T23:59:59`).getTime();

    const newSet = new Set<number>();
    commits.forEach((c, idx) => {
      const commitTs = new Date(c.when).getTime();
      if (commitTs >= startTs && commitTs <= endTs) {
        newSet.add(idx);
      }
    });
    setCheckedSet(newSet);
  };

  const toggleCommit = (index: number) => {
    const next = new Set(checkedSet);
    if (next.has(index)) {
      next.delete(index);
    } else {
      next.add(index);
    }
    setCheckedSet(next);
  };

  const handleConfirm = () => {
    const selected = commits.filter((_, idx) => checkedSet.has(idx));
    onConfirm(selected);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#161B22] border border-[#30363D] w-full max-w-3xl rounded-xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#30363D] bg-[#21262D]">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-accentGreenBorder" />
            <h2 className="text-sm sm:text-base font-semibold text-[#E6EDF3]">
              {t.commitSelectionTitle}
            </h2>
          </div>
          <button
            onClick={onCancel}
            aria-label={t.cancelSelectionButton}
            className="text-[#8B949E] hover:text-[#E6EDF3] p-1 rounded-md hover:bg-[#30363D] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto space-y-4">
          <p className="text-xs sm:text-sm text-[#8B949E]">
            {t.commitSelectionHeader.replace('{0}', String(commits.length))}
          </p>

          {/* Mode Radio Options */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <label
              className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer text-xs transition-colors ${
                mode === 'all'
                  ? 'border-brandBlue bg-brandBlue/10 text-white font-medium'
                  : 'border-[#30363D] bg-[#0D1117] text-[#8B949E] hover:border-[#8B949E]'
              }`}
            >
              <input
                type="radio"
                name="selectionMode"
                checked={mode === 'all'}
                onChange={() => handleModeChange('all')}
                className="accent-brandBlue"
              />
              <span>{t.selectAllCommitsOption}</span>
            </label>

            <label
              className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer text-xs transition-colors ${
                mode === 'single'
                  ? 'border-brandBlue bg-brandBlue/10 text-white font-medium'
                  : 'border-[#30363D] bg-[#0D1117] text-[#8B949E] hover:border-[#8B949E]'
              }`}
            >
              <input
                type="radio"
                name="selectionMode"
                checked={mode === 'single'}
                onChange={() => handleModeChange('single')}
                className="accent-brandBlue"
              />
              <span>{t.selectSingleCommitOption}</span>
            </label>

            <label
              className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer text-xs transition-colors ${
                mode === 'period'
                  ? 'border-brandBlue bg-brandBlue/10 text-white font-medium'
                  : 'border-[#30363D] bg-[#0D1117] text-[#8B949E] hover:border-[#8B949E]'
              }`}
            >
              <input
                type="radio"
                name="selectionMode"
                checked={mode === 'period'}
                onChange={() => handleModeChange('period')}
                className="accent-brandBlue"
              />
              <span>{t.selectByPeriodOption}</span>
            </label>
          </div>

          {/* Period Date Pickers (if period mode) */}
          {mode === 'period' && (
            <div className="p-3 bg-[#0D1117] border border-[#30363D] rounded-lg grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-[#8B949E] mb-1 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  {t.periodStartDateLabel}
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    applyPeriodFilter(e.target.value, endDate);
                  }}
                  className="w-full bg-[#161B22] border border-[#30363D] rounded px-2.5 py-1.5 text-xs text-[#E6EDF3] focus:border-borderFocus focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-[#8B949E] mb-1 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  {t.periodEndDateLabel}
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    applyPeriodFilter(startDate, e.target.value);
                  }}
                  className="w-full bg-[#161B22] border border-[#30363D] rounded px-2.5 py-1.5 text-xs text-[#E6EDF3] focus:border-borderFocus focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* Commit List Table */}
          <div className="border border-[#30363D] rounded-lg overflow-hidden bg-[#0D1117]">
            <div className="max-h-60 overflow-y-auto divide-y divide-[#30363D]">
              {commits.map((commit, idx) => {
                const isChecked = checkedSet.has(idx);
                const dateStr = new Date(commit.when).toLocaleString();

                return (
                  <div
                    key={idx}
                    onClick={() => {
                      if (mode === 'single') {
                        setSelectedSingleIndex(idx);
                        setCheckedSet(new Set([idx]));
                      } else {
                        toggleCommit(idx);
                      }
                    }}
                    className={`flex items-start gap-2.5 p-2.5 text-xs cursor-pointer transition-colors ${
                      isChecked ? 'bg-brandBlue/10' : 'hover:bg-[#161B22]'
                    }`}
                  >
                    <div className="shrink-0 mt-0.5 text-[#8B949E]">
                      {isChecked ? (
                        <CheckSquare className="w-4 h-4 text-accentGreenBorder" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[#E6EDF3] font-medium truncate">{commit.message}</div>
                      <div className="text-[11px] text-[#8B949E] flex items-center gap-2 mt-0.5">
                        <span>{dateStr}</span>
                        {commit.sha && (
                          <span className="font-mono text-[10px] bg-[#21262D] px-1 rounded border border-[#30363D]">
                            {commit.sha.substring(0, 7)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Selection counter */}
          <div className="text-xs text-right font-medium text-[#8B949E]">
            {t.selectedCommitsCountLabel
              .replace('{0}', String(checkedSet.size))
              .replace('{1}', String(commits.length))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-[#30363D] bg-[#21262D]">
          <button
            onClick={onCancel}
            className="px-3.5 py-1.5 rounded-md text-xs font-medium text-[#E6EDF3] bg-[#21262D] hover:bg-[#30363D] border border-[#30363D] transition-colors"
          >
            {t.cancelSelectionButton}
          </button>
          <button
            onClick={handleConfirm}
            disabled={checkedSet.size === 0}
            className="px-4 py-1.5 rounded-md text-xs font-semibold text-white bg-accentGreen hover:bg-accentGreenHover border border-accentGreenBorder transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            {t.confirmSelectionButton}
          </button>
        </div>
      </div>
    </div>
  );
};


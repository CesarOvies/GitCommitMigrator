import React from 'react';
import { MigrationProgress } from '../types';

interface ProgressBarProps {
  progress: MigrationProgress | null;
  isProcessing: boolean;
  processingText?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ progress, isProcessing, processingText }) => {
  if (!isProcessing && !progress) {
    return null;
  }

  const percentage = Math.min(100, Math.max(0, progress?.percentage ?? 0));
  const statusText = progress?.statusText || (isProcessing ? (processingText || '...') : '');

  return (
    <div className="w-full bg-[#161B22] border border-[#30363D] rounded-lg p-3 sm:p-4 my-4 shadow-sm animate-fade-in">
      <div className="flex items-center justify-between text-xs text-[#8B949E] mb-1.5">
        <span className="font-medium text-[#E6EDF3] truncate max-w-[80%]">{statusText}</span>
        <span className="font-mono font-bold text-accentGreenBorder">{percentage}%</span>
      </div>
      <div className="w-full h-2.5 bg-[#21262D] rounded-full overflow-hidden">
        <div
          className="h-full bg-[#238636] transition-all duration-300 ease-out rounded-full relative"
          style={{ width: `${percentage}%` }}
        >
          {isProcessing && (
            <div className="absolute inset-0 bg-white/20 animate-pulse rounded-full" />
          )}
        </div>
      </div>
      {progress?.currentStep !== undefined && progress?.totalSteps !== undefined && (
        <div className="text-[11px] text-[#8B949E] mt-1 text-right">
          {progress.currentStep} / {progress.totalSteps}
        </div>
      )}
    </div>
  );
};


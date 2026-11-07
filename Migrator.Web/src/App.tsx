import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { MigrationForm } from './components/MigrationForm';
import { CommitModal } from './components/CommitModal';
import { ProgressBar } from './components/ProgressBar';
import { EventLog } from './components/EventLog';
import {
  AppLanguage,
  RunMigrationRequest,
  MigrationProgress,
  LogEntry,
  CommitMetadata
} from './types';
import { getTranslation } from './services/localization';
import { validateMigrationRequest } from './services/validator';
import { fetchRemoteCommits, fetchRemoteBranches, pushGhostCommits } from './services/github-api';
import { extractCommitsFromLocalDirectory, listLocalBranches } from './services/git-local';
import { ShieldCheck, Sparkles, ExternalLink } from 'lucide-react';

export const App: React.FC = () => {
  const [lang, setLang] = useState<AppLanguage>('pt-BR');
  const t = getTranslation(lang);

  useEffect(() => {
    document.title = `${t.windowTitle} Web`;
    document.documentElement.lang = lang;
  }, [lang, t.windowTitle]);

  const [request, setRequest] = useState<RunMigrationRequest>({
    sourceMode: 'remote',
    sourceRepoUrl: '',
    sourcePatToken: '',
    filterOriginalEmail: '',
    targetRemoteUrl: '',
    targetPatToken: '',
    newAuthorName: '',
    newAuthorEmail: '',
    useAdvancedSettings: false
  });

  const [localDirHandle, setLocalDirHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [localFolderName, setLocalFolderName] = useState<string>('');
  const [availableBranches, setAvailableBranches] = useState<string[]>([]);
  const [isFetchingBranches, setIsFetchingBranches] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<MigrationProgress | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  // Advanced selection state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [extractedCommits, setExtractedCommits] = useState<CommitMetadata[]>([]);
  const [successUrl, setSuccessUrl] = useState<string | null>(null);

  const addLog = (message: string, type: 'info' | 'success' | 'warn' | 'error' = 'info') => {
    const entry: LogEntry = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toLocaleTimeString(),
      message,
      type
    };
    setLogs((prev) => [...prev, entry]);
  };

  const handleSelectLocalFolder = async () => {
    if (!('showDirectoryPicker' in window)) {
      alert(t.errFsApiUnsupported);
      return;
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const handle = await (window as any).showDirectoryPicker({
        mode: 'read'
      });
      setLocalDirHandle(handle);
      setLocalFolderName(handle.name);
      addLog(t.sourceLocalFolderSelected.replace('{0}', handle.name), 'info');
      // clear error if any
      setErrors((prev) => {
        const next = { ...prev };
        delete next.sourceRepoUrl;
        return next;
      });

      try {
        const branches = await listLocalBranches(handle, t);
        setAvailableBranches(branches);
        if (branches.length > 0) {
          addLog(t.fetchBranchesSuccess.replace('{0}', String(branches.length)), 'info');
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        addLog(`${t.fetchBranchesError}: ${msg}`, 'warn');
      }
    } catch {
      // User cancelled picker
    }
  };

  const handleFetchRemoteBranches = async () => {
    if (!request.sourceRepoUrl.trim()) {
      setErrors((prev) => ({ ...prev, sourceRepoUrl: t.errSourceEmpty }));
      return;
    }
    setIsFetchingBranches(true);
    addLog(t.fetchingBranches, 'info');
    try {
      const branches = await fetchRemoteBranches(
        request.sourceRepoUrl,
        request.sourcePatToken,
        t,
        (count) => {
          if (count % 100 === 0) {
            addLog(`${t.fetchingBranches} (${count}...)`, 'info');
          }
        }
      );
      setAvailableBranches(branches);
      addLog(t.fetchBranchesSuccess.replace('{0}', String(branches.length)), 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      addLog(`${t.fetchBranchesError}: ${msg}`, 'error');
    } finally {
      setIsFetchingBranches(false);
    }
  };

  const executePush = async (commits: CommitMetadata[]) => {
    try {
      addLog(t.logStartingReconstruction.replace('{0}', String(commits.length)), 'info');
      const result = await pushGhostCommits(
        request.targetRemoteUrl,
        request.targetPatToken,
        commits,
        request.newAuthorName,
        request.newAuthorEmail,
        (p) => setProgress(p),
        t
      );

      addLog(t.logMigrationSuccess.replace('{0}', String(result.totalMigrated)), 'success');
      addLog(t.logFinalCommitSha.replace('{0}', result.finalCommitSha), 'info');
      setSuccessUrl(result.branchUrl);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      addLog(t.logPushError.replace('{0}', msg), 'error');
      alert(`${t.errorMessagePrefix} ${msg}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStartMigration = async () => {
    setSuccessUrl(null);
    const validation = validateMigrationRequest(request, lang, Boolean(localDirHandle));
    if (!validation.isValid) {
      setErrors(validation.errors);
      addLog(t.logValidationFailed, 'warn');
      return;
    }
    setErrors({});
    setIsProcessing(true);
    setProgress({ percentage: 5, statusText: t.statusExtractingCommits });

    addLog(t.statusStartMigration, 'info');
    addLog(t.logEmailFilter.replace('{0}', request.filterOriginalEmail), 'info');
    addLog(t.logNewAuthor.replace('{0}', request.newAuthorName).replace('{1}', request.newAuthorEmail), 'info');

    let extracted: CommitMetadata[] = [];
    let totalScanned = 0;

    try {
      if (request.sourceMode === 'local' && localDirHandle) {
        addLog(t.logReadingLocalRepo.replace('{0}', localDirHandle.name), 'info');
        const res = await extractCommitsFromLocalDirectory(
          localDirHandle,
          request.filterOriginalEmail,
          (count) => setProgress({ percentage: 10, statusText: t.statusCommitsFoundCount.replace('{0}', String(count)) }),
          t,
          request.sourceBranch
        );
        extracted = res.commits;
        totalScanned = res.totalFound;
      } else {
        addLog(t.logFetchingRemoteCommits.replace('{0}', request.sourceRepoUrl), 'info');
        const res = await fetchRemoteCommits(
          request.sourceRepoUrl,
          request.filterOriginalEmail,
          request.sourcePatToken,
          (count) => setProgress({ percentage: 10, statusText: t.statusCommitsFoundCount.replace('{0}', String(count)) }),
          t,
          request.sourceBranch
        );
        extracted = res.commits;
        totalScanned = res.totalFound;
      }

      addLog(t.logTotalScanned.replace('{0}', String(totalScanned)), 'info');
      addLog(t.logMatchingCommits.replace('{0}', String(extracted.length)), 'info');

      if (extracted.length === 0) {
        addLog(t.errNoCommitsSelected, 'warn');
        alert(t.errNoCommitsSelected);
        setIsProcessing(false);
        setProgress(null);
        return;
      }

      // Check advanced settings
      if (request.useAdvancedSettings) {
        addLog(t.logOpeningAdvancedModal, 'info');
        setExtractedCommits(extracted);
        setIsModalOpen(true);
        // Modal confirm will trigger executePush
        return;
      }

      // Otherwise, migrate all extracted commits directly
      await executePush(extracted);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      addLog(t.logExtractionError.replace('{0}', msg), 'error');
      alert(`${t.errorMessagePrefix} ${msg}`);
      setIsProcessing(false);
      setProgress(null);
    }
  };

  const handleModalConfirm = (selected: CommitMetadata[]) => {
    setIsModalOpen(false);
    addLog(t.logSelectionConfirmed.replace('{0}', String(selected.length)), 'info');
    executePush(selected);
  };

  const handleModalCancel = () => {
    setIsModalOpen(false);
    setIsProcessing(false);
    setProgress(null);
    addLog(t.statusCanceled, 'warn');
  };

  return (
    <div className="min-h-screen bg-[#0D1117] text-[#E6EDF3] flex flex-col font-sans selection:bg-brandBlue selection:text-white">
      {/* Header */}
      <Header currentLang={lang} onLanguageChange={setLang} />

      {/* Main Content */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-5 sm:py-8 sm:px-6">
        {/* Intro Banner */}
        <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-[#161B22] to-[#21262D] border border-[#30363D] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-accentGreenBorder" />
              <h2 className="text-sm font-semibold text-[#E6EDF3]">
                {t.introBannerTitle}
              </h2>
            </div>
            <p className="text-xs text-[#8B949E] leading-relaxed">
              {t.introBannerText.split('{0}').map((part, i, arr) => (
                <React.Fragment key={i}>
                  {part}
                  {i < arr.length - 1 && <strong>ghost commits</strong>}
                </React.Fragment>
              ))}
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-[#8B949E] bg-[#0D1117]/80 px-2.5 py-1 rounded-md border border-[#30363D] self-start sm:self-auto shrink-0">
            <ShieldCheck className="w-3.5 h-3.5 text-accentGreenBorder" />
            <span>{t.clientSideBadge}</span>
          </div>
        </div>

        {/* Success Alert Banner */}
        {successUrl && (
          <div className="mb-6 p-4 rounded-xl bg-accentGreen/15 border border-accentGreenBorder text-xs text-[#E6EDF3] animate-fade-in flex items-center justify-between gap-3 shadow-md">
            <div className="space-y-1">
              <div className="font-bold text-accentGreenBorder flex items-center gap-2 text-sm">
                <Sparkles className="w-4 h-4" />
                <span>{t.successMessage}</span>
              </div>
              <p className="text-[#8B949E]">
                {t.successBannerDescription}
              </p>
            </div>
            <a
              href={successUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-accentGreen hover:bg-accentGreenHover text-white text-xs font-semibold shrink-0 transition-colors"
            >
              <span>{t.viewCommitsButton}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        )}

        {/* Migration Form Card */}
        <MigrationForm
          request={request}
          onChange={setRequest}
          onSubmit={handleStartMigration}
          isProcessing={isProcessing}
          errors={errors}
          lang={lang}
          localFolderName={localFolderName}
          onSelectLocalFolder={handleSelectLocalFolder}
          hasLocalDirectoryHandle={Boolean(localDirHandle)}
          availableBranches={availableBranches}
          isFetchingBranches={isFetchingBranches}
          onFetchRemoteBranches={handleFetchRemoteBranches}
        />

        {/* Progress Bar */}
        <ProgressBar
          progress={progress}
          isProcessing={isProcessing}
          processingText={t.processingButton}
        />

        {/* Console Event Log */}
        <EventLog logs={logs} onClear={() => setLogs([])} lang={lang} />

        {/* Advanced Commit Selection Modal */}
        <CommitModal
          isOpen={isModalOpen}
          commits={extractedCommits}
          onConfirm={handleModalConfirm}
          onCancel={handleModalCancel}
          lang={lang}
        />
      </main>

      {/* Footer */}
      <footer className="border-t border-[#30363D] bg-[#161B22] py-4 px-4 text-center text-xs text-[#8B949E]">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>{t.footerLicense.replace('{0}', String(new Date().getFullYear()))}</span>
          <div className="flex items-center gap-3">
            <a
              href="https://github.com/CesarOvies/GitCommitMigrator"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#E6EDF3] transition-colors"
            >
              GitHub
            </a>
            <span>•</span>
            <span className="text-[11px] text-[#8B949E]">{t.footerSubtitle}</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;

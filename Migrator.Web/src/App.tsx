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
import { ShieldCheck, Sparkles, ExternalLink, Lock, Download, HelpCircle, GitCommit, Layers, Terminal } from 'lucide-react';

export const App: React.FC = () => {
  const [lang, setLang] = useState<AppLanguage>('pt-BR');
  const t = getTranslation(lang);

  useEffect(() => {
    document.title = `${t.windowTitle} — ${t.headerSubtitle}`;
    document.documentElement.lang = lang;
    const descMeta = document.querySelector('meta[name="description"]');
    if (descMeta) {
      descMeta.setAttribute('content', t.metaDescription);
    }
  }, [lang, t.windowTitle, t.headerSubtitle, t.metaDescription]);

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
        {/* Hero / Intro Banner */}
        <section
          aria-labelledby="hero-heading"
          className="mb-6 p-4 sm:p-5 rounded-xl bg-gradient-to-r from-[#161B22] to-[#21262D] border border-[#30363D] shadow-sm space-y-3"
        >
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-accentGreenBorder shrink-0" aria-hidden="true" />
                <h2 id="hero-heading" className="text-sm sm:text-base font-semibold text-[#E6EDF3]">
                  {t.introBannerTitle}
                </h2>
              </div>
              <p className="text-xs text-[#8B949E] leading-relaxed">
                {t.introBannerText.split('{0}').map((part, i, arr) => (
                  <React.Fragment key={i}>
                    {part}
                    {i < arr.length - 1 && <strong className="text-[#E6EDF3]">ghost commits</strong>}
                  </React.Fragment>
                ))}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 shrink-0">
              <span className="inline-flex items-center gap-1.5 text-[11px] text-[#E6EDF3] bg-[#0D1117]/90 px-2.5 py-1 rounded-md border border-[#30363D]">
                <ShieldCheck className="w-3.5 h-3.5 text-accentGreenBorder" aria-hidden="true" />
                <span>{t.clientSideBadge}</span>
              </span>
              <span className="inline-flex items-center gap-1.5 text-[11px] text-[#E6EDF3] bg-[#0D1117]/90 px-2.5 py-1 rounded-md border border-[#30363D]">
                <Lock className="w-3.5 h-3.5 text-brandBlue" aria-hidden="true" />
                <span>{t.zeroCodeLeakBadge}</span>
              </span>
            </div>
          </div>

          <div className="pt-2 border-t border-[#30363D]/70 flex flex-wrap items-center justify-between gap-2 text-xs">
            <a
              href="#how-it-works"
              className="inline-flex items-center gap-1.5 text-[#58A6FF] hover:text-[#79C0FF] font-medium transition-colors"
            >
              <HelpCircle className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{t.learnMoreBtn}</span>
            </a>
            <a
              href="https://github.com/CesarOvies/GitCommitMigrator/releases"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#21262D] hover:bg-[#30363D] border border-[#30363D] text-[#E6EDF3] text-[11px] font-medium transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-accentGreenBorder" aria-hidden="true" />
              <span>{t.downloadDesktopBtn}</span>
            </a>
          </div>
        </section>

        {/* Success Alert Banner */}
        {successUrl && (
          <div className="mb-6 p-4 rounded-xl bg-accentGreen/15 border border-accentGreenBorder text-xs text-[#E6EDF3] animate-fade-in flex items-center justify-between gap-3 shadow-md">
            <div className="space-y-1">
              <div className="font-bold text-accentGreenBorder flex items-center gap-2 text-sm">
                <Sparkles className="w-4 h-4" aria-hidden="true" />
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
              <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
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

        {/* Landing Page Showcase: How It Works, Use Cases & FAQ */}
        <div className="mt-12 space-y-10 border-t border-[#30363D] pt-8">
          {/* How It Works (3 Steps) */}
          <section id="how-it-works" aria-labelledby="how-it-works-heading" className="space-y-4">
            <h2 id="how-it-works-heading" className="text-base sm:text-lg font-bold text-[#E6EDF3] flex items-center gap-2">
              <GitCommit className="w-5 h-5 text-accentGreenBorder shrink-0" aria-hidden="true" />
              <span>{t.howItWorksTitle}</span>
            </h2>
            <ol className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <li className="bg-[#161B22] border border-[#30363D] rounded-lg p-4 space-y-1.5">
                <h3 className="text-xs font-bold text-[#E6EDF3]">{t.howItWorksStep1Title}</h3>
                <p className="text-xs text-[#8B949E] leading-relaxed">{t.howItWorksStep1Desc}</p>
              </li>
              <li className="bg-[#161B22] border border-[#30363D] rounded-lg p-4 space-y-1.5">
                <h3 className="text-xs font-bold text-[#E6EDF3]">{t.howItWorksStep2Title}</h3>
                <p className="text-xs text-[#8B949E] leading-relaxed">{t.howItWorksStep2Desc}</p>
              </li>
              <li className="bg-[#161B22] border border-[#30363D] rounded-lg p-4 space-y-1.5">
                <h3 className="text-xs font-bold text-[#E6EDF3]">{t.howItWorksStep3Title}</h3>
                <p className="text-xs text-[#8B949E] leading-relaxed">{t.howItWorksStep3Desc}</p>
              </li>
            </ol>
          </section>

          {/* Use Cases */}
          <section id="use-cases" aria-labelledby="use-cases-heading" className="space-y-4">
            <h2 id="use-cases-heading" className="text-base sm:text-lg font-bold text-[#E6EDF3] flex items-center gap-2">
              <Layers className="w-5 h-5 text-brandBlue shrink-0" aria-hidden="true" />
              <span>{t.useCasesTitle}</span>
            </h2>
            <ul className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <li className="bg-[#161B22] border border-[#30363D] rounded-lg p-4 space-y-1.5">
                <h3 className="text-xs font-bold text-[#E6EDF3]">{t.useCase1Title}</h3>
                <p className="text-xs text-[#8B949E] leading-relaxed">{t.useCase1Desc}</p>
              </li>
              <li className="bg-[#161B22] border border-[#30363D] rounded-lg p-4 space-y-1.5">
                <h3 className="text-xs font-bold text-[#E6EDF3]">{t.useCase2Title}</h3>
                <p className="text-xs text-[#8B949E] leading-relaxed">{t.useCase2Desc}</p>
              </li>
              <li className="bg-[#161B22] border border-[#30363D] rounded-lg p-4 space-y-1.5">
                <h3 className="text-xs font-bold text-[#E6EDF3]">{t.useCase3Title}</h3>
                <p className="text-xs text-[#8B949E] leading-relaxed">{t.useCase3Desc}</p>
              </li>
            </ul>
          </section>

          {/* Semantic FAQ with Native <details name="faq-accordion"> */}
          <section id="faq" aria-labelledby="faq-heading" className="space-y-4">
            <h2 id="faq-heading" className="text-base sm:text-lg font-bold text-[#E6EDF3] flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-accentGreenBorder shrink-0" aria-hidden="true" />
              <span>{t.faqTitle}</span>
            </h2>
            <div className="space-y-2.5">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              <details {...({ name: 'faq-accordion' } as any)} open className="bg-[#161B22] border border-[#30363D] rounded-lg px-4 py-3">
                <summary className="text-xs font-semibold text-[#E6EDF3] cursor-pointer select-none">
                  {t.faqQ1}
                </summary>
                <p className="mt-2 text-xs text-[#8B949E] leading-relaxed">{t.faqA1}</p>
              </details>
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              <details {...({ name: 'faq-accordion' } as any)} className="bg-[#161B22] border border-[#30363D] rounded-lg px-4 py-3">
                <summary className="text-xs font-semibold text-[#E6EDF3] cursor-pointer select-none">
                  {t.faqQ2}
                </summary>
                <p className="mt-2 text-xs text-[#8B949E] leading-relaxed">{t.faqA2}</p>
              </details>
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              <details {...({ name: 'faq-accordion' } as any)} className="bg-[#161B22] border border-[#30363D] rounded-lg px-4 py-3">
                <summary className="text-xs font-semibold text-[#E6EDF3] cursor-pointer select-none">
                  {t.faqQ3}
                </summary>
                <p className="mt-2 text-xs text-[#8B949E] leading-relaxed">{t.faqA3}</p>
              </details>
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              <details {...({ name: 'faq-accordion' } as any)} className="bg-[#161B22] border border-[#30363D] rounded-lg px-4 py-3">
                <summary className="text-xs font-semibold text-[#E6EDF3] cursor-pointer select-none">
                  {t.faqQ4}
                </summary>
                <p className="mt-2 text-xs text-[#8B949E] leading-relaxed">{t.faqA4}</p>
              </details>
            </div>
          </section>

          {/* Search & AI Discovery Keywords Block */}
          <section aria-labelledby="seo-tags-heading" className="bg-[#161B22]/60 border border-[#30363D] rounded-lg p-3.5 space-y-1.5">
            <h2 id="seo-tags-heading" className="text-[11px] font-semibold text-[#8B949E] uppercase tracking-wider flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-[#8B949E]" aria-hidden="true" />
              <span>{t.seoTagsTitle}</span>
            </h2>
            <p className="text-[11px] text-[#8B949E] leading-relaxed">
              {t.seoTagsList}
            </p>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#30363D] bg-[#161B22] py-4 px-4 text-center text-xs text-[#8B949E]">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>{t.footerLicense.replace('{0}', String(new Date().getFullYear()))}</span>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <a
              href="https://github.com/CesarOvies/GitCommitMigrator"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#E6EDF3] transition-colors"
            >
              GitHub
            </a>
            <span>•</span>
            <a
              href="https://github.com/CesarOvies/GitCommitMigrator/releases"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#E6EDF3] transition-colors"
            >
              Releases (.exe)
            </a>
            <span>•</span>
            <a
              href="./llms.txt"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#E6EDF3] transition-colors"
            >
              {t.llmsLinkLabel}
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

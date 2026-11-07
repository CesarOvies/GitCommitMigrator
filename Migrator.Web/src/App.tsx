import React, { useState } from 'react';
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
import { fetchRemoteCommits, pushGhostCommits } from './services/github-api';
import { extractCommitsFromLocalDirectory } from './services/git-local';
import { ShieldCheck, Sparkles, ExternalLink } from 'lucide-react';

export const App: React.FC = () => {
  const [lang, setLang] = useState<AppLanguage>('pt-BR');
  const t = getTranslation(lang);

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
      alert('Seu navegador não suporta a File System Access API. Use um navegador baseado em Chromium (Chrome, Edge, Brave) ou utilize o modo Repositório Remoto.');
      return;
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const handle = await (window as any).showDirectoryPicker({
        mode: 'read'
      });
      setLocalDirHandle(handle);
      setLocalFolderName(handle.name);
      addLog(`Pasta selecionada: ${handle.name}`, 'info');
      // clear error if any
      setErrors((prev) => {
        const next = { ...prev };
        delete next.sourceRepoUrl;
        return next;
      });
    } catch {
      // User cancelled picker
    }
  };

  const executePush = async (commits: CommitMetadata[]) => {
    try {
      addLog(`Iniciando reconstrução de ${commits.length} ghost commits no repositório de destino...`, 'info');
      const result = await pushGhostCommits(
        request.targetRemoteUrl,
        request.targetPatToken,
        commits,
        request.newAuthorName,
        request.newAuthorEmail,
        (p) => setProgress(p)
      );

      addLog(`Sucesso! ${result.totalMigrated} commits migrados para a branch main.`, 'success');
      addLog(`Commit SHA final: ${result.finalCommitSha}`, 'info');
      setSuccessUrl(result.branchUrl);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      addLog(`Erro ao enviar commits: ${msg}`, 'error');
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
      addLog('Validação falhou. Verifique os campos destacados.', 'warn');
      return;
    }
    setErrors({});
    setIsProcessing(true);
    setProgress({ percentage: 5, statusText: t.statusExtractingCommits });

    addLog('=== INÍCIO DA MIGRAÇÃO ===', 'info');
    addLog(`Filtro de e-mail: ${request.filterOriginalEmail}`, 'info');
    addLog(`Novo autor: ${request.newAuthorName} <${request.newAuthorEmail}>`, 'info');

    let extracted: CommitMetadata[] = [];
    let totalScanned = 0;

    try {
      if (request.sourceMode === 'local' && localDirHandle) {
        addLog(`Lendo repositório local em: ${localDirHandle.name}...`, 'info');
        const res = await extractCommitsFromLocalDirectory(
          localDirHandle,
          request.filterOriginalEmail,
          (count) => setProgress({ percentage: 10, statusText: `Encontrados ${count} commits...` })
        );
        extracted = res.commits;
        totalScanned = res.totalFound;
      } else {
        addLog(`Consultando commits remotos em: ${request.sourceRepoUrl}...`, 'info');
        const res = await fetchRemoteCommits(
          request.sourceRepoUrl,
          request.filterOriginalEmail,
          request.sourcePatToken,
          (count) => setProgress({ percentage: 10, statusText: `Encontrados ${count} commits...` })
        );
        extracted = res.commits;
        totalScanned = res.totalFound;
      }

      addLog(`Total de commits escaneados: ${totalScanned}`, 'info');
      addLog(`Commits correspondentes ao filtro: ${extracted.length}`, 'info');

      if (extracted.length === 0) {
        addLog('Nenhum commit encontrado para o e-mail informado.', 'warn');
        alert(t.errNoCommitsSelected);
        setIsProcessing(false);
        setProgress(null);
        return;
      }

      // Check advanced settings
      if (request.useAdvancedSettings) {
        addLog('Abrindo modal de seleção avançada...', 'info');
        setExtractedCommits(extracted);
        setIsModalOpen(true);
        // Modal confirm will trigger executePush
        return;
      }

      // Otherwise, migrate all extracted commits directly
      await executePush(extracted);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      addLog(`Erro durante extração: ${msg}`, 'error');
      alert(`${t.errorMessagePrefix} ${msg}`);
      setIsProcessing(false);
      setProgress(null);
    }
  };

  const handleModalConfirm = (selected: CommitMetadata[]) => {
    setIsModalOpen(false);
    addLog(`Seleção confirmada: ${selected.length} commits escolhidos.`, 'info');
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
                Preserve seu histórico e métricas com segurança
              </h2>
            </div>
            <p className="text-xs text-[#8B949E] leading-relaxed">
              Recrie suas contribuições em repositórios remotos usando <strong>ghost commits</strong> (commits vazios).
              O código-fonte nunca é transmitido.
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-[#8B949E] bg-[#0D1117]/80 px-2.5 py-1 rounded-md border border-[#30363D] self-start sm:self-auto shrink-0">
            <ShieldCheck className="w-3.5 h-3.5 text-accentGreenBorder" />
            <span>100% Client-Side</span>
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
                Seus commits vazios foram sincronizados na branch main do repositório destino.
              </p>
            </div>
            <a
              href={successUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-accentGreen hover:bg-accentGreenHover text-white text-xs font-semibold shrink-0 transition-colors"
            >
              <span>Ver Commits</span>
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
        />

        {/* Progress Bar */}
        <ProgressBar progress={progress} isProcessing={isProcessing} />

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
          <span>Git Commit Migrator &copy; {new Date().getFullYear()} — MIT License</span>
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
            <span className="text-[11px] text-[#8B949E]">Web &amp; Desktop</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;


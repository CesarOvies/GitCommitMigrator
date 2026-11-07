import { AppLanguage } from '../types';

export interface Translations {
  windowTitle: string;
  headerSubtitle: string;
  sourceModeLabel: string;
  sourceModeRemote: string;
  sourceModeLocal: string;
  sourceSectionHeader: string;
  sourceRepoLabel: string;
  sourceRepoPlaceholder: string;
  sourceLocalFolderLabel: string;
  sourceLocalPickerBtn: string;
  sourceLocalFolderSelected: string;
  noFolderSelectedText: string;
  folderSelectedFallback: string;
  sourcePatTokenLabel: string;
  sourcePatTokenPlaceholder: string;
  targetSectionHeader: string;
  remoteUrlLabel: string;
  remoteUrlPlaceholder: string;
  originalEmailLabel: string;
  originalEmailPlaceholder: string;
  newNameLabel: string;
  newNamePlaceholder: string;
  newEmailLabel: string;
  newEmailPlaceholder: string;
  patTokenLabel: string;
  patTokenPlaceholder: string;
  hideTokenLabel: string;
  showTokenLabel: string;
  migrateButton: string;
  processingButton: string;
  languageLabel: string;
  validationSummaryHeader: string;
  validationSummaryTitle: string;
  successMessage: string;
  successTitle: string;
  errorMessagePrefix: string;
  errorTitle: string;
  errSourceEmpty: string;
  errSourceInvalid: string;
  errRemoteUrlEmpty: string;
  errRemoteUrlInvalid: string;
  errOriginalEmailEmpty: string;
  errOriginalEmailInvalid: string;
  errNewNameEmpty: string;
  errNewEmailEmpty: string;
  errNewEmailInvalid: string;
  errPatEmpty: string;
  statusExtractingCommits: string;
  statusReconstructingHistory: string;
  statusPushingToRemote: string;
  statusCompleted: string;
  statusVerifyingTarget: string;
  statusInitialCommit: string;
  statusStartMigration: string;
  statusCommitsFoundCount: string;
  useAdvancedSettingsLabel: string;
  commitSelectionTitle: string;
  commitSelectionHeader: string;
  selectAllCommitsOption: string;
  selectSingleCommitOption: string;
  selectByPeriodOption: string;
  periodStartDateLabel: string;
  periodEndDateLabel: string;
  selectedCommitsCountLabel: string;
  confirmSelectionButton: string;
  cancelSelectionButton: string;
  errInvalidPeriodRange: string;
  errNoCommitsSelected: string;
  statusCanceled: string;
  exportConfigButton: string;
  importConfigButton: string;
  importErrorMessage: string;
  clearLogButton: string;
  copyLogButton: string;
  logCopied: string;
  repoLinkText: string;
  mobileWarningTitle: string;
  mobileWarningText: string;
  introBannerTitle: string;
  introBannerText: string;
  clientSideBadge: string;
  successBannerDescription: string;
  viewCommitsButton: string;
  executionLogTitle: string;
  errFsApiUnsupported: string;
  logEmailFilter: string;
  logNewAuthor: string;
  logReadingLocalRepo: string;
  logFetchingRemoteCommits: string;
  logTotalScanned: string;
  logMatchingCommits: string;
  logOpeningAdvancedModal: string;
  logStartingReconstruction: string;
  logMigrationSuccess: string;
  logFinalCommitSha: string;
  logPushError: string;
  logExtractionError: string;
  logValidationFailed: string;
  logSelectionConfirmed: string;
  errNoValidGitRepo: string;
  errReadingLocalHistory: string;
  errInvalidRepoUrl: string;
  errInvalidTargetRepoUrl: string;
  errPatInvalidOrExpired: string;
  errRepoNotFoundOrPrivate: string;
  errRateLimitExceeded: string;
  errFetchCommitsFailed: string;
  sourceBranchLabel: string;
  sourceBranchAll: string;
  fetchBranchesButton: string;
  fetchingBranches: string;
  fetchBranchesSuccess: string;
  fetchBranchesError: string;
  filterBranchesPlaceholder: string;
  footerLicense: string;
  footerSubtitle: string;
  metaDescription: string;
  zeroCodeLeakBadge: string;
  downloadDesktopBtn: string;
  learnMoreBtn: string;
  howItWorksTitle: string;
  howItWorksStep1Title: string;
  howItWorksStep1Desc: string;
  howItWorksStep2Title: string;
  howItWorksStep2Desc: string;
  howItWorksStep3Title: string;
  howItWorksStep3Desc: string;
  useCasesTitle: string;
  useCase1Title: string;
  useCase1Desc: string;
  useCase2Title: string;
  useCase2Desc: string;
  useCase3Title: string;
  useCase3Desc: string;
  faqTitle: string;
  faqQ1: string;
  faqA1: string;
  faqQ2: string;
  faqA2: string;
  faqQ3: string;
  faqA3: string;
  faqQ4: string;
  faqA4: string;
  seoTagsTitle: string;
  seoTagsList: string;
  llmsLinkLabel: string;
}

export const translations: Record<AppLanguage, Translations> = {
  'pt-BR': {
    windowTitle: "Git Commit Migrator",
    headerSubtitle: "Ghost Commits e Preservação do Gráfico de Atividades",
    sourceModeLabel: "Modo de Origem:",
    sourceModeRemote: "Repositório Remoto (GitHub / GitLab)",
    sourceModeLocal: "Pasta Local (.git no Navegador)",
    sourceSectionHeader: "Origem",
    sourceRepoLabel: "Repositório de Origem (URL Remota):",
    sourceRepoPlaceholder: "Ex: https://github.com/org/repo-privado",
    sourceLocalFolderLabel: "Pasta do Repositório Local (.git):",
    sourceLocalPickerBtn: "Escolher Pasta Local...",
    sourceLocalFolderSelected: "Pasta selecionada: {0}",
    noFolderSelectedText: "Nenhuma pasta selecionada",
    folderSelectedFallback: "Pasta selecionada",
    sourcePatTokenLabel: "Token de Origem (PAT - Opcional se público):",
    sourcePatTokenPlaceholder: "Opcional (necessário para repo privado)",
    targetSectionHeader: "Destino (Repositório Ghost)",
    remoteUrlLabel: "URL do Repositório Remoto de Destino:",
    remoteUrlPlaceholder: "Ex: https://github.com/seu-usuario/historico-migrado",
    originalEmailLabel: "E-mail Original (Filtro dos Commits):",
    originalEmailPlaceholder: "Ex: seu.nome@empresa-antiga.com",
    newNameLabel: "Nome do Novo Autor:",
    newNamePlaceholder: "Ex: Seu Nome",
    newEmailLabel: "E-mail do Novo Autor:",
    newEmailPlaceholder: "Ex: seu.email@pessoal.com",
    patTokenLabel: "Token de Acesso Pessoal de Destino (PAT):",
    patTokenPlaceholder: "Ex: ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    hideTokenLabel: "Ocultar token",
    showTokenLabel: "Exibir token",
    migrateButton: "Executar Migração",
    processingButton: "Processando...",
    languageLabel: "Idioma:",
    validationSummaryHeader: "Corrija os campos abaixo antes de continuar:",
    validationSummaryTitle: "Campos Inválidos",
    successMessage: "Migração concluída com sucesso!",
    successTitle: "Sucesso",
    errorMessagePrefix: "Erro na migração:",
    errorTitle: "Erro",
    errSourceEmpty: "Informe a URL remota ou selecione a pasta local do repositório de origem.",
    errSourceInvalid: "Informe uma URL remota válida (https://github.com/usuario/repo) ou pasta com .git.",
    errRemoteUrlEmpty: "Informe a URL do repositório remoto de destino.",
    errRemoteUrlInvalid: "Informe uma URL válida do GitHub (ex: https://github.com/usuario/repo).",
    errOriginalEmailEmpty: "Informe o e-mail original usado nos commits.",
    errOriginalEmailInvalid: "Informe um endereço de e-mail original válido (ex: autor@empresa.com).",
    errNewNameEmpty: "Informe o nome do novo autor.",
    errNewEmailEmpty: "Informe o e-mail do novo autor.",
    errNewEmailInvalid: "Informe um endereço de e-mail válido para o novo autor (ex: voce@email.com).",
    errPatEmpty: "Informe o Personal Access Token (PAT) de destino para autenticar.",
    statusExtractingCommits: "Extraindo commits do repositório de origem...",
    statusReconstructingHistory: "Criando ghost commits ({0}/{1})...",
    statusPushingToRemote: "Atualizando branch remota no GitHub...",
    statusCompleted: "Migração concluída com sucesso!",
    statusVerifyingTarget: "Verificando repositório de destino...",
    statusInitialCommit: "Criando commit inicial (MIGRATION_INFO.md)...",
    statusStartMigration: "=== INÍCIO DA MIGRAÇÃO ===",
    statusCommitsFoundCount: "Encontrados {0} commits...",
    useAdvancedSettingsLabel: "Configurações avançadas (filtrar commits por período ou selecionar individualmente)",
    commitSelectionTitle: "Seleção Avançada de Commits",
    commitSelectionHeader: "{0} commit(s) encontrados para o e-mail. Escolha como deseja migrar:",
    selectAllCommitsOption: "Selecionar todos os commits",
    selectSingleCommitOption: "Selecionar apenas 1 commit",
    selectByPeriodOption: "Selecionar por período",
    periodStartDateLabel: "Data Inicial:",
    periodEndDateLabel: "Data Final:",
    selectedCommitsCountLabel: "Commits selecionados: {0} de {1}",
    confirmSelectionButton: "Confirmar Seleção",
    cancelSelectionButton: "Cancelar",
    errInvalidPeriodRange: "A data inicial não pode ser maior que a data final.",
    errNoCommitsSelected: "Nenhum commit encontrado para os critérios selecionados.",
    statusCanceled: "Migração cancelada pelo usuário.",
    exportConfigButton: "Exportar Config",
    importConfigButton: "Importar Config",
    importErrorMessage: "Erro ao importar configurações. Arquivo JSON inválido.",
    clearLogButton: "Limpar Logs",
    copyLogButton: "Copiar Logs",
    logCopied: "Logs copiados para a área de transferência!",
    repoLinkText: "Código-Fonte",
    mobileWarningTitle: "Dica Mobile",
    mobileWarningText: "No celular, use o modo 'Repositório Remoto' digitando a URL do seu repositório GitHub de origem.",
    introBannerTitle: "Preserve seu histórico e métricas com segurança",
    introBannerText: "Recrie suas contribuições em repositórios remotos usando {0} (commits vazios). O código-fonte nunca é transmitido.",
    clientSideBadge: "100% Client-Side",
    successBannerDescription: "Seus commits vazios foram sincronizados na branch main do repositório destino.",
    viewCommitsButton: "Ver Commits",
    executionLogTitle: "Log de Execução",
    errFsApiUnsupported: "Seu navegador não suporta a File System Access API. Use um navegador baseado em Chromium (Chrome, Edge, Brave) ou utilize o modo Repositório Remoto.",
    logEmailFilter: "Filtro de e-mail: {0}",
    logNewAuthor: "Novo autor: {0} <{1}>",
    logReadingLocalRepo: "Lendo repositório local em: {0}...",
    logFetchingRemoteCommits: "Consultando commits remotos em: {0}...",
    logTotalScanned: "Total de commits escaneados: {0}",
    logMatchingCommits: "Commits correspondentes ao filtro: {0}",
    logOpeningAdvancedModal: "Abrindo modal de seleção avançada...",
    logStartingReconstruction: "Iniciando reconstrução de {0} ghost commits no repositório de destino...",
    logMigrationSuccess: "Sucesso! {0} commits migrados para a branch main.",
    logFinalCommitSha: "Commit SHA final: {0}",
    logPushError: "Erro ao enviar commits: {0}",
    logExtractionError: "Erro durante extração: {0}",
    logValidationFailed: "Validação falhou. Verifique os campos destacados.",
    logSelectionConfirmed: "Seleção confirmada: {0} commits escolhidos.",
    errNoValidGitRepo: "A pasta selecionada não contém um repositório Git válido (.git não encontrado).",
    errReadingLocalHistory: "Erro ao ler histórico do repositório local: {0}",
    errInvalidRepoUrl: "URL do repositório inválida: {0}",
    errInvalidTargetRepoUrl: "URL do repositório de destino inválida: {0}",
    errPatInvalidOrExpired: "Token de acesso (PAT) inválido ou expirado.",
    errRepoNotFoundOrPrivate: "Repositório não encontrado ou privado: {0}. Se for privado, informe um PAT de origem.",
    errRateLimitExceeded: "Limite de requisições da API do GitHub atingido (Rate Limit). Use um PAT para aumentar o limite.",
    errFetchCommitsFailed: "Falha ao consultar commits do GitHub ({0}): {1}",
    sourceBranchLabel: "Branch de Origem (Opcional):",
    sourceBranchAll: "(Todas as branches)",
    fetchBranchesButton: "Buscar Branches",
    fetchingBranches: "Buscando branches...",
    fetchBranchesSuccess: "{0} branch(es) carregada(s).",
    fetchBranchesError: "Não foi possível carregar as branches do repositório.",
    filterBranchesPlaceholder: "Filtrar branches...",
    footerLicense: "Git Commit Migrator © {0} — Licença MIT",
    footerSubtitle: "Web & Desktop",
    metaDescription: "Migre o histórico de commits do seu e-mail corporativo para seu GitHub pessoal usando Ghost Commits (commits vazios). Preserve seu gráfico de contribuições (green squares) sem expor código proprietário.",
    zeroCodeLeakBadge: "Zero Vazamento de Código",
    downloadDesktopBtn: "Baixar App Windows (.exe)",
    learnMoreBtn: "Como Funciona & FAQ",
    howItWorksTitle: "Como Funciona a Migração por Ghost Commits",
    howItWorksStep1Title: "1. Extração por E-mail",
    howItWorksStep1Desc: "Lê o repositório de origem (URL remota do GitHub ou pasta .git local) e filtra apenas a data/hora e mensagem dos commits assinados pelo seu e-mail corporativo ou antigo.",
    howItWorksStep2Title: "2. Reconstrução Vazia (Ghost Commits)",
    howItWorksStep2Desc: "Recria cada commit com árvore vazia (AllowEmptyCommit) usando seu novo nome e e-mail pessoal. Nenhum arquivo, código-fonte, diff ou segredo é copiado.",
    howItWorksStep3Title: "3. Push Inteligente (Sem Force Push)",
    howItWorksStep3Desc: "Sincroniza os novos commits no topo da branch main do repositório de destino, ignorando duplicatas já migradas e preservando o histórico existente.",
    useCasesTitle: "Quando Usar o Git Commit Migrator?",
    useCase1Title: "Saída de Empresa ou Consultoria",
    useCase1Desc: "Mantenha seus quadradinhos verdes (gráfico de contribuições do GitHub) ativos no perfil pessoal após encerrar contratos em organizações privadas, em total conformidade com NDAs.",
    useCase2Title: "GitLab, Bitbucket e Azure DevOps → GitHub",
    useCase2Desc: "Unifique contribuições feitas em outros provedores Git clonando o repositório localmente e migrando os metadados pelo navegador ou app Desktop.",
    useCase3Title: "Execução 100% Client-Side ou Desktop Portátil",
    useCase3Desc: "Use direto no navegador (celular ou PC) sem servidor intermediário, ou baixe o executável portátil para Windows (.NET 8 + LibGit2Sharp com proteção DPAPI).",
    faqTitle: "Perguntas Frequentes (FAQ)",
    faqQ1: "O que é um Ghost Commit e como ele preenche o gráfico do GitHub?",
    faqA1: "Um Ghost Commit é um commit Git legítimo que contém autor, data/hora original (When) e mensagem, mas nenhuma alteração de arquivos (tree vazia). O GitHub lê o timestamp e o e-mail verificado na sua conta para acender os quadradinhos verdes no seu perfil.",
    faqQ2: "Existe risco de vazar código proprietário ou arquivos da empresa?",
    faqA2: "Não. Tanto na versão Web (via Git Database API) quanto na Desktop (via LibGit2Sharp AllowEmptyCommit = true), nenhum arquivo ou diff é lido ou transmitido para o repositório de destino.",
    faqQ3: "Como exibir contribuições de um repositório de destino privado no meu perfil?",
    faqA3: "Você pode manter o repositório de destino como Privado no GitHub. Basta ativar a opção 'Include private contributions on my profile' nas configurações do seu perfil do GitHub.",
    faqQ4: "Posso rodar a migração mais de uma vez no mesmo repositório?",
    faqA4: "Sim! O migrador verifica os commits já presentes na branch main do destino e envia apenas os commits novos, sem usar force push e sem duplicar entradas.",
    seoTagsTitle: "Tópicos e Casos de Uso Relacionados",
    seoTagsList: "migrar commits github • ghost commits • commits vazios • transferir contribuições trabalho para conta pessoal • manter quadradinhos verdes github • github contribution graph • sync gitlab bitbucket azure devops to github • preservar histórico git sem expor código",
    llmsLinkLabel: "Contexto para IA (llms.txt)"
  },
  'en-US': {
    windowTitle: "Git Commit Migrator",
    headerSubtitle: "Ghost Commits & Activity Graph Preservation",
    sourceModeLabel: "Source Mode:",
    sourceModeRemote: "Remote Repository (GitHub / GitLab)",
    sourceModeLocal: "Local Folder (.git in Browser)",
    sourceSectionHeader: "Source",
    sourceRepoLabel: "Source Repository (Remote URL):",
    sourceRepoPlaceholder: "E.g. https://github.com/org/private-repo",
    sourceLocalFolderLabel: "Local Repository Folder (.git):",
    sourceLocalPickerBtn: "Choose Local Folder...",
    sourceLocalFolderSelected: "Selected folder: {0}",
    noFolderSelectedText: "No folder selected",
    folderSelectedFallback: "Folder selected",
    sourcePatTokenLabel: "Source Token (PAT - Optional if public):",
    sourcePatTokenPlaceholder: "Optional (required for private repo)",
    targetSectionHeader: "Target (Ghost Repository)",
    remoteUrlLabel: "Target Remote Repository URL:",
    remoteUrlPlaceholder: "E.g. https://github.com/your-user/migrated-history",
    originalEmailLabel: "Original Email (Commit Filter):",
    originalEmailPlaceholder: "E.g. your.name@old-company.com",
    newNameLabel: "New Author Name:",
    newNamePlaceholder: "E.g. Your Name",
    newEmailLabel: "New Author Email:",
    newEmailPlaceholder: "E.g. your.email@personal.com",
    patTokenLabel: "Target Personal Access Token (PAT):",
    patTokenPlaceholder: "E.g. ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    hideTokenLabel: "Hide token",
    showTokenLabel: "Show token",
    migrateButton: "Run Migration",
    processingButton: "Processing...",
    languageLabel: "Language:",
    validationSummaryHeader: "Please fix the following fields before continuing:",
    validationSummaryTitle: "Invalid Fields",
    successMessage: "Migration completed successfully!",
    successTitle: "Success",
    errorMessagePrefix: "Migration error:",
    errorTitle: "Error",
    errSourceEmpty: "Enter the remote URL or select the local source folder.",
    errSourceInvalid: "Enter a valid remote URL (https://github.com/user/repo) or folder with .git.",
    errRemoteUrlEmpty: "Enter the target remote repository URL.",
    errRemoteUrlInvalid: "Enter a valid GitHub URL (e.g. https://github.com/user/repo).",
    errOriginalEmailEmpty: "Enter the original email used in commits.",
    errOriginalEmailInvalid: "Enter a valid original email address (e.g. author@company.com).",
    errNewNameEmpty: "Enter the new author name.",
    errNewEmailEmpty: "Enter the new author email.",
    errNewEmailInvalid: "Enter a valid email address for the new author (e.g. you@email.com).",
    errPatEmpty: "Enter the target Personal Access Token (PAT) for authentication.",
    statusExtractingCommits: "Extracting commits from source repository...",
    statusReconstructingHistory: "Creating ghost commits ({0}/{1})...",
    statusPushingToRemote: "Updating remote branch on GitHub...",
    statusCompleted: "Migration completed successfully!",
    statusVerifyingTarget: "Checking target repository...",
    statusInitialCommit: "Creating initial commit (MIGRATION_INFO.md)...",
    statusStartMigration: "=== MIGRATION START ===",
    statusCommitsFoundCount: "Found {0} commits...",
    useAdvancedSettingsLabel: "Advanced settings (filter commits by period or select individually)",
    commitSelectionTitle: "Advanced Commit Selection",
    commitSelectionHeader: "{0} commit(s) found for the email. Choose how to migrate:",
    selectAllCommitsOption: "Select all commits",
    selectSingleCommitOption: "Select only 1 commit",
    selectByPeriodOption: "Select by period",
    periodStartDateLabel: "Start Date:",
    periodEndDateLabel: "End Date:",
    selectedCommitsCountLabel: "Selected commits: {0} of {1}",
    confirmSelectionButton: "Confirm Selection",
    cancelSelectionButton: "Cancel",
    errInvalidPeriodRange: "Start date cannot be after end date.",
    errNoCommitsSelected: "No commits found for the selected criteria.",
    statusCanceled: "Migration canceled by user.",
    exportConfigButton: "Export Config",
    importConfigButton: "Import Config",
    importErrorMessage: "Error importing configuration. Invalid JSON file.",
    clearLogButton: "Clear Logs",
    copyLogButton: "Copy Logs",
    logCopied: "Logs copied to clipboard!",
    repoLinkText: "Source Code",
    mobileWarningTitle: "Mobile Tip",
    mobileWarningText: "On mobile devices, use the 'Remote Repository' mode with your source GitHub repository URL.",
    introBannerTitle: "Securely preserve your history and metrics",
    introBannerText: "Recreate your contributions in remote repositories using {0} (empty commits). Source code is never transmitted.",
    clientSideBadge: "100% Client-Side",
    successBannerDescription: "Your ghost commits have been synchronized to the main branch of the target repository.",
    viewCommitsButton: "View Commits",
    executionLogTitle: "Execution Log",
    errFsApiUnsupported: "Your browser does not support the File System Access API. Use a Chromium-based browser (Chrome, Edge, Brave) or use Remote Repository mode.",
    logEmailFilter: "Email filter: {0}",
    logNewAuthor: "New author: {0} <{1}>",
    logReadingLocalRepo: "Reading local repository at: {0}...",
    logFetchingRemoteCommits: "Querying remote commits at: {0}...",
    logTotalScanned: "Total commits scanned: {0}",
    logMatchingCommits: "Commits matching filter: {0}",
    logOpeningAdvancedModal: "Opening advanced selection modal...",
    logStartingReconstruction: "Starting reconstruction of {0} ghost commits in target repository...",
    logMigrationSuccess: "Success! {0} commits migrated to main branch.",
    logFinalCommitSha: "Final commit SHA: {0}",
    logPushError: "Error pushing commits: {0}",
    logExtractionError: "Error during extraction: {0}",
    logValidationFailed: "Validation failed. Please check highlighted fields.",
    logSelectionConfirmed: "Selection confirmed: {0} commits chosen.",
    errNoValidGitRepo: "Selected folder does not contain a valid Git repository (.git not found).",
    errReadingLocalHistory: "Error reading local repository history: {0}",
    errInvalidRepoUrl: "Invalid repository URL: {0}",
    errInvalidTargetRepoUrl: "Invalid target repository URL: {0}",
    errPatInvalidOrExpired: "Access token (PAT) invalid or expired.",
    errRepoNotFoundOrPrivate: "Repository not found or private: {0}. If private, provide a source PAT.",
    errRateLimitExceeded: "GitHub API rate limit exceeded. Provide a PAT to increase rate limit.",
    errFetchCommitsFailed: "Failed to fetch GitHub commits ({0}): {1}",
    sourceBranchLabel: "Source Branch (Optional):",
    sourceBranchAll: "(All branches)",
    fetchBranchesButton: "Fetch Branches",
    fetchingBranches: "Fetching branches...",
    fetchBranchesSuccess: "{0} branch(es) loaded.",
    fetchBranchesError: "Could not fetch branches from the repository.",
    filterBranchesPlaceholder: "Filter branches...",
    footerLicense: "Git Commit Migrator © {0} — MIT License",
    footerSubtitle: "Web & Desktop",
    metaDescription: "Migrate work Git commit history to your personal GitHub contribution graph using empty Ghost Commits. Keep your green squares when leaving a company without exposing proprietary source code.",
    zeroCodeLeakBadge: "Zero Code Exposure",
    downloadDesktopBtn: "Download Windows App (.exe)",
    learnMoreBtn: "How It Works & FAQ",
    howItWorksTitle: "How Ghost Commit Migration Works",
    howItWorksStep1Title: "1. Extract by Author Email",
    howItWorksStep1Desc: "Scans the source repository (remote GitHub URL or local .git folder) and extracts only the timestamp and message of commits authored by your corporate or old email.",
    howItWorksStep2Title: "2. Empty Reconstruction (Ghost Commits)",
    howItWorksStep2Desc: "Recreates each commit with an empty file tree (AllowEmptyCommit) signed with your personal name and email. Zero files, source code, diffs, or secrets are copied.",
    howItWorksStep3Title: "3. Smart Replay Push (No Force Push)",
    howItWorksStep3Desc: "Appends new ghost commits on top of the target repository's main branch, automatically skipping existing duplicates and preserving prior history.",
    useCasesTitle: "When to Use Git Commit Migrator?",
    useCase1Title: "Leaving a Job or Consultancy",
    useCase1Desc: "Keep your GitHub contribution graph (green squares) active on your personal profile after leaving private corporate organizations, in full compliance with NDAs.",
    useCase2Title: "GitLab, Bitbucket & Azure DevOps → GitHub",
    useCase2Desc: "Consolidate contributions from external Git hosts by cloning the repository locally and migrating commit metadata via browser or Desktop app.",
    useCase3Title: "100% Client-Side Web or Portable Desktop",
    useCase3Desc: "Run directly in your browser (mobile or desktop) with zero backend servers, or use the self-contained Windows portable executable (.NET 8 + LibGit2Sharp with DPAPI protection).",
    faqTitle: "Frequently Asked Questions (FAQ)",
    faqQ1: "What is a Ghost Commit and how does it fill the GitHub contribution graph?",
    faqA1: "A Ghost Commit is a valid Git commit containing an author signature, original timestamp (When), and commit message, but an empty file tree (zero file changes). GitHub reads the timestamp and your verified email to light up the green squares on your profile.",
    faqQ2: "Is there any risk of leaking proprietary company code or secrets?",
    faqA2: "No. Both the Web app (via Git Database API) and Desktop app (via LibGit2Sharp AllowEmptyCommit = true) never read, stage, or transmit source files or diffs to the target repository.",
    faqQ3: "How do I show contributions from a private target repository on my profile?",
    faqA3: "You can keep your target ghost repository Private on GitHub. Simply enable 'Include private contributions on my profile' in your GitHub account profile settings.",
    faqQ4: "Can I run the migration multiple times into the same target repository?",
    faqA4: "Yes! The migrator inspects existing commits on the target main branch and only replays new commits, without force-pushing or creating duplicates.",
    seoTagsTitle: "Related Topics & Use Cases",
    seoTagsList: "git commit migrator • ghost commits • empty commits • transfer work commits to personal github • keep github green squares when leaving job • github contribution graph sync • gitlab bitbucket azure devops to github • preserve git history without code",
    llmsLinkLabel: "AI Context (llms.txt)"
  },
  'es': {
    windowTitle: "Git Commit Migrator",
    headerSubtitle: "Ghost Commits y Preservación del Gráfico de Actividad",
    sourceModeLabel: "Modo de Origen:",
    sourceModeRemote: "Repositorio Remoto (GitHub / GitLab)",
    sourceModeLocal: "Carpeta Local (.git en el Navegador)",
    sourceSectionHeader: "Origen",
    sourceRepoLabel: "Repositorio de Origen (URL Remota):",
    sourceRepoPlaceholder: "Ej: https://github.com/org/repo-privado",
    sourceLocalFolderLabel: "Carpeta del Repositorio Local (.git):",
    sourceLocalPickerBtn: "Elegir Carpeta Local...",
    sourceLocalFolderSelected: "Carpeta seleccionada: {0}",
    noFolderSelectedText: "Ninguna carpeta seleccionada",
    folderSelectedFallback: "Carpeta seleccionada",
    sourcePatTokenLabel: "Token de Origen (PAT - Opcional si es público):",
    sourcePatTokenPlaceholder: "Opcional (requerido para repo privado)",
    targetSectionHeader: "Destino (Repositorio Ghost)",
    remoteUrlLabel: "URL del Repositorio Remoto de Destino:",
    remoteUrlPlaceholder: "Ej: https://github.com/tu-usuario/historial-migrado",
    originalEmailLabel: "Correo Original (Filtro de Commits):",
    originalEmailPlaceholder: "Ej: tu.nombre@empresa-anterior.com",
    newNameLabel: "Nombre del Nuevo Autor:",
    newNamePlaceholder: "Ej: Tu Nombre",
    newEmailLabel: "Correo del Nuevo Autor:",
    newEmailPlaceholder: "Ej: tu.correo@personal.com",
    patTokenLabel: "Token de Acceso Personal de Destino (PAT):",
    patTokenPlaceholder: "Ej: ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    hideTokenLabel: "Ocultar token",
    showTokenLabel: "Mostrar token",
    migrateButton: "Ejecutar Migración",
    processingButton: "Procesando...",
    languageLabel: "Idioma:",
    validationSummaryHeader: "Corrija los siguientes campos antes de continuar:",
    validationSummaryTitle: "Campos Inválidos",
    successMessage: "¡Migración completada con éxito!",
    successTitle: "Éxito",
    errorMessagePrefix: "Error en la migración:",
    errorTitle: "Error",
    errSourceEmpty: "Ingrese la URL remota o elija la carpeta local de origen.",
    errSourceInvalid: "Ingrese una URL remota válida (https://github.com/usuario/repo) o carpeta con .git.",
    errRemoteUrlEmpty: "Ingrese la URL del repositorio remoto de destino.",
    errRemoteUrlInvalid: "Ingrese una URL válida de GitHub (ej: https://github.com/usuario/repo).",
    errOriginalEmailEmpty: "Ingrese el correo original utilizado en los commits.",
    errOriginalEmailInvalid: "Ingrese una dirección de correo original válida (ej: autor@empresa.com).",
    errNewNameEmpty: "Ingrese el nombre del nuevo autor.",
    errNewEmailEmpty: "Ingrese el correo del nuevo autor.",
    errNewEmailInvalid: "Ingrese una dirección de correo válida para el nuevo autor (ej: tu@correo.com).",
    errPatEmpty: "Ingrese el Personal Access Token (PAT) de destino para autenticar.",
    statusExtractingCommits: "Extrayendo commits del repositorio de origen...",
    statusReconstructingHistory: "Creando ghost commits ({0}/{1})...",
    statusPushingToRemote: "Actualizando rama remota en GitHub...",
    statusCompleted: "¡Migración completada con éxito!",
    statusVerifyingTarget: "Verificando repositorio de destino...",
    statusInitialCommit: "Creando commit inicial (MIGRATION_INFO.md)...",
    statusStartMigration: "=== INICIO DE LA MIGRACIÓN ===",
    statusCommitsFoundCount: "Encontrados {0} commits...",
    useAdvancedSettingsLabel: "Configuración avanzada (filtrar commits por período o individualmente)",
    commitSelectionTitle: "Selección Avanzada de Commits",
    commitSelectionHeader: "{0} commit(s) encontrados para el correo. Elija cómo migrar:",
    selectAllCommitsOption: "Seleccionar todos los commits",
    selectSingleCommitOption: "Seleccionar solo 1 commit",
    selectByPeriodOption: "Seleccionar por período",
    periodStartDateLabel: "Fecha Inicial:",
    periodEndDateLabel: "Fecha Final:",
    selectedCommitsCountLabel: "Commits seleccionados: {0} de {1}",
    confirmSelectionButton: "Confirmar Selección",
    cancelSelectionButton: "Cancelar",
    errInvalidPeriodRange: "La fecha inicial no puede ser mayor que la fecha final.",
    errNoCommitsSelected: "No se encontraron commits para los criterios seleccionados.",
    statusCanceled: "Migración cancelada por el usuario.",
    exportConfigButton: "Exportar Config",
    importConfigButton: "Importar Config",
    importErrorMessage: "Error al importar la configuración. Archivo JSON no válido.",
    clearLogButton: "Limpiar Logs",
    copyLogButton: "Copiar Logs",
    logCopied: "¡Logs copiados al portapapeles!",
    repoLinkText: "Código Fuente",
    mobileWarningTitle: "Consejo Móvil",
    mobileWarningText: "En dispositivos móviles, use el modo 'Repositorio Remoto' con la URL de su repositorio GitHub de origen.",
    introBannerTitle: "Preserve su historial y métricas con seguridad",
    introBannerText: "Recree sus contribuciones en repositorios remotos usando {0} (commits vacíos). El código fuente nunca se transmite.",
    clientSideBadge: "100% Client-Side",
    successBannerDescription: "Sus commits vacíos han sido sincronizados en la rama main del repositorio destino.",
    viewCommitsButton: "Ver Commits",
    executionLogTitle: "Registro de Ejecución",
    errFsApiUnsupported: "Su navegador no admite la File System Access API. Utilice un navegador basado en Chromium (Chrome, Edge, Brave) o use el modo Repositorio Remoto.",
    logEmailFilter: "Filtro de correo: {0}",
    logNewAuthor: "Nuevo autor: {0} <{1}>",
    logReadingLocalRepo: "Leyendo repositorio local en: {0}...",
    logFetchingRemoteCommits: "Consultando commits remotos en: {0}...",
    logTotalScanned: "Total de commits escaneados: {0}",
    logMatchingCommits: "Commits correspondientes al filtro: {0}",
    logOpeningAdvancedModal: "Abriendo modal de selección avanzada...",
    logStartingReconstruction: "Iniciando reconstrucción de {0} ghost commits en el repositorio destino...",
    logMigrationSuccess: "¡Éxito! {0} commits migrados a la rama main.",
    logFinalCommitSha: "Commit SHA final: {0}",
    logPushError: "Error al enviar commits: {0}",
    logExtractionError: "Error durante la extracción: {0}",
    logValidationFailed: "Falló la validación. Verifique los campos resaltados.",
    logSelectionConfirmed: "Selección confirmada: {0} commits elegidos.",
    errNoValidGitRepo: "La carpeta seleccionada no contiene un repositorio Git válido (.git no encontrado).",
    errReadingLocalHistory: "Error al leer el historial del repositorio local: {0}",
    errInvalidRepoUrl: "URL del repositorio no válida: {0}",
    errInvalidTargetRepoUrl: "URL del repositorio de destino no válida: {0}",
    errPatInvalidOrExpired: "Token de acceso (PAT) no válido o expirado.",
    errRepoNotFoundOrPrivate: "Repositorio no encontrado o privado: {0}. Si es privado, ingrese un PAT de origen.",
    errRateLimitExceeded: "Límite de solicitudes de la API de GitHub alcanzado (Rate Limit). Use un PAT para aumentar el límite.",
    errFetchCommitsFailed: "Error al consultar commits de GitHub ({0}): {1}",
    sourceBranchLabel: "Rama de Origen (Opcional):",
    sourceBranchAll: "(Todas las ramas)",
    fetchBranchesButton: "Buscar Ramas",
    fetchingBranches: "Buscando ramas...",
    fetchBranchesSuccess: "{0} rama(s) cargada(s).",
    fetchBranchesError: "No se pudieron cargar las ramas del repositorio.",
    filterBranchesPlaceholder: "Filtrar ramas...",
    footerLicense: "Git Commit Migrator © {0} — Licencia MIT",
    footerSubtitle: "Web y Desktop",
    metaDescription: "Migra el historial de commits de tu correo corporativo a tu cuenta personal de GitHub usando Ghost Commits (commits vacíos). Conserva tu gráfico de contribuciones sin exponer código privado.",
    zeroCodeLeakBadge: "Cero Fuga de Código",
    downloadDesktopBtn: "Descargar App Windows (.exe)",
    learnMoreBtn: "Cómo Funciona y FAQ",
    howItWorksTitle: "Cómo Funciona la Migración con Ghost Commits",
    howItWorksStep1Title: "1. Extracción por Correo",
    howItWorksStep1Desc: "Lee el repositorio de origen (URL remota de GitHub o carpeta .git local) y filtra solo la fecha/hora y el mensaje de los commits firmados con tu correo corporativo o anterior.",
    howItWorksStep2Title: "2. Reconstrucción Vacía (Ghost Commits)",
    howItWorksStep2Desc: "Recrea cada commit con un árbol vacío (AllowEmptyCommit) bajo tu nuevo nombre y correo personal. Ningún archivo, código fuente, diff ni secreto es copiado.",
    howItWorksStep3Title: "3. Push Inteligente (Sin Force Push)",
    howItWorksStep3Desc: "Sincroniza los nuevos commits sobre la rama main del repositorio de destino, omitiendo duplicados ya migrados y preservando el historial existente.",
    useCasesTitle: "¿Cuándo Usar Git Commit Migrator?",
    useCase1Title: "Cambio de Empresa o Consultoría",
    useCase1Desc: "Mantén tus cuadros verdes (gráfico de contribuciones de GitHub) activos en tu perfil personal tras salir de organizaciones privadas, cumpliendo con acuerdos de confidencialidad (NDA).",
    useCase2Title: "GitLab, Bitbucket y Azure DevOps → GitHub",
    useCase2Desc: "Unifica contribuciones de otros proveedores Git clonando el repositorio localmente y migrando los metadados desde el navegador o la app de escritorio.",
    useCase3Title: "100% Client-Side Web o Desktop Portátil",
    useCase3Desc: "Ejecútalo directo en el navegador (móvil o PC) sin servidores intermedios, o descarga el ejecutable portátil para Windows (.NET 8 + LibGit2Sharp con protección DPAPI).",
    faqTitle: "Preguntas Frecuentes (FAQ)",
    faqQ1: "¿Qué es un Ghost Commit y cómo llena el gráfico de GitHub?",
    faqA1: "Un Ghost Commit es un commit Git válido con autor, fecha/hora original (When) y mensaje, pero sin cambios de archivos (árbol vacío). GitHub lee la marca de tiempo y tu correo verificado para activar los cuadros verdes en tu perfil.",
    faqQ2: "¿Existe riesgo de filtrar código propietario o archivos de la empresa?",
    faqA2: "No. Tanto en la versión Web (vía Git Database API) como en Desktop (vía LibGit2Sharp AllowEmptyCommit = true), ningún archivo o diff se lee ni transmite al repositorio de destino.",
    faqQ3: "¿Cómo mostrar contribuciones de un repositorio de destino privado en mi perfil?",
    faqA3: "Puedes mantener el repositorio de destino como Privado en GitHub. Solo activa la opción 'Include private contributions on my profile' en la configuración de tu perfil de GitHub.",
    faqQ4: "¿Puedo ejecutar la migración varias veces en el mismo repositorio?",
    faqA4: "¡Sí! El migrador verifica los commits existentes en la rama main de destino y envía únicamente los nuevos, sin usar force push ni duplicar registros.",
    seoTagsTitle: "Temas y Casos de Uso Relacionados",
    seoTagsList: "migrar commits github • ghost commits • commits vacíos • pasar commits del trabajo a github personal • mantener cuadros verdes github • github contribution graph • sincronizar gitlab bitbucket azure devops a github • preservar historial git sin código",
    llmsLinkLabel: "Contexto para IA (llms.txt)"
  }
};

export function getTranslation(lang: AppLanguage): Translations {
  return translations[lang] || translations['pt-BR'];
}

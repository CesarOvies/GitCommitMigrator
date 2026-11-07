import { AppLanguage } from '../types';

export interface Translations {
  windowTitle: string;
  sourceModeLabel: string;
  sourceModeRemote: string;
  sourceModeLocal: string;
  sourceRepoLabel: string;
  sourceRepoPlaceholder: string;
  sourceLocalPickerBtn: string;
  sourceLocalFolderSelected: string;
  sourcePatTokenLabel: string;
  sourcePatTokenPlaceholder: string;
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
}

export const translations: Record<AppLanguage, Translations> = {
  'pt-BR': {
    windowTitle: "Git Commit Migrator",
    sourceModeLabel: "Modo de Origem:",
    sourceModeRemote: "Repositório Remoto (GitHub / GitLab)",
    sourceModeLocal: "Pasta Local (.git no Navegador)",
    sourceRepoLabel: "Repositório de Origem (URL Remota):",
    sourceRepoPlaceholder: "Ex: https://github.com/org/repo-privado",
    sourceLocalPickerBtn: "Escolher Pasta Local...",
    sourceLocalFolderSelected: "Pasta selecionada: {0}",
    sourcePatTokenLabel: "Token de Origem (PAT - Opcional se público):",
    sourcePatTokenPlaceholder: "Opcional (necessário para repo privado)",
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
    mobileWarningText: "No celular, use o modo 'Repositório Remoto' digitando a URL do seu repositório GitHub de origem."
  },
  'en-US': {
    windowTitle: "Git Commit Migrator",
    sourceModeLabel: "Source Mode:",
    sourceModeRemote: "Remote Repository (GitHub / GitLab)",
    sourceModeLocal: "Local Folder (.git in Browser)",
    sourceRepoLabel: "Source Repository (Remote URL):",
    sourceRepoPlaceholder: "E.g. https://github.com/org/private-repo",
    sourceLocalPickerBtn: "Choose Local Folder...",
    sourceLocalFolderSelected: "Selected folder: {0}",
    sourcePatTokenLabel: "Source Token (PAT - Optional if public):",
    sourcePatTokenPlaceholder: "Optional (required for private repo)",
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
    mobileWarningText: "On mobile devices, use the 'Remote Repository' mode with your source GitHub repository URL."
  },
  'es': {
    windowTitle: "Git Commit Migrator",
    sourceModeLabel: "Modo de Origen:",
    sourceModeRemote: "Repositorio Remoto (GitHub / GitLab)",
    sourceModeLocal: "Carpeta Local (.git en el Navegador)",
    sourceRepoLabel: "Repositorio de Origen (URL Remota):",
    sourceRepoPlaceholder: "Ej: https://github.com/org/repo-privado",
    sourceLocalPickerBtn: "Elegir Carpeta Local...",
    sourceLocalFolderSelected: "Carpeta seleccionada: {0}",
    sourcePatTokenLabel: "Token de Origen (PAT - Opcional si es público):",
    sourcePatTokenPlaceholder: "Opcional (requerido para repo privado)",
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
    mobileWarningText: "En dispositivos móviles, use el modo 'Repositorio Remoto' con la URL de su repositorio GitHub de origen."
  }
};

export function getTranslation(lang: AppLanguage): Translations {
  return translations[lang] || translations['pt-BR'];
}

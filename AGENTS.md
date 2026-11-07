# AGENTS.md — Guia para Agentes de IA

Contexto técnico e arquitetural do **GitCommitMigrator** para leitura rápida por agentes.

## 1. Visão Geral

Aplicação dual (Desktop Windows Forms em `.NET 8.0` e Web SPA hospedada no **GitHub Pages** em React/TypeScript/Vite) que extrai metadados de commits de um repositório Git local ou remoto por e-mail do autor e reconstrói o histórico em um novo repositório usando commits vazios (*ghost commits*), fazendo push para um remoto via PAT. Objetivo: preservar métricas/gráfico de atividade sem expor código proprietário.

## 2. Stack e Configuração

### Desktop (`Migrator/Migrator.csproj`)
- **TargetFramework**: `net8.0-windows` (`OutputType: WinExe`, `UseWindowsForms: true`)
- **RuntimeIdentifier**: `win-x64` (`PublishSingleFile: true`, `SelfContained: true`, `PublishReadyToRun: true`)
- **AssemblyName / PackageId**: `Git.Commit.Migrator` (`MIT`)
- **Dependência principal**: `LibGit2Sharp` (`0.31.0`)
- **Solution**: `GitCommitMigration.slnx` (inclui `Migrator` e `Migrator.Tests`)
- **Estilo (`.editorconfig`)**: `dotnet_style_namespace_match_folder = true` (namespaces refletem a hierarquia de pastas).

### Web (`Migrator.Web/`)
- **Stack**: React 18, TypeScript 5, Vite 6, Tailwind CSS 3, `isomorphic-git` 1.27, `vitest` 5
- **Hospedagem**: GitHub Pages (`https://cesarovies.github.io/GitCommitMigrator/`)
- **Arquitetura**: 100% Client-Side. Extração local via File System Access API, extração remota e criação de ghost commits via GitHub REST / Git Database API (`api.github.com`). Zero backend. 100% responsiva (mobile & desktop).

## 3. Mapa de Arquivos e Responsabilidades

| Arquivo | Símbolos Principais | Responsabilidade |
|---|---|---|
| `Migrator/Program.cs` | `Migrator.Program` | Ponto de entrada (`[STAThread] Main`). Inicializa o WinForms e abre `MigratorForm`. |
| `Migrator/Forms/MigratorForm.cs` | `Migrator.Forms.MigratorForm` | Renderiza formulário principal, banner discreto de atualização e integra ações assíncronas. |
| `Migrator/Forms/CommitSelectionForm.cs` | `Migrator.Forms.CommitSelectionForm` | Diálogo modal escuro para seleção avançada de commits (todos, único ou por período). |
| `Migrator/Forms/UpdateDialogForm.cs` | `Migrator.Forms.UpdateDialogForm` | Diálogo modal escuro centralizado com comparador de versão, release notes e barra de download/restart. |
| `Migrator/Services/MigrationService.cs` | `Migrator.Services.MigrationService` | Contém toda a regra de negócio Git via `LibGit2Sharp`. Métodos: `RunMigration`, `ExtractCommits`, `ReconstructHistory`, `PushToRemote`. |
| `Migrator/Services/UpdateService.cs` | `Migrator.Services.UpdateService` | Verificação assíncrona de releases no GitHub, download em stream e script PowerShell de restart atômico. |
| `Migrator/Services/LocalizationService.cs` | `Migrator.Services.LocalizationService` | Dicionário de traduções centralizado nos 3 idiomas suportados: `PtBr`, `EnUs` e `Es`. |
| `Migrator/Services/ErrorLogService.cs` | `Migrator.Services.ErrorLogService` | Grava exceptions em `error_yyyyMMdd.log`. Dados sensíveis criptografados via DPAPI (`CurrentUser`) como `[ENC:base64]`. |
| `Migrator/Models/RunMigrationRequest.cs` | `Migrator.Models.RunMigrationRequest` | DTO de entrada com os 7 parâmetros preenchidos na UI. |
| `Migrator/Models/CommitMetadata.cs` | `Migrator.Models.CommitMetadata` | DTO representando um commit extraído (`Message` e `When`). |
| `Migrator/Models/UpdateInfo.cs` | `Migrator.Models.UpdateInfo` | DTO representando o resultado da verificação de release/update. |
| `Migrator.Tests/Services/MigrationServiceTests.cs` | `Migrator.Tests.Services.MigrationServiceTests` | Testes automatizados (xUnit) validando extração, reconstrução de histórico e push E2E. |
| `Migrator.Tests/Services/UpdateServiceTests.cs` | `Migrator.Tests.Services.UpdateServiceTests` | Testes automatizados validando parsing semântico de versões, comparador, mock HTTP e scripts. |
| `Migrator.Web/src/App.tsx` | `Migrator.Web.App` | Componente raiz da versão Web: orquestra extração, modal de seleção, push e logs em tempo real. |
| `Migrator.Web/src/services/github-api.ts` | `fetchRemoteCommits`, `pushGhostCommits` | Serviço Web consumindo a API REST e Git Database API do GitHub com CORS nativo. |
| `Migrator.Web/src/services/git-local.ts` | `extractCommitsFromLocalDirectory` | Adaptador FileSystemDirectoryHandle e leitura do `.git` local via `isomorphic-git`. |
| `Migrator.Web/src/services/localization.ts` | `translations` | Dicionário de traduções web (PT-BR, EN-US, ES). |
| `Migrator.Web/src/services/validator.ts` | `validateMigrationRequest`, `parseGitHubUrl` | Validação de campos e URLs do repositório. |
| `.github/workflows/deploy-pages.yml` | `Deploy Web to GitHub Pages` | Deploy contínuo do Web App para o GitHub Pages em pushes na `main`. |
| `.github/workflows/ci.yml` | `CI & PR Policy` | Workflow do GitHub Actions que valida governança de branches em PRs (`* -> develop` e `develop -> main`), roda `dotnet test` e fecha automaticamente PRs inválidos ou quebrados. |
| `.github/workflows/sync-develop.yml` | `Sync Develop with Main` | Faz merge automático de `main` em `develop` após qualquer push na `main`. |
| `.github/workflows/release.yml` | `Release & Package Deploy` | Ao entrar commit na `main`, gera tag `v1.0.x`, empacota versão Portable `.zip` (`win-x64`), calcula hashes SHA-256/SHA-512, roda scan Defender + VirusTotal, gera atestado SLSA, publica no GitHub Packages e cria GitHub Release. |

## 4. Fluxo Passo a Passo (`MigrationService.cs`)

1. **`MigrationService.RunMigration(RunMigrationRequest)`**:
   Orquestra os 3 passos abaixo em sequência síncrona.
2. **`MigrationService.ExtractCommits(sourceRepoPath, filterOriginalEmail)`**:
   - Abre `new Repository(sourceRepoPath)`.
   - Consulta commits alcançáveis por qualquer referência (`IncludeReachableFrom = sourceRepo.Refs`) com ordenação `Topological | Time`.
   - Filtra onde `commit.Author.Email.Equals(filterOriginalEmail, StringComparison.OrdinalIgnoreCase)`.
   - Retorna `List<CommitMetadata>` ordenada de forma crescente por `When` (`OrderBy(c => c.When)`).
3. **`MigrationService.ReconstructHistory(targetLocalTempPath, commitsToMigrate, newAuthorName, newAuthorEmail)`**:
   - Executa `Repository.Init(targetLocalTempPath)`.
   - Cria `MIGRATION_INFO.md` e faz stage (`Commands.Stage(targetRepo, "*")`).
   - Cria commit `"Initial commit"` com `DateTimeOffset.Now`.
   - Garante que a branch atual se chame `"main"` (`targetRepo.Branches.Rename(currentBranch, "main")` se necessário).
   - Itera sobre `commitsToMigrate` criando commits vazios (`new CommitOptions { AllowEmptyCommit = true }`) usando `new Signature(newAuthorName, newAuthorEmail, meta.When)`.
4. **`MigrationService.PushToRemote(targetLocalTempPath, targetRemoteUrl, targetPatToken)`**:
   - Adiciona o remote `"origin"` apontando para `targetRemoteUrl`.
   - Configura `UsernamePasswordCredentials` com `Username = "PAT"` e `Password = targetPatToken`.
   - Faz `fetch` de `refs/heads/main` do remoto; se já existir histórico, recria os ghost commits em cima do tip remoto (sem force push), ignorando o `"Initial commit"` local e commits já presentes (mesmo e-mail/data/mensagem do autor).
   - Faz push de `refs/heads/main` para `origin`.

## 5. Governança de Branches, CI e Release

- Toda alteração deve ser feita em branches direcionadas a `develop`.
- **Proibido commit/push direto na `main`**: ela só aceita PR com origem `develop` (`develop -> main`). PRs de qualquer outra branch para `main` são fechados pelo CI.
- Todos os testes em `Migrator.Tests` devem passar antes de abrir/mesclar PRs.
- Merges na `main` disparam automaticamente `release.yml` (tag + GitHub Release com Portable `.zip`, hashes SHA-256/SHA-512, scan Defender/VirusTotal + GitHub Packages) e `sync-develop.yml`.

## 6. Comandos Úteis

```powershell
# Build
dotnet build GitCommitMigration.slnx

# Test
dotnet test GitCommitMigration.slnx

# Run
dotnet run --project Migrator/Migrator.csproj

# Publish Single-File
dotnet publish Migrator/Migrator.csproj -c Release
```

## 7. Diretrizes de UI e Dark Theme (Prevenção de Telas Brancas)

- **Proibido usar `MessageBox.Show` nativo** para diálogos principais e fluxos da aplicação (o Win32 renderiza caixas de diálogo brancas que quebram o tema escuro).
- Criar sempre modais baseados em `Form` (`FixedDialog`, `CenterParent`, `ShowInTaskbar = false`) com a paleta oficial GitHub Dark:
  - `BgCanvas`: `Color.FromArgb(13, 17, 23)` (`#0D1117`)
  - `BgInput`: `Color.FromArgb(22, 27, 34)` (`#161B22`)
  - `BgButtonSubtle`: `Color.FromArgb(33, 38, 45)` (`#21262D`)
  - `BorderSubtle`: `Color.FromArgb(48, 54, 61)` (`#30363D`)
  - `BorderFocus`: `Color.FromArgb(56, 139, 253)` (`#388BFD`)
  - `TextPrimary`: `Color.FromArgb(230, 237, 243)` (`#E6EDF3`)
  - `TextSecondary`: `Color.FromArgb(139, 148, 158)` (`#8B949E`)
  - `AccentGreen`: `Color.FromArgb(35, 134, 54)` (`#238636`)
  - `AccentGreenBorder`: `Color.FromArgb(63, 185, 80)` (`#3FB950`)
  - `ErrorRed`: `Color.FromArgb(248, 81, 73)` (`#F85149`)
- Em todo `Form`, implementar em `OnHandleCreated`:
  ```csharp
  if (OperatingSystem.IsWindowsVersionAtLeast(10, 0, 17763))
  {
      int useDarkMode = 1;
      _ = DwmSetWindowAttribute(Handle, 20, ref useDarkMode, sizeof(int));
  }
  ```
- **Alinhamento e Centralização**:
  - Títulos de cabeçalho e comparadores de valor devem ser centralizados (`TextAlign = ContentAlignment.MiddleCenter`).
  - Pares de botões de ação (`[Depois / Cancelar]` e `[Ação Principal]`) devem ser centralizados na largura do diálogo calculando matematicamente o `startX`.

## 8. Diretrizes de Internacionalização (i18n)

- Todo texto exibido para o usuário final deve ser registrado em [`Migrator/Services/LocalizationService.cs`](file:///Migrator/Services/LocalizationService.cs).
- Adições em `UiTranslations` exigem valores obrigatórios nos 3 idiomas:
  - `PtBr` (Português do Brasil)
  - `EnUs` (Inglês)
  - `Es` (Espanhol)
- O formulário principal deve atualizar todas as strings reativamente ao trocar de idioma no `cmbLanguage`.

## 9. Playbook para Agentes (Como Corrigir Bugs ou Criar Melhorias)

### Fluxo para Correção de Bugs (Bug Fix)
1. **Reprodução**: Escrever primeiro um teste unitário em `Migrator.Tests` reproduzindo a falha ou o comportamento inconsistente.
2. **Branch**: Criar branch derivada de `develop`: `git checkout -b fix/descricao-do-bug`.
3. **Cirurgia**: Corrigir apenas a causa raiz no arquivo de negócio/serviço relevante (sem tocar em código ou formatação adjacente desnecessária).
4. **Verificação**: Rodar `dotnet test GitCommitMigration.slnx` e garantir 100% dos testes passando.
5. **PR**: Abrir Pull Request com destino `develop` (`--base develop`).

### Fluxo para Implementação de Melhorias / Features
1. **Planejamento e YAGNI**: Avaliar reutilização antes de criar novos arquivos. Manter arquitetura enxuta (serviços estáticos, DTOs imutáveis, controles WinForms declarativos).
2. **Branch**: Criar branch derivada de `develop`: `git checkout -b feature/nome-da-feature`.
3. **UI / Textos**: Se houver interface, aplicar o Dark Theme (Seção 7) e registrar todas as strings em `LocalizationService.cs` (Seção 8).
4. **Testes Unitários**: Criar suíte em `Migrator.Tests` cobrindo cenários válidos, inválidos e tratamento de erro sem throw silencioso.
5. **Validação e PR**: Executar `dotnet build` e `dotnet test`. Criar PR contra `develop`.

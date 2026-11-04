# AGENTS.md — Guia para Agentes de IA

Contexto técnico e arquitetural do **GitCommitMigrator** para leitura rápida por agentes.

## 1. Visão Geral

Aplicação desktop Windows Forms em `.NET 8.0` (`net8.0-windows` / `win-x64`) que extrai metadados de commits de um repositório Git local por e-mail do autor e reconstrói o histórico em um novo repositório usando commits vazios (*ghost commits*), fazendo push para um remoto via PAT. Objetivo: preservar métricas/gráfico de atividade sem expor código proprietário.

## 2. Stack e Configuração (`Migrator/Migrator.csproj`)

- **TargetFramework**: `net8.0-windows` (`OutputType: Exe`, `UseWindowsForms: true`)
- **RuntimeIdentifier**: `win-x64` (`PublishSingleFile: true`, `SelfContained: true`, `PublishReadyToRun: true`)
- **AssemblyName / PackageId**: `Git.Commit.Migrator` (`MIT`)
- **Dependência principal**: `LibGit2Sharp` (`0.31.0`)
- **Solution**: `GitCommitMigration.slnx` (inclui `Migrator` e `Migrator.Tests`)
- **Estilo (`.editorconfig`)**: `dotnet_style_namespace_match_folder = true` (namespaces refletem a hierarquia de pastas).

## 3. Mapa de Arquivos e Responsabilidades

| Arquivo | Símbolos Principais | Responsabilidade |
|---|---|---|
| `Migrator/Program.cs` | `Migrator.Program` | Ponto de entrada (`[STAThread] Main`). Inicializa o WinForms e abre `MigratorForm`. |
| `Migrator/Forms/MigratorForm.cs` | `Migrator.Forms.MigratorForm` | Renderiza formulário com 7 `TextBox` e 1 `Button`. Executa `MigrationService.RunMigration` de forma assíncrona via `Task.Run`. |
| `Migrator/Services/MigrationService.cs` | `Migrator.Services.MigrationService` | Contém toda a regra de negócio Git via `LibGit2Sharp`. Métodos estáticos: `RunMigration`, `ExtractCommits`, `ReconstructHistory`, `PushToRemote`. |
| `Migrator/Services/ErrorLogService.cs` | `Migrator.Services.ErrorLogService` | Grava exceptions (mensagem + stack trace + inner) em `error_yyyyMMdd.log` na pasta do executável. Dados sensíveis (PATs, e-mails, nome do autor, credenciais em URL, tokens GitHub) são criptografados via DPAPI (`CurrentUser`) como `[ENC:base64]`; `Decrypt` reverte no mesmo usuário/máquina. |
| `Migrator/Models/RunMigrationRequest.cs` | `Migrator.Models.RunMigrationRequest` | DTO de entrada com os 7 parâmetros preenchidos na UI. |
| `Migrator/Models/CommitMetadata.cs` | `Migrator.Models.CommitMetadata` | DTO representando um commit extraído (`Message` e `When`). |
| `Migrator.Tests/Services/MigrationServiceTests.cs` | `Migrator.Tests.Services.MigrationServiceTests` | Testes automatizados (xUnit) validando extração, reconstrução de histórico e push E2E em repositório bare local. |
| `.github/workflows/ci.yml` | `CI & PR Policy` | Workflow do GitHub Actions que valida governança de branches em PRs (`* -> develop` e `develop -> main`), roda `dotnet test` e fecha automaticamente PRs inválidos ou com testes quebrados. O PR `develop -> main` é aberto manualmente. |
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

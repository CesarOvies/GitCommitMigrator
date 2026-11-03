# AGENTS.md — Guia para Agentes de IA

Contexto técnico e arquitetural do **GitCommitMigrator** para leitura rápida por agentes.

## 1. Visão Geral

Aplicação desktop Windows Forms em `.NET 8.0` (`net8.0-windows` / `win-x64`) que extrai metadados de commits de um repositório Git local por e-mail do autor e reconstrói o histórico em um novo repositório usando commits vazios (*ghost commits*), fazendo push para um remoto via PAT. Objetivo: preservar métricas/gráfico de atividade sem expor código proprietário.

## 2. Stack e Configuração (`Migrator/Migrator.csproj`)

- **TargetFramework**: `net8.0-windows` (`OutputType: Exe`, `UseWindowsForms: true`)
- **RuntimeIdentifier**: `win-x64` (`PublishSingleFile: true`, `SelfContained: true`, `PublishReadyToRun: true`)
- **AssemblyName**: `Git.Commit.Migrator`
- **Dependência principal**: `LibGit2Sharp` (`0.31.0`)
- **Solution**: `GitCommitMigration.slnx` (inclui `Migrator` e `Migrator.Tests`)
- **Estilo (`.editorconfig`)**: `dotnet_style_namespace_match_folder = true` (namespaces refletem a hierarquia de pastas).

## 3. Mapa de Arquivos e Responsabilidades

| Arquivo | Símbolos Principais | Responsabilidade |
|---|---|---|
| `Migrator/Program.cs` | `Migrator.Program` | Ponto de entrada (`[STAThread] Main`). Inicializa o WinForms e abre `MigratorForm`. |
| `Migrator/Forms/MigratorForm.cs` | `Migrator.Forms.MigratorForm` | Renderiza formulário com 7 `TextBox` e 1 `Button`. Executa `MigrationService.RunMigration` de forma assíncrona via `Task.Run`. |
| `Migrator/Services/MigrationService.cs` | `Migrator.Services.MigrationService` | Contém toda a regra de negócio Git via `LibGit2Sharp`. Métodos estáticos: `RunMigration`, `ExtractCommits`, `ReconstructHistory`, `PushToRemote`. |
| `Migrator/Models/RunMigrationRequest.cs` | `Migrator.Models.RunMigrationRequest` | DTO de entrada com os 7 parâmetros preenchidos na UI. |
| `Migrator/Models/CommitMetadata.cs` | `Migrator.Models.CommitMetadata` | DTO representando um commit extraído (`Message` e `When`). |
| `Migrator.Tests/Services/MigrationServiceTests.cs` | `Migrator.Tests.Services.MigrationServiceTests` | Testes automatizados (xUnit) validando extração, reconstrução de histórico e push E2E em repositório bare local. |
| `.github/workflows/ci.yml` | `CI & PR Policy` | Workflow do GitHub Actions que valida governança de branches em PRs (`* -> develop` e `develop -> main`), roda `dotnet test` e fecha automaticamente PRs inválidos ou com testes quebrados. |

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
   - Faz push de `refs/heads/main` para `origin`.

## 5. Governança de Branches e CI

- Toda alteração deve ser feita em `develop` (ou branches direcionadas a `develop`).
- A `main` só recebe merge vindo de `develop`.
- Todos os testes em `Migrator.Tests` devem passar antes de abrir/mesclar PRs.

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

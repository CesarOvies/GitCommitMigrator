<p align="center">
  <img src="Migrator/Assets/logo.png" alt="Git Commit Migrator Logo" width="160" />
</p>

# Git Commit Migrator

![.NET 8.0](https://img.shields.io/badge/.NET-8.0--windows-512BD4?logo=dotnet)
![Platform](https://img.shields.io/badge/Platform-Windows%20x64-0078D6?logo=windows)
![LibGit2Sharp](https://img.shields.io/badge/LibGit2Sharp-0.31.0-F05032?logo=git)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Aplicação desktop Windows Forms (.NET 8) para migrar o histórico de contribuições de um repositório Git local para um novo repositório remoto usando **Ghost Commits** (commits vazios que preservam datas e mensagens originais sem expor o código-fonte).

---

## Como Funciona

O processo executa 3 etapas sequenciais (`MigrationService.RunMigration`):

```mermaid
flowchart LR
    A["1. ExtractCommits\n(Repositório Origem)"] --> B["2. ReconstructHistory\n(Repositório Temp Local)"]
    B --> C["3. PushToRemote\n(Repositório Destino)"]
```

1. **Extração (`ExtractCommits`)**: Varre todas as referências (`Refs`) do repositório local de origem, filtra os commits cujo e-mail do autor (`Author.Email`) corresponde ao e-mail informado (case-insensitive) e ordena cronologicamente (`When`).
2. **Reconstrução (`ReconstructHistory`)**:
   - Inicializa um novo repositório Git no diretório temporário.
   - Cria o arquivo `MIGRATION_INFO.md` com um commit inicial na branch `main`.
   - Recria cada commit filtrado usando `AllowEmptyCommit = true`, mantendo a mensagem e o timestamp original (`When`), mas atribuindo a assinatura ao novo nome e e-mail configurados.
3. **Publicação (`PushToRemote`)**: Adiciona o repositório remoto como `origin` e realiza o push da branch `refs/heads/main` autenticando via Personal Access Token (PAT).

---

## Campos da Interface

| Campo | Descrição |
|---|---|
| **Source Repo Path (Local)** | Caminho local do repositório Git original (onde está o histórico a extrair). |
| **Target Local Temp Path** | Pasta local vazia/temporária onde o novo repositório de ghost commits será montado. |
| **Target Remote URL** | URL HTTPS do repositório remoto de destino (ex.: `https://github.com/usuario/repo-historico.git`). |
| **Filter Original Email** | E-mail usado nos commits originais que devem ser filtrados e migrados. |
| **New Author Name** | Nome do autor que será gravado nos novos commits. |
| **New Author Email** | E-mail do autor que será gravado nos novos commits (vinculado à sua conta GitHub/GitLab). |
| **Target PAT Token** | Personal Access Token com permissão de escrita (`repo` / `contents:write`) no repositório de destino. |

---

## Download (Versão Portable)

A cada merge na `main`, uma nova versão **Portable (`.zip` Self-Contained `win-x64`)** é publicada automaticamente em [**Releases**](https://github.com/CesarOvies/GitCommitMigrator/releases) e [**Packages**](https://github.com/CesarOvies/GitCommitMigrator/packages), acompanhada de:
- Hashes criptográficos **SHA-256** e **SHA-512** (do `.zip` e do `.exe` + arquivo `.sha256`).
- Varredura antimalware via **Microsoft Defender Antivirus** e relatório/links de verificação no **VirusTotal** (suporta upload automático configurando `secrets.VT_API_KEY`).
- Atestado de proveniência de build (**SLSA Build Provenance Attestation**).

---

## Requisitos e Execução (Desenvolvimento)

- **SO**: Windows x64
- **SDK**: .NET 8.0+

### Executar em modo desenvolvimento

```powershell
dotnet run --project Migrator/Migrator.csproj
```

### Executar Testes

```powershell
dotnet test GitCommitMigration.slnx
```

### Gerar executável único (Self-Contained)

O projeto já está configurado para publicação *single-file* independente (`win-x64`):

```powershell
dotnet publish Migrator/Migrator.csproj -c Release
```

O binário `Git.Commit.Migrator.exe` será gerado em `Migrator/bin/Release/net8.0-windows/win-x64/publish/`.

---

## Fluxo de Branches, CI e CD (GitHub Actions)

O repositório conta com pipelines automatizados em `.github/workflows/`:
1. **Regra de PR e Testes (`ci.yml`)**:
   - Todo PR de feature/fix deve apontar para `develop`.
   - A branch `main` aceita exclusivamente PRs originados de `develop`.
   - Compila a solução e executa a suíte `Migrator.Tests` (xUnit).
   - PRs fora do fluxo de branches ou com testes quebrados são comentados e **fechados automaticamente**.
2. **Sincronização Automática (`sync-develop.yml`)**:
   - Sempre que a `main` é atualizada, faz merge automático de `main` de volta para `develop`.
3. **Release & Deploy Automático (`release.yml`)**:
   - Ao entrar código na `main`, incrementa automaticamente a tag semântica (`v1.0.x`), compila o executável portátil single-file, gera o `.zip` e hashes SHA-256/SHA-512, executa scan de antivírus (Defender + VirusTotal), publica no **GitHub Packages** e cria a **GitHub Release** com os artefatos anexados.

---

## Estrutura do Projeto

```text
GitCommitMigration.slnx
├── .github/workflows/
│   ├── ci.yml                          # Pipeline CI + Governança de PRs/Branches
│   ├── release.yml                     # Deploy automático (Release Portable ZIP + Security/VirusTotal + Packages)
│   └── sync-develop.yml                # Sincronização automática main -> develop
├── Migrator/
│   ├── Forms/
│   │   └── MigratorForm.cs             # UI principal (Windows Forms)
│   ├── Models/
│   │   ├── CommitMetadata.cs           # Modelo dos metadados extraídos de cada commit (Message, When)
│   │   └── RunMigrationRequest.cs      # DTO com os parâmetros de entrada da migração
│   ├── Services/
│   │   └── MigrationService.cs         # Motor de migração (ExtractCommits, ReconstructHistory, PushToRemote)
│   ├── Program.cs                      # Ponto de entrada da aplicação
│   └── Migrator.csproj                 # Configuração de build .NET 8 / LibGit2Sharp / NuGet Package
└── Migrator.Tests/
    ├── Services/
    │   └── MigrationServiceTests.cs    # Testes unitários e E2E do motor de migração
    └── Migrator.Tests.csproj           # Projeto de testes xUnit
```

---

## Licença

Distribuído sob a licença **MIT**. Veja [LICENSE](LICENSE) para mais detalhes.

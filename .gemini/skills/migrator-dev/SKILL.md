---
name: migrator-dev
description: Playbook e diretrizes para agentes IA corrigirem bugs, criarem melhorias, aplicarem o GitHub Dark Theme em WinForms e manterem os testes e i18n no GitCommitMigrator.
---

# Migrator Dev Skill — Guia de Desenvolvimento e Manutenção

Esta skill orienta agentes autônomos na correção de bugs e criação de melhorias no **GitCommitMigrator** (.NET 8 WinForms x64).

## 1. Princípios de Arquitetura

- **Simplicidade e YAGNI**: Não adicionar dependências ou abstrações complexas quando poucas linhas no stdlib/.NET 8 resolvem.
- **Serviços Estáticos e DTOs**: Regras de negócio vivem em serviços estáticos (`MigrationService`, `UpdateService`, `ErrorLogService`, `LocalizationService`). Modelos de transferência de dados vivem em `Migrator.Models`.
- **Governança de Branches**: Sempre derivar de `develop` e abrir PRs apontando para `develop`. Nunca tentar commit ou PR direto para `main`.

## 2. Padrões de Interface (GitHub Dark Theme & WinForms)

Qualquer nova tela ou diálogo DEVE seguir estritamente o tema escuro:

1. **Nunca usar `MessageBox.Show` nativo**: Gera janelas Win32 brancas que quebram a imersão. Criar diálogos modais herdando de `Form` (`FixedDialog`, `CenterParent`).
2. **Paleta de Cores**:
   - `BgCanvas`: `#0D1117`
   - `BgInput`: `#161B22`
   - `BgButtonSubtle`: `#21262D`
   - `BorderSubtle`: `#30363D`
   - `BorderFocus`: `#388BFD`
   - `TextPrimary`: `#E6EDF3`
   - `TextSecondary`: `#8B949E`
   - `AccentGreen`: `#238636`
   - `AccentGreenBorder`: `#3FB950`
   - `ErrorRed`: `#F85149`
3. **Barra de título escura no Windows**:
   ```csharp
   protected override void OnHandleCreated(EventArgs e)
   {
       base.OnHandleCreated(e);
       if (OperatingSystem.IsWindowsVersionAtLeast(10, 0, 17763))
       {
           int useDarkMode = 1;
           _ = DwmSetWindowAttribute(Handle, 20, ref useDarkMode, sizeof(int));
       }
   }
   ```
4. **Alinhamento e Centralização**:
   - Títulos, subtítulos e cartões de comparação devem ser centralizados (`TextAlign = ContentAlignment.MiddleCenter`).
   - Botões de ação (`[Depois / Cancelar]` e `[Ação Primária]`) devem ser centralizados calculando `(ContentWidth - totalWidth) / 2`.

## 3. Internacionalização Obrigatória (i18n)

Todas as strings visíveis devem ser cadastradas em `Migrator/Services/LocalizationService.cs` com suporte obrigatório a:
- `PtBr` (Português)
- `EnUs` (Inglês)
- `Es` (Espanhol)

## 4. Playbook: Como Corrigir Bugs (Bugfix)

1. **Reproduzir**: Criar teste unitário em `Migrator.Tests/Services/` que falhe com o bug reportado.
2. **Branch**: `git checkout -b fix/<descricao-curta> develop`.
3. **Correção**: Modificar estritamente a causa raiz. Não mexer em código adjacente.
4. **Validar**: `dotnet test GitCommitMigration.slnx`. Todos os testes devem passar.
5. **PR**: `gh pr create --base develop --head fix/<descricao-curta>`.

## 5. Playbook: Como Criar Melhorias / Features

1. **Branch**: `git checkout -b feature/<nome-da-feature> develop`.
2. **Lógica de Negócio**: Implementar ou estender serviços em `Migrator/Services/`.
3. **UI & i18n**: Se envolver UI, usar a paleta Dark Theme e adicionar chaves em `LocalizationService.cs`.
4. **Testes**: Adicionar suíte xUnit em `Migrator.Tests` cobrindo cenários positivos e negativos.
5. **Validar e PR**: `dotnet build GitCommitMigration.slnx` -> `dotnet test GitCommitMigration.slnx` -> `gh pr create --base develop`.

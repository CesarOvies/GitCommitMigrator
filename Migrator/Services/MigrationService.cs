using System.Net.Mail;
using System.Text.Json;
using LibGit2Sharp;
using Migrator.Models;

namespace Migrator.Services;

public static class MigrationService
{
    private static readonly JsonSerializerOptions ConfigJsonOptions = new()
    {
        WriteIndented = true,
        PropertyNameCaseInsensitive = true
    };

    public static void ExportConfiguration(RunMigrationRequest request, string filePath)
    {
        ArgumentNullException.ThrowIfNull(request);
        ArgumentException.ThrowIfNullOrWhiteSpace(filePath);

        string json = JsonSerializer.Serialize(request, ConfigJsonOptions);
        File.WriteAllText(filePath, json);
    }

    public static RunMigrationRequest ImportConfiguration(string filePath)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(filePath);

        string json = File.ReadAllText(filePath);
        return JsonSerializer.Deserialize<RunMigrationRequest>(json, ConfigJsonOptions)
            ?? throw new InvalidDataException("Invalid configuration file.");
    }

    public static Dictionary<string, string> ValidateRequest(RunMigrationRequest request, AppLanguage language = AppLanguage.PtBr)
    {
        UiTranslations t = LocalizationService.Get(language);
        Dictionary<string, string> errors = new();

        string source = request.SourceRepoPath?.Trim() ?? string.Empty;
        if (string.IsNullOrEmpty(source))
        {
            errors[nameof(RunMigrationRequest.SourceRepoPath)] = t.ErrSourceEmpty;
        }
        else if (!IsRemoteUrl(source) && !Repository.IsValid(source))
        {
            errors[nameof(RunMigrationRequest.SourceRepoPath)] = t.ErrSourceInvalid;
        }

        string remoteUrl = request.TargetRemoteUrl?.Trim() ?? string.Empty;
        if (string.IsNullOrEmpty(remoteUrl))
        {
            errors[nameof(RunMigrationRequest.TargetRemoteUrl)] = t.ErrRemoteUrlEmpty;
        }
        else if (!IsRemoteUrl(remoteUrl) && !Repository.IsValid(remoteUrl))
        {
            errors[nameof(RunMigrationRequest.TargetRemoteUrl)] = t.ErrRemoteUrlInvalid;
        }

        string originalEmail = request.FilterOriginalEmail?.Trim() ?? string.Empty;
        if (string.IsNullOrEmpty(originalEmail))
        {
            errors[nameof(RunMigrationRequest.FilterOriginalEmail)] = t.ErrOriginalEmailEmpty;
        }
        else if (!IsValidEmail(originalEmail))
        {
            errors[nameof(RunMigrationRequest.FilterOriginalEmail)] = t.ErrOriginalEmailInvalid;
        }

        string newName = request.NewAuthorName?.Trim() ?? string.Empty;
        if (string.IsNullOrEmpty(newName))
        {
            errors[nameof(RunMigrationRequest.NewAuthorName)] = t.ErrNewNameEmpty;
        }

        string newEmail = request.NewAuthorEmail?.Trim() ?? string.Empty;
        if (string.IsNullOrEmpty(newEmail))
        {
            errors[nameof(RunMigrationRequest.NewAuthorEmail)] = t.ErrNewEmailEmpty;
        }
        else if (!IsValidEmail(newEmail))
        {
            errors[nameof(RunMigrationRequest.NewAuthorEmail)] = t.ErrNewEmailInvalid;
        }

        string pat = request.TargetPatToken?.Trim() ?? string.Empty;
        if (string.IsNullOrEmpty(pat))
        {
            errors[nameof(RunMigrationRequest.TargetPatToken)] = t.ErrPatEmpty;
        }

        return errors;
    }

    public static bool IsRemoteUrl(string value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return false;
        }

        if (Uri.TryCreate(value.Trim(), UriKind.Absolute, out Uri? uri) &&
            (uri.Scheme.Equals(Uri.UriSchemeHttp, StringComparison.OrdinalIgnoreCase) ||
             uri.Scheme.Equals(Uri.UriSchemeHttps, StringComparison.OrdinalIgnoreCase) ||
             uri.Scheme.Equals("git", StringComparison.OrdinalIgnoreCase) ||
             uri.Scheme.Equals("ssh", StringComparison.OrdinalIgnoreCase)))
        {
            return true;
        }

        return value.TrimStart().StartsWith("git@", StringComparison.OrdinalIgnoreCase);
    }

    private static bool IsValidEmail(string email)
    {
        return MailAddress.TryCreate(email, out MailAddress? addr) &&
               addr.Address.Equals(email, StringComparison.OrdinalIgnoreCase) &&
               addr.Host.Contains('.');
    }

    public static string? RunMigration(
        RunMigrationRequest request,
        string? logDirectoryPath = null,
        IProgress<MigrationProgress>? progress = null,
        AppLanguage language = AppLanguage.PtBr,
        Func<IReadOnlyList<CommitMetadata>, List<CommitMetadata>?>? selectCommitsCallback = null)
    {
        Dictionary<string, string> errors = ValidateRequest(request, language);
        if (errors.Count > 0)
        {
            throw new ArgumentException(string.Join(Environment.NewLine, errors.Values));
        }

        UiTranslations t = LocalizationService.Get(language);
        DateTimeOffset startedAt = DateTimeOffset.Now;
        string workingDirectory = logDirectoryPath ?? AppContext.BaseDirectory;
        string source = request.SourceRepoPath.Trim();
        string sourcePat = request.SourcePatToken?.Trim() ?? string.Empty;
        string remoteUrl = request.TargetRemoteUrl.Trim();
        string originalEmail = request.FilterOriginalEmail.Trim();
        string newName = request.NewAuthorName.Trim();
        string newEmail = request.NewAuthorEmail.Trim();
        string targetPat = request.TargetPatToken.Trim();
        string effectiveSourcePat = !string.IsNullOrEmpty(sourcePat) ? sourcePat : targetPat;

        progress?.Report(new MigrationProgress(5, t.StatusExtractingCommits));
        (List<CommitMetadata> commits, int totalFound) = ExtractCommitsWithStats(source, originalEmail, effectiveSourcePat);

        if (request.UseAdvancedSettings && selectCommitsCallback is not null)
        {
            List<CommitMetadata>? selected = selectCommitsCallback(commits);
            if (selected is null)
            {
                return null;
            }
            commits = selected;
        }

        (bool gitRemoved, bool mdRemoved) cleanupResult = (false, false);

        try
        {
            progress?.Report(new MigrationProgress(20, string.Format(t.StatusReconstructingHistory, 0, commits.Count)));
            ReconstructHistory(
                workingDirectory,
                commits,
                newName,
                newEmail,
                (current, total) =>
                {
                    int pct = total == 0 ? 80 : 20 + (int)Math.Round((double)current / total * 60);
                    progress?.Report(new MigrationProgress(pct, string.Format(t.StatusReconstructingHistory, current, total)));
                });

            progress?.Report(new MigrationProgress(85, t.StatusPushingToRemote));
            PushToRemote(workingDirectory, remoteUrl, targetPat);
        }
        finally
        {
            cleanupResult = CleanupTargetArtifacts(workingDirectory);
        }

        DateTimeOffset finishedAt = DateTimeOffset.Now;
        string logFilePath = WriteMigrationLog(
            workingDirectory,
            startedAt,
            finishedAt,
            request,
            totalFound,
            commits,
            cleanupResult.gitRemoved,
            cleanupResult.mdRemoved);

        progress?.Report(new MigrationProgress(100, t.StatusCompleted));
        return logFilePath;
    }

    public static List<CommitMetadata> ExtractCommits(string sourceRepoPath, string filterOriginalEmail, string? patToken = null)
        => ExtractCommitsWithStats(sourceRepoPath, filterOriginalEmail, patToken).Commits;

    public static List<CommitMetadata> FilterCommitsByPeriod(
        IEnumerable<CommitMetadata> commits,
        DateTime startDate,
        DateTime endDate)
    {
        ArgumentNullException.ThrowIfNull(commits);
        DateTime start = startDate.Date;
        DateTime end = endDate.Date;

        return commits
            .Where(c =>
            {
                DateTime commitDate = c.When.LocalDateTime.Date;
                return commitDate >= start && commitDate <= end;
            })
            .OrderBy(c => c.When)
            .ToList();
    }

    private static (List<CommitMetadata> Commits, int TotalFound) ExtractCommitsWithStats(string sourceRepoPath, string filterOriginalEmail, string? patToken = null)
    {
        if (IsRemoteUrl(sourceRepoPath))
        {
            string tempClonePath = Path.Combine(Path.GetTempPath(), $"GitCommitMigrator_Source_{Guid.NewGuid():N}");
            try
            {
                CloneOptions cloneOptions = new() { IsBare = true };
                if (!string.IsNullOrWhiteSpace(patToken))
                {
                    cloneOptions.FetchOptions.CredentialsProvider = (_url, _user, _cred) =>
                        new UsernamePasswordCredentials
                        {
                            Username = "PAT",
                            Password = patToken
                        };
                }

                Repository.Clone(sourceRepoPath, tempClonePath, cloneOptions);
                return ExtractCommitsFromLocalRepo(tempClonePath, filterOriginalEmail);
            }
            finally
            {
                DeleteDirectorySafe(tempClonePath);
            }
        }

        return ExtractCommitsFromLocalRepo(sourceRepoPath, filterOriginalEmail);
    }

    private static (List<CommitMetadata> Commits, int TotalFound) ExtractCommitsFromLocalRepo(string localRepoPath, string filterOriginalEmail)
    {
        List<CommitMetadata> commitsToMigrate = new();
        int totalFound = 0;

        using Repository sourceRepo = new(localRepoPath);

        CommitFilter filter = new()
        {
            SortBy = CommitSortStrategies.Topological | CommitSortStrategies.Time,
            IncludeReachableFrom = sourceRepo.Refs
        };

        ICommitLog allCommits = sourceRepo.Commits.QueryBy(filter);

        foreach (Commit? commit in allCommits)
        {
            totalFound++;
            if (commit.Author.Email.Equals(filterOriginalEmail, StringComparison.OrdinalIgnoreCase))
            {
                commitsToMigrate.Add(new CommitMetadata
                {
                    Message = commit.Message,
                    When = commit.Author.When
                });
            }
        }

        return (commitsToMigrate.OrderBy(c => c.When).ToList(), totalFound);
    }

    private static void DeleteDirectorySafe(string path)
    {
        try
        {
            if (!Directory.Exists(path))
            {
                return;
            }

            foreach (string file in Directory.GetFiles(path, "*", SearchOption.AllDirectories))
            {
                File.SetAttributes(file, FileAttributes.Normal);
            }

            Directory.Delete(path, recursive: true);
        }
        catch
        {
            // Ignore cleanup locks on Windows temp dir
        }
    }

    public static (bool GitRemoved, bool MarkdownRemoved) CleanupTargetArtifacts(string targetLocalTempPath)
    {
        string gitDir = Path.Combine(targetLocalTempPath, ".git");
        string mdFile = Path.Combine(targetLocalTempPath, "MIGRATION_INFO.md");

        bool gitExisted = Directory.Exists(gitDir);
        if (gitExisted)
        {
            DeleteDirectorySafe(gitDir);
        }

        bool mdExisted = File.Exists(mdFile);
        if (mdExisted)
        {
            try
            {
                File.SetAttributes(mdFile, FileAttributes.Normal);
                File.Delete(mdFile);
            }
            catch
            {
                // Ignore cleanup locks on Windows temp dir
            }
        }

        return (gitExisted && !Directory.Exists(gitDir), mdExisted && !File.Exists(mdFile));
    }

    private static string WriteMigrationLog(
        string logDirectory,
        DateTimeOffset startedAt,
        DateTimeOffset finishedAt,
        RunMigrationRequest request,
        int totalFound,
        List<CommitMetadata> migratedCommits,
        bool gitRemoved,
        bool mdRemoved)
    {
        Directory.CreateDirectory(logDirectory);
        string logFileName = $"migration_{startedAt:yyyyMMdd_HHmm}.log";
        string logFilePath = Path.Combine(logDirectory, logFileName);

        int ignoredCommits = totalFound - migratedCommits.Count;
        int cleanedArtifacts = (gitRemoved ? 1 : 0) + (mdRemoved ? 1 : 0);
        TimeSpan duration = finishedAt - startedAt;
        string dateRange = migratedCommits.Count > 0
            ? $"{migratedCommits[0].When:yyyy-MM-dd HH:mm:ss zzz} até {migratedCommits[^1].When:yyyy-MM-dd HH:mm:ss zzz}"
            : "N/A";

        string[] lines =
        [
            "=== GIT COMMIT MIGRATOR - RESUMO DA MIGRAÇÃO ===",
            $"Início: {startedAt:yyyy-MM-dd HH:mm:ss zzz}",
            $"Término: {finishedAt:yyyy-MM-dd HH:mm:ss zzz}",
            $"Duração: {duration.TotalSeconds:F2}s",
            $"Repositório de Origem: {request.SourceRepoPath.Trim()}",
            $"Pasta de Execução Local: {logDirectory.Trim()}",
            $"Repositório Remoto de Destino: {request.TargetRemoteUrl.Trim()}",
            $"E-mail Original Filtrado: {request.FilterOriginalEmail.Trim()}",
            $"Novo Autor: {request.NewAuthorName.Trim()} <{request.NewAuthorEmail.Trim()}>",
            "------------------------------------------------",
            $"Commits encontrados na origem: {totalFound}",
            $"Commits descartados/limpos pelo filtro: {ignoredCommits}",
            $"Commits migrados (ghost commits): {migratedCommits.Count}",
            $"Total de commits enviados no push (com commit inicial): {migratedCommits.Count + 1}",
            $"Período dos commits migrados: {dateRange}",
            "------------------------------------------------",
            $"Artefatos temporários limpos: {cleanedArtifacts} (.git removido: {(gitRemoved ? "Sim" : "Não")}, MIGRATION_INFO.md removido: {(mdRemoved ? "Sim" : "Não")})",
            "Status: Sucesso",
            string.Empty
        ];

        File.AppendAllLines(logFilePath, lines);
        return logFilePath;
    }

    public static void ReconstructHistory(
        string targetLocalTempPath,
        List<CommitMetadata> commitsToMigrate,
        string newAuthorName,
        string newAuthorEmail,
        Action<int, int>? onCommitCreated = null)
    {
        Repository.Init(targetLocalTempPath);

        using Repository targetRepo = new(targetLocalTempPath);

        string dummyFilePath = Path.Combine(targetLocalTempPath, "MIGRATION_INFO.md");
        File.WriteAllText(dummyFilePath, "Repositório gerado via Git Commit Migrator (Ghost Commits).");
        targetRepo.Index.Clear();
        targetRepo.Index.Add("MIGRATION_INFO.md");
        targetRepo.Index.Write();

        Signature initialSignature = new(newAuthorName, newAuthorEmail, DateTimeOffset.Now);
        targetRepo.Commit("Initial commit", initialSignature, initialSignature);

        Branch currentBranch = targetRepo.Head;

        if (currentBranch.FriendlyName != "main")
        {
            targetRepo.Branches.Rename(currentBranch, "main", allowOverwrite: true);
        }

        int total = commitsToMigrate.Count;
        for (int i = 0; i < total; i++)
        {
            CommitMetadata meta = commitsToMigrate[i];
            Signature signature = new(newAuthorName, newAuthorEmail, meta.When);
            CommitOptions commitOptions = new() { AllowEmptyCommit = true };

            targetRepo.Commit(meta.Message, signature, signature, commitOptions);
            onCommitCreated?.Invoke(i + 1, total);
        }
    }

    public static void PushToRemote(string targetLocalTempPath, string targetRemoteUrl, string targetPatToken)
    {
        using Repository targetRepo = new(targetLocalTempPath);

        if (targetRepo.Network.Remotes["origin"] is not null)
        {
            targetRepo.Network.Remotes.Update("origin", r => r.Url = targetRemoteUrl);
        }
        else
        {
            targetRepo.Network.Remotes.Add("origin", targetRemoteUrl);
        }

        Remote remote = targetRepo.Network.Remotes["origin"]!;

        LibGit2Sharp.Handlers.CredentialsHandler credentials = (_url, _user, _cred) =>
            new UsernamePasswordCredentials
            {
                Username = "PAT",
                Password = targetPatToken
            };

        Commands.Fetch(
            targetRepo,
            "origin",
            ["+refs/heads/main:refs/remotes/origin/main"],
            new FetchOptions { CredentialsProvider = credentials },
            null);

        Commit? remoteTip = targetRepo.Branches["origin/main"]?.Tip;
        if (remoteTip is not null)
        {
            ReplayOntoRemote(targetRepo, remoteTip);
        }

        PushOptions pushOptions = new() { CredentialsProvider = credentials };

        targetRepo.Network.Push(remote, @"refs/heads/main", pushOptions);
    }

    // Remote already has history: rebuild local ghost commits on top of it (no force push),
    // skipping the local "Initial commit" and commits already present remotely (same author email/date/message).
    private static void ReplayOntoRemote(Repository targetRepo, Commit remoteTip)
    {
        Commit localTip = targetRepo.Head.Tip;
        if (targetRepo.ObjectDatabase.FindMergeBase(localTip, remoteTip)?.Sha == remoteTip.Sha)
        {
            return;
        }

        HashSet<(string, DateTimeOffset, string)> existing = targetRepo.Commits
            .QueryBy(new CommitFilter { IncludeReachableFrom = remoteTip })
            .Select(c => (c.Author.Email.ToLowerInvariant(), c.Author.When, c.Message))
            .ToHashSet();

        List<Commit> localGhosts = targetRepo.Commits
            .QueryBy(new CommitFilter
            {
                IncludeReachableFrom = localTip,
                ExcludeReachableFrom = remoteTip,
                SortBy = CommitSortStrategies.Topological | CommitSortStrategies.Reverse
            })
            .Where(c => c.Parents.Any())
            .ToList();

        Commit newTip = remoteTip;
        foreach (Commit ghost in localGhosts)
        {
            if (existing.Contains((ghost.Author.Email.ToLowerInvariant(), ghost.Author.When, ghost.Message)))
            {
                continue;
            }

            newTip = targetRepo.ObjectDatabase.CreateCommit(
                ghost.Author,
                ghost.Committer,
                ghost.Message,
                newTip.Tree,
                [newTip],
                prettifyMessage: false);
        }

        targetRepo.Refs.UpdateTarget("refs/heads/main", newTip.Id.Sha);
    }
}

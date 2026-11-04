using System.Net.Mail;
using LibGit2Sharp;
using Migrator.Models;

namespace Migrator.Services;

public static class MigrationService
{
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

        string targetTemp = request.TargetLocalTempPath?.Trim() ?? string.Empty;
        if (string.IsNullOrEmpty(targetTemp))
        {
            errors[nameof(RunMigrationRequest.TargetLocalTempPath)] = t.ErrTargetTempEmpty;
        }
        else if (!IsValidLocalPath(targetTemp))
        {
            errors[nameof(RunMigrationRequest.TargetLocalTempPath)] = t.ErrTargetTempInvalid;
        }
        else if (!string.IsNullOrEmpty(source) && !IsRemoteUrl(source) && IsValidLocalPath(source) &&
                 string.Equals(Path.GetFullPath(source).TrimEnd('\\', '/'), Path.GetFullPath(targetTemp).TrimEnd('\\', '/'), StringComparison.OrdinalIgnoreCase))
        {
            errors[nameof(RunMigrationRequest.TargetLocalTempPath)] = t.ErrTargetTempSameAsSource;
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

    private static bool IsValidLocalPath(string path)
    {
        try
        {
            if (path.IndexOfAny(Path.GetInvalidPathChars()) >= 0 || !Path.IsPathFullyQualified(path))
            {
                return false;
            }

            _ = Path.GetFullPath(path);
            return true;
        }
        catch
        {
            return false;
        }
    }

    private static bool IsValidEmail(string email)
    {
        return MailAddress.TryCreate(email, out MailAddress? addr) &&
               addr.Address.Equals(email, StringComparison.OrdinalIgnoreCase) &&
               addr.Host.Contains('.');
    }

    public static void RunMigration(RunMigrationRequest request)
    {
        Dictionary<string, string> errors = ValidateRequest(request);
        if (errors.Count > 0)
        {
            throw new ArgumentException(string.Join(Environment.NewLine, errors.Values));
        }

        List<CommitMetadata> commits = ExtractCommits(request.SourceRepoPath.Trim(), request.FilterOriginalEmail.Trim(), request.TargetPatToken.Trim());
        ReconstructHistory(request.TargetLocalTempPath.Trim(), commits, request.NewAuthorName.Trim(), request.NewAuthorEmail.Trim());
        PushToRemote(request.TargetLocalTempPath.Trim(), request.TargetRemoteUrl.Trim(), request.TargetPatToken.Trim());
    }

    public static List<CommitMetadata> ExtractCommits(string sourceRepoPath, string filterOriginalEmail, string? patToken = null)
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

    private static List<CommitMetadata> ExtractCommitsFromLocalRepo(string localRepoPath, string filterOriginalEmail)
    {
        List<CommitMetadata> commitsToMigrate = new();

        using Repository sourceRepo = new(localRepoPath);

        CommitFilter filter = new()
        {
            SortBy = CommitSortStrategies.Topological | CommitSortStrategies.Time,
            IncludeReachableFrom = sourceRepo.Refs
        };

        ICommitLog allCommits = sourceRepo.Commits.QueryBy(filter);

        foreach (Commit? commit in allCommits)
        {
            if (commit.Author.Email.Equals(filterOriginalEmail, StringComparison.OrdinalIgnoreCase))
            {
                commitsToMigrate.Add(new CommitMetadata
                {
                    Message = commit.Message,
                    When = commit.Author.When
                });
            }
        }

        return commitsToMigrate.OrderBy(c => c.When).ToList();
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

    public static void ReconstructHistory(string targetLocalTempPath, List<CommitMetadata> commitsToMigrate, string newAuthorName, string newAuthorEmail)
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

        foreach (CommitMetadata meta in commitsToMigrate)
        {
            Signature signature = new(newAuthorName, newAuthorEmail, meta.When);
            CommitOptions commitOptions = new() { AllowEmptyCommit = true };

            targetRepo.Commit(meta.Message, signature, signature, commitOptions);
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

        PushOptions pushOptions = new()
        {
            CredentialsProvider = (_url, _user, _cred) =>
                new UsernamePasswordCredentials
                {
                    Username = "PAT",
                    Password = targetPatToken
                }
        };

        targetRepo.Network.Push(remote, @"refs/heads/main", pushOptions);
    }
}


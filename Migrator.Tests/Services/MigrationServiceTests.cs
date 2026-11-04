using LibGit2Sharp;
using Migrator.Models;
using Migrator.Services;

namespace Migrator.Tests.Services;

public sealed class MigrationServiceTests : IDisposable
{
    private readonly string _tempRoot;

    public MigrationServiceTests()
    {
        _tempRoot = Path.Combine(Path.GetTempPath(), $"GitCommitMigratorTests_{Guid.NewGuid():N}");
        Directory.CreateDirectory(_tempRoot);
    }

    [Fact]
    public void ExtractCommits_FiltersByEmailCaseInsensitive_AndOrdersChronologically()
    {
        string sourcePath = Path.Combine(_tempRoot, "source-repo");
        Repository.Init(sourcePath);

        DateTimeOffset t1 = new(2024, 1, 10, 10, 0, 0, TimeSpan.Zero);
        DateTimeOffset t2 = new(2024, 1, 11, 12, 0, 0, TimeSpan.Zero);
        DateTimeOffset t3 = new(2024, 1, 12, 14, 0, 0, TimeSpan.Zero);

        using (Repository repo = new(sourcePath))
        {
            CommitEmpty(repo, "First target commit", "Original Dev", "dev@company.com", t1);
            CommitEmpty(repo, "Other author commit", "Other Dev", "other@company.com", t2);
            CommitEmpty(repo, "Second target commit", "Original Dev", "DEV@COMPANY.COM", t3);
        }

        List<CommitMetadata> extracted = MigrationService.ExtractCommits(sourcePath, "Dev@Company.com");

        Assert.Equal(2, extracted.Count);
        Assert.Equal("First target commit\n", extracted[0].Message);
        Assert.Equal(t1, extracted[0].When);
        Assert.Equal("Second target commit\n", extracted[1].Message);
        Assert.Equal(t3, extracted[1].When);
    }

    [Fact]
    public void ReconstructHistory_CreatesMainBranch_InitialCommit_AndGhostCommitsWithNewAuthor()
    {
        string targetPath = Path.Combine(_tempRoot, "target-repo");
        DateTimeOffset commitTime1 = new(2024, 3, 1, 9, 30, 0, TimeSpan.Zero);
        DateTimeOffset commitTime2 = new(2024, 3, 2, 18, 45, 0, TimeSpan.Zero);

        List<CommitMetadata> commitsToMigrate =
        [
            new CommitMetadata { Message = "feat: commit 1", When = commitTime1 },
            new CommitMetadata { Message = "fix: commit 2", When = commitTime2 }
        ];

        MigrationService.ReconstructHistory(
            targetPath,
            commitsToMigrate,
            "New Author",
            "new.author@personal.com");

        using Repository targetRepo = new(targetPath);

        Assert.Equal("main", targetRepo.Head.FriendlyName);
        Assert.True(File.Exists(Path.Combine(targetPath, "MIGRATION_INFO.md")));

        List<Commit> commits = targetRepo.Commits
            .QueryBy(new CommitFilter { SortBy = CommitSortStrategies.Topological | CommitSortStrategies.Reverse })
            .ToList();
        Assert.Equal(3, commits.Count);

        Assert.Equal("Initial commit\n", commits[0].Message);
        Assert.Equal("New Author", commits[0].Author.Name);
        Assert.Equal("new.author@personal.com", commits[0].Author.Email);

        Assert.Equal("feat: commit 1\n", commits[1].Message);
        Assert.Equal("New Author", commits[1].Author.Name);
        Assert.Equal("new.author@personal.com", commits[1].Author.Email);
        Assert.Equal(commitTime1, commits[1].Author.When);

        Assert.Equal("fix: commit 2\n", commits[2].Message);
        Assert.Equal("New Author", commits[2].Author.Name);
        Assert.Equal("new.author@personal.com", commits[2].Author.Email);
        Assert.Equal(commitTime2, commits[2].Author.When);
    }

    [Fact]
    public void ReconstructHistory_IgnoresNestedGitReposAndUnrelatedFilesInTargetTempPath()
    {
        string targetPath = Path.Combine(_tempRoot, "target-with-nested-repo");
        string nestedRepoPath = Path.Combine(targetPath, "M3", "Rep001");
        Repository.Init(nestedRepoPath);
        File.WriteAllText(Path.Combine(nestedRepoPath, "file.txt"), "nested content");
        File.WriteAllText(Path.Combine(targetPath, "unrelated.txt"), "should not be staged");

        List<CommitMetadata> commitsToMigrate =
        [
            new CommitMetadata { Message = "feat: ghost commit", When = new DateTimeOffset(2024, 5, 1, 10, 0, 0, TimeSpan.Zero) }
        ];

        MigrationService.ReconstructHistory(
            targetPath,
            commitsToMigrate,
            "New Author",
            "new.author@personal.com");

        using Repository targetRepo = new(targetPath);
        Assert.Single(targetRepo.Head.Tip.Tree);
        Assert.NotNull(targetRepo.Head.Tip.Tree["MIGRATION_INFO.md"]);
        Assert.Null(targetRepo.Head.Tip.Tree["unrelated.txt"]);
    }

    [Fact]
    public void RunMigration_EndToEnd_ExtractsReconstructsAndPushesToBareRemote_AndReportsProgress()
    {
        string sourcePath = Path.Combine(_tempRoot, "e2e-source");
        string executionDir = Path.Combine(_tempRoot, "e2e-execution-dir");
        string remoteBarePath = Path.Combine(_tempRoot, "e2e-remote.git");

        Directory.CreateDirectory(executionDir);
        Repository.Init(sourcePath);
        Repository.Init(remoteBarePath, isBare: true);

        DateTimeOffset originalWhen = new(2024, 6, 15, 15, 0, 0, TimeSpan.Zero);

        using (Repository sourceRepo = new(sourcePath))
        {
            CommitEmpty(sourceRepo, "feat: migrated commit", "Corp User", "corp@work.com", originalWhen);
            CommitEmpty(sourceRepo, "chore: other user commit", "Other User", "other@work.com", originalWhen.AddHours(1));
        }

        RunMigrationRequest request = new()
        {
            SourceRepoPath = sourcePath,
            TargetRemoteUrl = remoteBarePath,
            FilterOriginalEmail = "corp@work.com",
            NewAuthorName = "Personal User",
            NewAuthorEmail = "personal@home.com",
            TargetPatToken = "dummy-pat"
        };

        List<MigrationProgress> progressReports = new();
        SynchronousProgress<MigrationProgress> progress = new(progressReports.Add);

        string? logFilePath = MigrationService.RunMigration(request, logDirectoryPath: executionDir, progress: progress, language: AppLanguage.PtBr);

        Assert.NotNull(logFilePath);
        Assert.NotEmpty(progressReports);
        Assert.Equal(5, progressReports.First().Percentage);
        Assert.Equal(100, progressReports.Last().Percentage);
        Assert.Equal("Migração concluída!", progressReports.Last().StatusMessage);
        Assert.True(progressReports.Zip(progressReports.Skip(1)).All(pair => pair.Second.Percentage >= pair.First.Percentage));

        using Repository bareRepo = new(remoteBarePath);
        Branch? mainBranch = bareRepo.Branches["main"];
        Assert.NotNull(mainBranch);

        List<Commit> pushedCommits = bareRepo.Commits
            .QueryBy(new CommitFilter
            {
                IncludeReachableFrom = mainBranch,
                SortBy = CommitSortStrategies.Topological | CommitSortStrategies.Reverse
            })
            .ToList();
        Assert.Equal(2, pushedCommits.Count);
        Assert.Equal("Initial commit\n", pushedCommits[0].Message);
        Assert.Equal("feat: migrated commit\n", pushedCommits[1].Message);
        Assert.Equal("Personal User", pushedCommits[1].Author.Name);
        Assert.Equal("personal@home.com", pushedCommits[1].Author.Email);
        Assert.Equal(originalWhen, pushedCommits[1].Author.When);

        Assert.False(Directory.Exists(Path.Combine(executionDir, ".git")));
        Assert.False(File.Exists(Path.Combine(executionDir, "MIGRATION_INFO.md")));

        Assert.True(File.Exists(logFilePath));
        Assert.Matches(@"^migration_\d{8}_\d{4}\.log$", Path.GetFileName(logFilePath));
        string logContent = File.ReadAllText(logFilePath);
        Assert.Contains("Commits encontrados na origem: 2", logContent);
        Assert.Contains("Commits descartados/limpos pelo filtro: 1", logContent);
        Assert.Contains("Commits migrados (ghost commits): 1", logContent);
        Assert.Contains(".git removido: Sim, MIGRATION_INFO.md removido: Sim", logContent);
    }

    [Fact]
    public void ExportAndImportConfiguration_RoundTripsAllRequestFields()
    {
        string configPath = Path.Combine(_tempRoot, "migration-config.json");
        RunMigrationRequest original = new()
        {
            SourceRepoPath = @"C:\Repos\Source",
            SourcePatToken = "ghp_source_secret456",
            TargetRemoteUrl = "https://github.com/user/target.git",
            FilterOriginalEmail = "old@company.com",
            NewAuthorName = "New Dev",
            NewAuthorEmail = "new@personal.com",
            TargetPatToken = "ghp_secret123",
            UseAdvancedSettings = true
        };

        MigrationService.ExportConfiguration(original, configPath);
        Assert.True(File.Exists(configPath));

        RunMigrationRequest imported = MigrationService.ImportConfiguration(configPath);

        Assert.Equal(original.SourceRepoPath, imported.SourceRepoPath);
        Assert.Equal(original.SourcePatToken, imported.SourcePatToken);
        Assert.Equal(original.TargetRemoteUrl, imported.TargetRemoteUrl);
        Assert.Equal(original.FilterOriginalEmail, imported.FilterOriginalEmail);
        Assert.Equal(original.NewAuthorName, imported.NewAuthorName);
        Assert.Equal(original.NewAuthorEmail, imported.NewAuthorEmail);
        Assert.Equal(original.TargetPatToken, imported.TargetPatToken);
        Assert.Equal(original.UseAdvancedSettings, imported.UseAdvancedSettings);
    }

    [Fact]
    public void ValidateRequest_ReturnsErrorsForEmptyOrInvalidFields()
    {
        RunMigrationRequest emptyRequest = new();
        Dictionary<string, string> errors = MigrationService.ValidateRequest(emptyRequest);

        Assert.Equal(6, errors.Count);
        Assert.Contains(nameof(RunMigrationRequest.SourceRepoPath), errors.Keys);
        Assert.Contains(nameof(RunMigrationRequest.TargetRemoteUrl), errors.Keys);
        Assert.Contains(nameof(RunMigrationRequest.FilterOriginalEmail), errors.Keys);
        Assert.Contains(nameof(RunMigrationRequest.NewAuthorName), errors.Keys);
        Assert.Contains(nameof(RunMigrationRequest.NewAuthorEmail), errors.Keys);
        Assert.Contains(nameof(RunMigrationRequest.TargetPatToken), errors.Keys);
        Assert.DoesNotContain(nameof(RunMigrationRequest.SourcePatToken), errors.Keys);
    }

    [Fact]
    public void ValidateRequest_AcceptsRemoteUrlSourceAndValidInputs()
    {
        RunMigrationRequest validRequest = new()
        {
            SourceRepoPath = "https://github.com/org/source-repo.git",
            SourcePatToken = "ghp_optional_source_token",
            TargetRemoteUrl = "https://github.com/user/target-repo.git",
            FilterOriginalEmail = "dev@company.com",
            NewAuthorName = "Dev Name",
            NewAuthorEmail = "dev@personal.com",
            TargetPatToken = "ghp_test123"
        };

        Dictionary<string, string> errors = MigrationService.ValidateRequest(validRequest);

        Assert.Empty(errors);
    }

    [Fact]
    public void ValidateRequest_RejectsInvalidEmailsAndInvalidRepoPaths()
    {
        RunMigrationRequest invalidRequest = new()
        {
            SourceRepoPath = Path.Combine(_tempRoot, "not-a-git-repo"),
            TargetRemoteUrl = "not-a-url-or-repo",
            FilterOriginalEmail = "invalid-email",
            NewAuthorName = "Valid Name",
            NewAuthorEmail = "also-invalid@",
            TargetPatToken = "ghp_test123"
        };

        Dictionary<string, string> errors = MigrationService.ValidateRequest(invalidRequest);

        Assert.Contains(nameof(RunMigrationRequest.SourceRepoPath), errors.Keys);
        Assert.Contains(nameof(RunMigrationRequest.TargetRemoteUrl), errors.Keys);
        Assert.Contains(nameof(RunMigrationRequest.FilterOriginalEmail), errors.Keys);
        Assert.Contains(nameof(RunMigrationRequest.NewAuthorEmail), errors.Keys);
        Assert.DoesNotContain(nameof(RunMigrationRequest.NewAuthorName), errors.Keys);
        Assert.DoesNotContain(nameof(RunMigrationRequest.TargetPatToken), errors.Keys);
    }

    [Theory]
    [InlineData(AppLanguage.PtBr, "Informe o nome do novo autor.")]
    [InlineData(AppLanguage.EnUs, "Enter the new author name.")]
    [InlineData(AppLanguage.Es, "Ingrese el nombre del nuevo autor.")]
    public void ValidateRequest_TranslatesErrorsAccordingToSelectedLanguage(AppLanguage language, string expectedError)
    {
        RunMigrationRequest emptyRequest = new();
        Dictionary<string, string> errors = MigrationService.ValidateRequest(emptyRequest, language);

        Assert.Equal(expectedError, errors[nameof(RunMigrationRequest.NewAuthorName)]);
    }

    [Fact]
    public void FilterCommitsByPeriod_ReturnsOnlyCommitsWithinInclusiveDateRange()
    {
        List<CommitMetadata> commits =
        [
            new CommitMetadata { Message = "c1", When = new DateTimeOffset(2024, 1, 10, 8, 0, 0, TimeSpan.Zero) },
            new CommitMetadata { Message = "c2", When = new DateTimeOffset(2024, 1, 15, 14, 0, 0, TimeSpan.Zero) },
            new CommitMetadata { Message = "c3", When = new DateTimeOffset(2024, 1, 20, 22, 0, 0, TimeSpan.Zero) }
        ];

        DateTime start = commits[1].When.LocalDateTime.Date;
        DateTime end = commits[1].When.LocalDateTime.Date;

        List<CommitMetadata> filtered = MigrationService.FilterCommitsByPeriod(commits, start, end);

        Assert.Single(filtered);
        Assert.Equal("c2", filtered[0].Message);
    }

    [Fact]
    public void RunMigration_WithAdvancedSettingsEnabled_InvokesSelectionCallbackAndMigratesOnlySelected()
    {
        string sourcePath = Path.Combine(_tempRoot, "adv-source");
        string executionDir = Path.Combine(_tempRoot, "adv-execution-dir");
        string remoteBarePath = Path.Combine(_tempRoot, "adv-remote.git");

        Directory.CreateDirectory(executionDir);
        Repository.Init(sourcePath);
        Repository.Init(remoteBarePath, isBare: true);

        DateTimeOffset t1 = new(2024, 6, 10, 10, 0, 0, TimeSpan.Zero);
        DateTimeOffset t2 = new(2024, 6, 11, 10, 0, 0, TimeSpan.Zero);

        using (Repository sourceRepo = new(sourcePath))
        {
            CommitEmpty(sourceRepo, "feat: commit 1", "Corp User", "corp@work.com", t1);
            CommitEmpty(sourceRepo, "feat: commit 2", "Corp User", "corp@work.com", t2);
        }

        RunMigrationRequest request = new()
        {
            SourceRepoPath = sourcePath,
            TargetRemoteUrl = remoteBarePath,
            FilterOriginalEmail = "corp@work.com",
            NewAuthorName = "Personal User",
            NewAuthorEmail = "personal@home.com",
            TargetPatToken = "dummy-pat",
            UseAdvancedSettings = true
        };

        bool callbackInvoked = false;
        string? logFilePath = MigrationService.RunMigration(
            request,
            logDirectoryPath: executionDir,
            selectCommitsCallback: commits =>
            {
                callbackInvoked = true;
                Assert.Equal(2, commits.Count);
                return [commits[1]];
            });

        Assert.True(callbackInvoked);
        Assert.NotNull(logFilePath);

        using Repository bareRepo = new(remoteBarePath);
        List<Commit> pushedCommits = bareRepo.Commits
            .QueryBy(new CommitFilter
            {
                IncludeReachableFrom = bareRepo.Branches["main"],
                SortBy = CommitSortStrategies.Topological | CommitSortStrategies.Reverse
            })
            .ToList();

        Assert.Equal(2, pushedCommits.Count);
        Assert.Equal("Initial commit\n", pushedCommits[0].Message);
        Assert.Equal("feat: commit 2\n", pushedCommits[1].Message);
    }

    [Fact]
    public void RunMigration_WithAdvancedSettingsCanceled_ReturnsNullAndDoesNotPush()
    {
        string sourcePath = Path.Combine(_tempRoot, "cancel-source");
        string executionDir = Path.Combine(_tempRoot, "cancel-execution-dir");
        string remoteBarePath = Path.Combine(_tempRoot, "cancel-remote.git");

        Directory.CreateDirectory(executionDir);
        Repository.Init(sourcePath);
        Repository.Init(remoteBarePath, isBare: true);

        using (Repository sourceRepo = new(sourcePath))
        {
            CommitEmpty(sourceRepo, "feat: commit 1", "Corp User", "corp@work.com", DateTimeOffset.Now);
        }

        RunMigrationRequest request = new()
        {
            SourceRepoPath = sourcePath,
            TargetRemoteUrl = remoteBarePath,
            FilterOriginalEmail = "corp@work.com",
            NewAuthorName = "Personal User",
            NewAuthorEmail = "personal@home.com",
            TargetPatToken = "dummy-pat",
            UseAdvancedSettings = true
        };

        string? logFilePath = MigrationService.RunMigration(
            request,
            logDirectoryPath: executionDir,
            selectCommitsCallback: _ => null);

        Assert.Null(logFilePath);
        using Repository bareRepo = new(remoteBarePath);
        Assert.Null(bareRepo.Branches["main"]);
    }

    [Fact]
    public void RunMigration_WhenRemoteAlreadyHasHistory_AppendsWithoutForcePush_AndSkipsAlreadyMigratedCommits()
    {
        string sourcePath = Path.Combine(_tempRoot, "existing-source");
        string seedPath = Path.Combine(_tempRoot, "existing-seed");
        string remoteBarePath = Path.Combine(_tempRoot, "existing-remote.git");
        Repository.Init(sourcePath);
        Repository.Init(remoteBarePath, isBare: true);

        DateTimeOffset when = new(2024, 7, 1, 10, 0, 0, TimeSpan.Zero);
        using (Repository sourceRepo = new(sourcePath))
        {
            CommitEmpty(sourceRepo, "feat: work", "Corp User", "corp@work.com", when);
        }

        // Remote created with its own commit (e.g. README) -> previously "cannot push because a reference ... contains commits that are not present locally"
        Repository.Init(seedPath);
        using (Repository seedRepo = new(seedPath))
        {
            File.WriteAllText(Path.Combine(seedPath, "README.md"), "remote readme");
            Commands.Stage(seedRepo, "README.md");
            Signature sig = new("Remote", "remote@home.com", when.AddDays(-10));
            seedRepo.Commit("Add README", sig, sig);
            if (seedRepo.Head.FriendlyName != "main")
            {
                seedRepo.Branches.Rename(seedRepo.Head, "main");
            }
            seedRepo.Network.Remotes.Add("origin", remoteBarePath);
            seedRepo.Network.Push(seedRepo.Network.Remotes["origin"], "refs/heads/main");
        }

        RunMigrationRequest request = new()
        {
            SourceRepoPath = sourcePath,
            TargetRemoteUrl = remoteBarePath,
            FilterOriginalEmail = "corp@work.com",
            NewAuthorName = "Personal User",
            NewAuthorEmail = "personal@home.com",
            TargetPatToken = "dummy-pat"
        };

        MigrationService.RunMigration(request, logDirectoryPath: Path.Combine(_tempRoot, "existing-exec-1"));
        MigrationService.RunMigration(request, logDirectoryPath: Path.Combine(_tempRoot, "existing-exec-2"));

        using Repository bareRepo = new(remoteBarePath);
        List<Commit> pushed = bareRepo.Commits
            .QueryBy(new CommitFilter
            {
                IncludeReachableFrom = bareRepo.Branches["main"],
                SortBy = CommitSortStrategies.Topological | CommitSortStrategies.Reverse
            })
            .ToList();

        Assert.Equal(2, pushed.Count);
        Assert.Equal("Add README\n", pushed[0].Message);
        Assert.Equal("feat: work\n", pushed[1].Message);
        Assert.Equal("personal@home.com", pushed[1].Author.Email);
        Assert.Equal(when, pushed[1].Author.When);
        Assert.NotNull(pushed[1].Tree["README.md"]);
    }

    [Fact]
    public void ErrorLogService_WritesStackTrace_AndEncryptsSensitiveData()
    {
        string logDir = Path.Combine(_tempRoot, "error-logs");
        Exception ex;
        try
        {
            throw new InvalidOperationException("push failed for ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZ0123 at https://user:secret-pass@github.com/x.git by corp@work.com using my-pat-token");
        }
        catch (Exception caught)
        {
            ex = caught;
        }

        string? logPath = ErrorLogService.LogException(ex, "Test", ["my-pat-token"], logDir);

        Assert.NotNull(logPath);
        string content = File.ReadAllText(logPath);
        Assert.Contains("InvalidOperationException", content);
        Assert.Contains(nameof(ErrorLogService_WritesStackTrace_AndEncryptsSensitiveData), content);
        Assert.DoesNotContain("my-pat-token", content);
        Assert.DoesNotContain("ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZ0123", content);
        Assert.DoesNotContain("secret-pass", content);
        Assert.DoesNotContain("corp@work.com", content);

        string token = System.Text.RegularExpressions.Regex.Match(content, @"\[ENC:[^\]]+\]").Value;
        Assert.False(string.IsNullOrEmpty(token));
        Assert.Contains(ErrorLogService.Decrypt(token), new[] { "ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZ0123", "user:secret-pass", "corp@work.com", "my-pat-token" });
    }

    private sealed class SynchronousProgress<T>(Action<T> handler) : IProgress<T>
    {
        public void Report(T value) => handler(value);
    }

    private static void CommitEmpty(Repository repo, string message, string name, string email, DateTimeOffset when)
    {
        Signature sig = new(name, email, when);
        repo.Commit(message, sig, sig, new CommitOptions { AllowEmptyCommit = true });
    }

    public void Dispose()
    {
        try
        {
            if (!Directory.Exists(_tempRoot))
            {
                return;
            }

            foreach (string file in Directory.GetFiles(_tempRoot, "*", SearchOption.AllDirectories))
            {
                File.SetAttributes(file, FileAttributes.Normal);
            }

            Directory.Delete(_tempRoot, recursive: true);
        }
        catch
        {
            // Ignore cleanup locks on Windows temp dir
        }
    }
}

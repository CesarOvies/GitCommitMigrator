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
    public void RunMigration_EndToEnd_ExtractsReconstructsAndPushesToBareRemote_AndReportsProgress()
    {
        string sourcePath = Path.Combine(_tempRoot, "e2e-source");
        string targetTempPath = Path.Combine(_tempRoot, "e2e-target-temp");
        string remoteBarePath = Path.Combine(_tempRoot, "e2e-remote.git");

        Repository.Init(sourcePath);
        Repository.Init(remoteBarePath, isBare: true);

        DateTimeOffset originalWhen = new(2024, 6, 15, 15, 0, 0, TimeSpan.Zero);

        using (Repository sourceRepo = new(sourcePath))
        {
            CommitEmpty(sourceRepo, "feat: migrated commit", "Corp User", "corp@work.com", originalWhen);
        }

        RunMigrationRequest request = new()
        {
            SourceRepoPath = sourcePath,
            TargetLocalTempPath = targetTempPath,
            TargetRemoteUrl = remoteBarePath,
            FilterOriginalEmail = "corp@work.com",
            NewAuthorName = "Personal User",
            NewAuthorEmail = "personal@home.com",
            TargetPatToken = "dummy-pat"
        };

        List<MigrationProgress> progressReports = new();
        SynchronousProgress<MigrationProgress> progress = new(progressReports.Add);

        MigrationService.RunMigration(request, progress, AppLanguage.PtBr);

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
    }

    [Fact]
    public void ExportAndImportConfiguration_RoundTripsAllRequestFields()
    {
        string configPath = Path.Combine(_tempRoot, "migration-config.json");
        RunMigrationRequest original = new()
        {
            SourceRepoPath = @"C:\Repos\Source",
            TargetLocalTempPath = @"C:\Temp\Target",
            TargetRemoteUrl = "https://github.com/user/target.git",
            FilterOriginalEmail = "old@company.com",
            NewAuthorName = "New Dev",
            NewAuthorEmail = "new@personal.com",
            TargetPatToken = "ghp_secret123"
        };

        MigrationService.ExportConfiguration(original, configPath);
        Assert.True(File.Exists(configPath));

        RunMigrationRequest imported = MigrationService.ImportConfiguration(configPath);

        Assert.Equal(original.SourceRepoPath, imported.SourceRepoPath);
        Assert.Equal(original.TargetLocalTempPath, imported.TargetLocalTempPath);
        Assert.Equal(original.TargetRemoteUrl, imported.TargetRemoteUrl);
        Assert.Equal(original.FilterOriginalEmail, imported.FilterOriginalEmail);
        Assert.Equal(original.NewAuthorName, imported.NewAuthorName);
        Assert.Equal(original.NewAuthorEmail, imported.NewAuthorEmail);
        Assert.Equal(original.TargetPatToken, imported.TargetPatToken);
    }

    [Fact]
    public void ValidateRequest_ReturnsErrorsForEmptyOrInvalidFields()
    {
        RunMigrationRequest emptyRequest = new();
        Dictionary<string, string> errors = MigrationService.ValidateRequest(emptyRequest);

        Assert.Equal(7, errors.Count);
        Assert.Contains(nameof(RunMigrationRequest.SourceRepoPath), errors.Keys);
        Assert.Contains(nameof(RunMigrationRequest.TargetLocalTempPath), errors.Keys);
        Assert.Contains(nameof(RunMigrationRequest.TargetRemoteUrl), errors.Keys);
        Assert.Contains(nameof(RunMigrationRequest.FilterOriginalEmail), errors.Keys);
        Assert.Contains(nameof(RunMigrationRequest.NewAuthorName), errors.Keys);
        Assert.Contains(nameof(RunMigrationRequest.NewAuthorEmail), errors.Keys);
        Assert.Contains(nameof(RunMigrationRequest.TargetPatToken), errors.Keys);
    }

    [Fact]
    public void ValidateRequest_AcceptsRemoteUrlSourceAndValidInputs()
    {
        RunMigrationRequest validRequest = new()
        {
            SourceRepoPath = "https://github.com/org/source-repo.git",
            TargetLocalTempPath = Path.Combine(_tempRoot, "temp-target"),
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
            TargetLocalTempPath = "relative/path",
            TargetRemoteUrl = "not-a-url-or-repo",
            FilterOriginalEmail = "invalid-email",
            NewAuthorName = "Valid Name",
            NewAuthorEmail = "also-invalid@",
            TargetPatToken = "ghp_test123"
        };

        Dictionary<string, string> errors = MigrationService.ValidateRequest(invalidRequest);

        Assert.Contains(nameof(RunMigrationRequest.SourceRepoPath), errors.Keys);
        Assert.Contains(nameof(RunMigrationRequest.TargetLocalTempPath), errors.Keys);
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

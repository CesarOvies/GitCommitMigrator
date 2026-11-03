using LibGit2Sharp;
using Migrator.Models;

namespace Migrator.Services;

public static class MigrationService
{
    public static void RunMigration(RunMigrationRequest request)
    {
        List<CommitMetadata> commits = ExtractCommits(request.SourceRepoPath, request.FilterOriginalEmail);
        ReconstructHistory(request.TargetLocalTempPath, commits, request.NewAuthorName, request.NewAuthorEmail);
        PushToRemote(request.TargetLocalTempPath, request.TargetRemoteUrl, request.TargetPatToken);
    }

    public static List<CommitMetadata> ExtractCommits(string sourceRepoPath, string filterOriginalEmail)
    {
        List<CommitMetadata> commitsToMigrate = new();

        using Repository sourceRepo = new(sourceRepoPath);

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

    public static void ReconstructHistory(string targetLocalTempPath, List<CommitMetadata> commitsToMigrate, string newAuthorName, string newAuthorEmail)
    {
        Repository.Init(targetLocalTempPath);

        using Repository targetRepo = new(targetLocalTempPath);

        string dummyFilePath = Path.Combine(targetLocalTempPath, "MIGRATION_INFO.md");
        File.WriteAllText(dummyFilePath, "Repositório gerado via Git Commit Migrator (Ghost Commits).");
        Commands.Stage(targetRepo, "*");

        Signature initialSignature = new(newAuthorName, newAuthorEmail, DateTimeOffset.Now);
        targetRepo.Commit("Initial commit", initialSignature, initialSignature);

        Branch currentBranch = targetRepo.Head;

        if (currentBranch.FriendlyName != "main")
        {
            targetRepo.Branches.Rename(currentBranch, "main");
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

        Remote remote = targetRepo.Network.Remotes.Add("origin", targetRemoteUrl);

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


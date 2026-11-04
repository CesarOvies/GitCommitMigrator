namespace Migrator.Models;

public class RunMigrationRequest
{
    public string SourceRepoPath { get; set; } = string.Empty;

    public string SourcePatToken { get; set; } = string.Empty;

    public string TargetRemoteUrl { get; set; } = string.Empty;

    public string FilterOriginalEmail { get; set; } = string.Empty;

    public string NewAuthorName { get; set; } = string.Empty;

    public string NewAuthorEmail { get; set; } = string.Empty;

    public string TargetPatToken { get; set; } = string.Empty;
}

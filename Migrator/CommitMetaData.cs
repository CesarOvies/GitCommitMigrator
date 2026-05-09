namespace Migrator;

public class CommitMetadata
{
    public string Message { get; set; } = string.Empty;

    public DateTimeOffset When { get; set; }
}
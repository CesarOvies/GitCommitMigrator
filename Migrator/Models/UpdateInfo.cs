namespace Migrator.Models;

public sealed record UpdateInfo(
    bool HasUpdate,
    string CurrentVersion,
    string LatestVersion,
    string? DownloadUrl,
    string? AssetName,
    long AssetSizeBytes,
    string? ReleaseNotes);


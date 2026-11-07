using System;
using System.Diagnostics;
using System.IO;
using System.IO.Compression;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Reflection;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Migrator.Models;

namespace Migrator.Services;

public static class UpdateService
{
    private const string DefaultOwner = "CesarOvies";
    private const string DefaultRepo = "GitCommitMigrator";
    private const string GitHubApiBaseUrl = "https://api.github.com/repos";

    private static readonly Lazy<HttpClient> LazyHttpClient = new(() =>
    {
        var client = new HttpClient();
        client.DefaultRequestHeaders.UserAgent.Add(new ProductInfoHeaderValue("GitCommitMigrator", "1.0"));
        client.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/vnd.github.v3+json"));
        client.Timeout = TimeSpan.FromSeconds(15);
        return client;
    });

    public static HttpClient SharedHttpClient => LazyHttpClient.Value;

    public static string GetCurrentVersionString()
    {
        Assembly assembly = typeof(UpdateService).Assembly;
        string? infoVer = assembly.GetCustomAttribute<AssemblyInformationalVersionAttribute>()?.InformationalVersion;
        if (!string.IsNullOrWhiteSpace(infoVer))
        {
            int plusIndex = infoVer.IndexOf('+');
            if (plusIndex >= 0)
            {
                infoVer = infoVer[..plusIndex];
            }
            if (TryParseCleanVersion(infoVer, out Version? parsedInfo) && parsedInfo is not null)
            {
                return $"{parsedInfo.Major}.{parsedInfo.Minor}.{Math.Max(0, parsedInfo.Build)}";
            }
        }

        Version? assemblyVer = assembly.GetName().Version;
        if (assemblyVer is not null && assemblyVer != new Version(0, 0, 0, 0))
        {
            return $"{assemblyVer.Major}.{assemblyVer.Minor}.{Math.Max(0, assemblyVer.Build)}";
        }

        return "1.0.0";
    }

    public static bool TryParseCleanVersion(string? versionString, out Version? version)
    {
        version = null;
        if (string.IsNullOrWhiteSpace(versionString))
        {
            return false;
        }

        string clean = versionString.Trim();
        if (clean.StartsWith('v') || clean.StartsWith('V'))
        {
            clean = clean[1..];
        }

        int separatorIndex = clean.IndexOfAny(['-', '+']);
        if (separatorIndex >= 0)
        {
            clean = clean[..separatorIndex];
        }

        string[] parts = clean.Split('.');
        if (parts.Length == 1 && int.TryParse(parts[0], out int major))
        {
            clean = $"{major}.0";
        }

        return Version.TryParse(clean, out version);
    }

    public static bool IsNewerVersion(string? latestTagOrVersion, string? currentVersionString)
    {
        if (TryParseCleanVersion(latestTagOrVersion, out Version? latest) &&
            TryParseCleanVersion(currentVersionString, out Version? current) &&
            latest is not null &&
            current is not null)
        {
            return latest > current;
        }

        return false;
    }

    public static async Task<UpdateInfo> CheckForUpdatesAsync(
        string repositoryOwner = DefaultOwner,
        string repositoryName = DefaultRepo,
        string? currentVersionOverride = null,
        HttpClient? customHttpClient = null,
        CancellationToken cancellationToken = default)
    {
        string currentVersion = currentVersionOverride ?? GetCurrentVersionString();

        try
        {
            HttpClient client = customHttpClient ?? SharedHttpClient;
            string url = $"{GitHubApiBaseUrl}/{repositoryOwner}/{repositoryName}/releases/latest";

            using HttpResponseMessage response = await client.GetAsync(url, cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                return new UpdateInfo(
                    HasUpdate: false,
                    CurrentVersion: currentVersion,
                    LatestVersion: currentVersion,
                    DownloadUrl: null,
                    AssetName: null,
                    AssetSizeBytes: 0,
                    ReleaseNotes: null);
            }

            await using Stream stream = await response.Content.ReadAsStreamAsync(cancellationToken);
            using JsonDocument doc = await JsonDocument.ParseAsync(stream, cancellationToken: cancellationToken);
            JsonElement root = doc.RootElement;

            string? tagName = root.TryGetProperty("tag_name", out JsonElement tagElem) ? tagElem.GetString() : null;
            string? body = root.TryGetProperty("body", out JsonElement bodyElem) ? bodyElem.GetString() : null;

            string latestVersion = tagName ?? currentVersion;
            bool isNewer = IsNewerVersion(latestVersion, currentVersion);

            string? downloadUrl = null;
            string? assetName = null;
            long assetSize = 0;

            if (root.TryGetProperty("assets", out JsonElement assetsElem) && assetsElem.ValueKind == JsonValueKind.Array)
            {
                foreach (JsonElement asset in assetsElem.EnumerateArray())
                {
                    string? name = asset.TryGetProperty("name", out JsonElement n) ? n.GetString() : null;
                    if (name is null || !name.EndsWith(".zip", StringComparison.OrdinalIgnoreCase))
                    {
                        continue;
                    }

                    if (name.Contains("win-x64", StringComparison.OrdinalIgnoreCase) ||
                        name.Contains("portable", StringComparison.OrdinalIgnoreCase) ||
                        downloadUrl is null)
                    {
                        assetName = name;
                        downloadUrl = asset.TryGetProperty("browser_download_url", out JsonElement u) ? u.GetString() : null;
                        assetSize = asset.TryGetProperty("size", out JsonElement s) ? s.GetInt64() : 0;

                        if (name.Contains("win-x64", StringComparison.OrdinalIgnoreCase))
                        {
                            break;
                        }
                    }
                }
            }

            return new UpdateInfo(
                HasUpdate: isNewer && !string.IsNullOrWhiteSpace(downloadUrl),
                CurrentVersion: currentVersion,
                LatestVersion: latestVersion.TrimStart('v', 'V'),
                DownloadUrl: downloadUrl,
                AssetName: assetName,
                AssetSizeBytes: assetSize,
                ReleaseNotes: body);
        }
        catch (Exception ex)
        {
            ErrorLogService.LogException(ex, "CheckForUpdatesAsync");
            return new UpdateInfo(
                HasUpdate: false,
                CurrentVersion: currentVersion,
                LatestVersion: currentVersion,
                DownloadUrl: null,
                AssetName: null,
                AssetSizeBytes: 0,
                ReleaseNotes: null);
        }
    }

    public static async Task DownloadUpdateAsync(
        string downloadUrl,
        string destinationFilePath,
        IProgress<int>? progress = null,
        HttpClient? customHttpClient = null,
        CancellationToken cancellationToken = default)
    {
        HttpClient client = customHttpClient ?? SharedHttpClient;
        using HttpResponseMessage response = await client.GetAsync(downloadUrl, HttpCompletionOption.ResponseHeadersRead, cancellationToken);
        response.EnsureSuccessStatusCode();

        long? totalBytes = response.Content.Headers.ContentLength;
        string? directory = Path.GetDirectoryName(destinationFilePath);
        if (!string.IsNullOrEmpty(directory))
        {
            Directory.CreateDirectory(directory);
        }

        await using Stream source = await response.Content.ReadAsStreamAsync(cancellationToken);
        await using FileStream destination = new(destinationFilePath, FileMode.Create, FileAccess.Write, FileShare.None, 81920, true);

        byte[] buffer = new byte[81920];
        long totalRead = 0;
        int bytesRead;

        while ((bytesRead = await source.ReadAsync(buffer, cancellationToken)) > 0)
        {
            await destination.WriteAsync(buffer.AsMemory(0, bytesRead), cancellationToken);
            totalRead += bytesRead;

            if (totalBytes.HasValue && totalBytes.Value > 0)
            {
                int percentage = (int)Math.Round((double)totalRead / totalBytes.Value * 100);
                progress?.Report(Math.Clamp(percentage, 0, 100));
            }
        }
    }

    public static string BuildUpdaterScript(int currentProcessId, string sourceDirectoryPath, string targetDirectoryPath, string targetExePath, string tempRootPath)
    {
        string escapedSource = sourceDirectoryPath.TrimEnd('\\');
        string escapedTarget = targetDirectoryPath.TrimEnd('\\');
        string escapedExe = targetExePath;
        string escapedTemp = tempRootPath.TrimEnd('\\');

        return string.Join("; ",
            $"Wait-Process -Id {currentProcessId} -ErrorAction SilentlyContinue",
            "Start-Sleep -Milliseconds 600",
            $"Copy-Item -Path '{escapedSource}\\*' -Destination '{escapedTarget}' -Recurse -Force",
            $"Start-Process -FilePath '{escapedExe}'",
            $"Remove-Item -Path '{escapedTemp}' -Recurse -Force -ErrorAction SilentlyContinue");
    }

    public static void ApplyUpdateAndRestart(
        string zipFilePath,
        string? targetExePathOverride = null,
        Action? exitAction = null,
        Action<ProcessStartInfo>? processStarter = null)
    {
        string targetExePath = targetExePathOverride ??
                               Environment.ProcessPath ??
                               Process.GetCurrentProcess().MainModule?.FileName ??
                               throw new InvalidOperationException("Could not determine current executable path.");

        string targetDirectory = Path.GetDirectoryName(targetExePath) ??
                                 throw new InvalidOperationException("Could not determine target directory.");

        string tempRoot = Path.Combine(Path.GetTempPath(), "GitCommitMigrator_Update", Guid.NewGuid().ToString("N"));
        string extractDir = Path.Combine(tempRoot, "extracted");
        Directory.CreateDirectory(extractDir);

        ZipFile.ExtractToDirectory(zipFilePath, extractDir, overwriteFiles: true);

        string sourceDir = extractDir;
        string targetExeName = Path.GetFileName(targetExePath);
        string[] matchingFiles = Directory.GetFiles(extractDir, targetExeName, SearchOption.AllDirectories);
        if (matchingFiles.Length > 0)
        {
            string? foundDir = Path.GetDirectoryName(matchingFiles[0]);
            if (!string.IsNullOrEmpty(foundDir))
            {
                sourceDir = foundDir;
            }
        }

        int currentPid = Environment.ProcessId;
        string script = BuildUpdaterScript(currentPid, sourceDir, targetDirectory, targetExePath, tempRoot);

        var startInfo = new ProcessStartInfo
        {
            FileName = "powershell.exe",
            Arguments = $"-NoProfile -WindowStyle Hidden -Command \"{script}\"",
            UseShellExecute = false,
            CreateNoWindow = true
        };

        if (processStarter is not null)
        {
            processStarter(startInfo);
        }
        else
        {
            Process.Start(startInfo);
        }

        if (exitAction is not null)
        {
            exitAction();
        }
        else
        {
            Environment.Exit(0);
        }
    }
}

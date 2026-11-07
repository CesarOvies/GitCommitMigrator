using System;
using System.Diagnostics;
using System.IO;
using System.IO.Compression;
using System.Net;
using System.Net.Http;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using Migrator.Models;
using Migrator.Services;
using Xunit;

namespace Migrator.Tests.Services;

public sealed class UpdateServiceTests : IDisposable
{
    private readonly string _tempRoot;

    public UpdateServiceTests()
    {
        _tempRoot = Path.Combine(Path.GetTempPath(), $"UpdateServiceTests_{Guid.NewGuid():N}");
        Directory.CreateDirectory(_tempRoot);
    }

    public void Dispose()
    {
        if (Directory.Exists(_tempRoot))
        {
            try
            {
                Directory.Delete(_tempRoot, recursive: true);
            }
            catch
            {
                // Best effort cleanup
            }
        }
    }

    [Theory]
    [InlineData("1.0.0", 1, 0, 0)]
    [InlineData("v1.2.3", 1, 2, 3)]
    [InlineData("V2.1.0", 2, 1, 0)]
    [InlineData("v1.0.5-beta", 1, 0, 5)]
    [InlineData("1.0.5+build.123", 1, 0, 5)]
    [InlineData("3", 3, 0, 0)]
    public void TryParseCleanVersion_ValidVersions_ReturnsTrueAndCorrectVersion(string input, int major, int minor, int build)
    {
        bool success = UpdateService.TryParseCleanVersion(input, out Version? version);

        Assert.True(success);
        Assert.NotNull(version);
        Assert.Equal(major, version.Major);
        Assert.Equal(minor, version.Minor);
        Assert.Equal(build, Math.Max(0, version.Build));
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("invalid-version")]
    [InlineData("v")]
    public void TryParseCleanVersion_InvalidVersions_ReturnsFalse(string? input)
    {
        bool success = UpdateService.TryParseCleanVersion(input, out Version? version);

        Assert.False(success);
        Assert.Null(version);
    }

    [Theory]
    [InlineData("v1.0.1", "1.0.0", true)]
    [InlineData("2.0.0", "1.9.9", true)]
    [InlineData("v1.1.0", "1.0.9", true)]
    [InlineData("v1.0.0", "1.0.0", false)]
    [InlineData("1.0.0", "1.0.1", false)]
    [InlineData("v0.9.9", "1.0.0", false)]
    [InlineData("invalid", "1.0.0", false)]
    [InlineData(null, "1.0.0", false)]
    [InlineData("v1.0.1", null, false)]
    public void IsNewerVersion_ComparesCorrectly(string? latest, string? current, bool expected)
    {
        bool result = UpdateService.IsNewerVersion(latest, current);

        Assert.Equal(expected, result);
    }

    [Fact]
    public async Task CheckForUpdatesAsync_WhenNewerReleaseExists_ReturnsHasUpdateTrue()
    {
        string json = """
        {
          "tag_name": "v1.1.0",
          "body": "Release v1.1.0 with awesome features",
          "assets": [
            {
              "name": "Git.Commit.Migrator-v1.1.0-win-x64-portable.zip",
              "size": 1048576,
              "browser_download_url": "https://github.com/CesarOvies/GitCommitMigrator/releases/download/v1.1.0/Git.Commit.Migrator-v1.1.0-win-x64-portable.zip"
            }
          ]
        }
        """;

        using var handler = new MockHttpMessageHandler(HttpStatusCode.OK, json);
        using var client = new HttpClient(handler);

        UpdateInfo info = await UpdateService.CheckForUpdatesAsync(
            currentVersionOverride: "1.0.0",
            customHttpClient: client);

        Assert.True(info.HasUpdate);
        Assert.Equal("1.0.0", info.CurrentVersion);
        Assert.Equal("1.1.0", info.LatestVersion);
        Assert.Equal("Git.Commit.Migrator-v1.1.0-win-x64-portable.zip", info.AssetName);
        Assert.Equal("https://github.com/CesarOvies/GitCommitMigrator/releases/download/v1.1.0/Git.Commit.Migrator-v1.1.0-win-x64-portable.zip", info.DownloadUrl);
        Assert.Equal(1048576, info.AssetSizeBytes);
    }

    [Fact]
    public async Task CheckForUpdatesAsync_WhenCurrentVersionIsSameOrNewer_ReturnsHasUpdateFalse()
    {
        string json = """
        {
          "tag_name": "v1.0.0",
          "assets": [
            {
              "name": "Git.Commit.Migrator-v1.0.0-win-x64-portable.zip",
              "size": 1024,
              "browser_download_url": "https://example.com/download.zip"
            }
          ]
        }
        """;

        using var handler = new MockHttpMessageHandler(HttpStatusCode.OK, json);
        using var client = new HttpClient(handler);

        UpdateInfo info = await UpdateService.CheckForUpdatesAsync(
            currentVersionOverride: "1.0.0",
            customHttpClient: client);

        Assert.False(info.HasUpdate);
    }

    [Fact]
    public async Task CheckForUpdatesAsync_WhenHttpErrorOccurs_ReturnsHasUpdateFalseWithoutThrowing()
    {
        using var handler = new MockHttpMessageHandler(HttpStatusCode.NotFound, "Not Found");
        using var client = new HttpClient(handler);

        UpdateInfo info = await UpdateService.CheckForUpdatesAsync(
            currentVersionOverride: "1.0.0",
            customHttpClient: client);

        Assert.False(info.HasUpdate);
        Assert.Equal("1.0.0", info.CurrentVersion);
    }

    [Fact]
    public void BuildUpdaterScript_ContainsRequiredPowerShellCommands()
    {
        int pid = 12345;
        string sourceDir = @"C:\Temp\Update\extracted";
        string targetDir = @"C:\App";
        string targetExe = @"C:\App\Git.Commit.Migrator.exe";
        string tempRoot = @"C:\Temp\Update";

        string script = UpdateService.BuildUpdaterScript(pid, sourceDir, targetDir, targetExe, tempRoot);

        Assert.Contains("Wait-Process -Id 12345", script);
        Assert.Contains("Copy-Item", script);
        Assert.Contains("Start-Process -FilePath 'C:\\App\\Git.Commit.Migrator.exe'", script);
        Assert.Contains("Remove-Item -Path 'C:\\Temp\\Update'", script);
    }

    [Fact]
    public void ApplyUpdateAndRestart_ExtractsZip_AndInvokesProcessStarterAndExitAction()
    {
        string dummyTargetDir = Path.Combine(_tempRoot, "App");
        Directory.CreateDirectory(dummyTargetDir);
        string dummyTargetExe = Path.Combine(dummyTargetDir, "Git.Commit.Migrator.exe");
        File.WriteAllText(dummyTargetExe, "Old binary content");

        // Create a test zip file containing the updated exe
        string zipSourceDir = Path.Combine(_tempRoot, "ZipSource");
        Directory.CreateDirectory(zipSourceDir);
        File.WriteAllText(Path.Combine(zipSourceDir, "Git.Commit.Migrator.exe"), "New binary content");
        File.WriteAllText(Path.Combine(zipSourceDir, "README.md"), "# Updated Readme");

        string testZipPath = Path.Combine(_tempRoot, "update.zip");
        ZipFile.CreateFromDirectory(zipSourceDir, testZipPath);

        ProcessStartInfo? capturedStartInfo = null;
        bool exitActionCalled = false;

        UpdateService.ApplyUpdateAndRestart(
            zipFilePath: testZipPath,
            targetExePathOverride: dummyTargetExe,
            exitAction: () => exitActionCalled = true,
            processStarter: psi => capturedStartInfo = psi);

        Assert.True(exitActionCalled);
        Assert.NotNull(capturedStartInfo);
        Assert.Equal("powershell.exe", capturedStartInfo.FileName);
        Assert.Contains("Wait-Process", capturedStartInfo.Arguments);
        Assert.Contains(dummyTargetExe, capturedStartInfo.Arguments);
    }

    private sealed class MockHttpMessageHandler(HttpStatusCode statusCode, string content) : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            var response = new HttpResponseMessage(statusCode)
            {
                Content = new StringContent(content, Encoding.UTF8, "application/json")
            };
            return Task.FromResult(response);
        }
    }
}


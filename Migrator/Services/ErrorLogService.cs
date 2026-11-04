using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;

namespace Migrator.Services;

public static partial class ErrorLogService
{
    // Writes exception (message + full stack trace + inner exceptions) to error_yyyyMMdd.log.
    // Sensitive values are encrypted with DPAPI (CurrentUser) before hitting disk: [ENC:base64].
    public static string? LogException(Exception exception, string context, IEnumerable<string?>? sensitiveValues = null, string? logDirectory = null)
    {
        try
        {
            string directory = logDirectory ?? AppContext.BaseDirectory;
            Directory.CreateDirectory(directory);
            DateTimeOffset now = DateTimeOffset.Now;
            string logFilePath = Path.Combine(directory, $"error_{now:yyyyMMdd}.log");

            string entry = string.Join(Environment.NewLine,
                $"=== [{now:yyyy-MM-dd HH:mm:ss zzz}] {context} ===",
                Protect(exception.ToString(), sensitiveValues),
                string.Empty);

            File.AppendAllText(logFilePath, entry);
            return logFilePath;
        }
        catch
        {
            // Logging must never crash the app
            return null;
        }
    }

    public static string Protect(string text, IEnumerable<string?>? sensitiveValues = null)
    {
        // Longest first so a secret containing another secret is fully replaced
        foreach (string value in (sensitiveValues ?? [])
                     .Select(v => v?.Trim())
                     .Where(v => !string.IsNullOrEmpty(v))
                     .Distinct()
                     .OrderByDescending(v => v!.Length)!)
        {
            text = text.Replace(value, Encrypt(value), StringComparison.OrdinalIgnoreCase);
        }

        text = UrlCredentialsRegex().Replace(text, m => m.Groups[1].Value + Encrypt(m.Groups[2].Value) + "@");
        text = GitHubTokenRegex().Replace(text, m => Encrypt(m.Value));
        text = EmailRegex().Replace(text, m => Encrypt(m.Value));
        return text;
    }

    public static string Decrypt(string encryptedToken)
    {
        string base64 = encryptedToken.Trim().TrimStart('[').TrimEnd(']');
        base64 = base64.StartsWith("ENC:", StringComparison.Ordinal) ? base64[4..] : base64;
        return Encoding.UTF8.GetString(ProtectedData.Unprotect(Convert.FromBase64String(base64), null, DataProtectionScope.CurrentUser));
    }

    private static string Encrypt(string value)
        => $"[ENC:{Convert.ToBase64String(ProtectedData.Protect(Encoding.UTF8.GetBytes(value), null, DataProtectionScope.CurrentUser))}]";

    [GeneratedRegex(@"(\b[a-z][a-z0-9+.\-]*://)([^/\s@:\[]+(?::[^/\s@]*)?)@", RegexOptions.IgnoreCase)]
    private static partial Regex UrlCredentialsRegex();

    [GeneratedRegex(@"\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})\b")]
    private static partial Regex GitHubTokenRegex();

    [GeneratedRegex(@"\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b")]
    private static partial Regex EmailRegex();
}


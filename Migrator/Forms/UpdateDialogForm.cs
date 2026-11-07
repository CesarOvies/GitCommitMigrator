using System;
using System.Drawing;
using System.IO;
using System.Runtime.InteropServices;
using System.Threading.Tasks;
using System.Windows.Forms;
using Migrator.Models;
using Migrator.Services;

namespace Migrator.Forms;

public sealed class UpdateDialogForm : Form
{
    private const int DwmwaUseImmersiveDarkMode = 20;
    private const int ContentWidth = 380;

    private static readonly Color BgCanvas = Color.FromArgb(13, 17, 23);       // #0D1117
    private static readonly Color BgInput = Color.FromArgb(22, 27, 34);        // #161B22
    private static readonly Color BgButtonSubtle = Color.FromArgb(33, 38, 45); // #21262D
    private static readonly Color BorderSubtle = Color.FromArgb(48, 54, 61);   // #30363D
    private static readonly Color TextPrimary = Color.FromArgb(230, 237, 243); // #E6EDF3
    private static readonly Color TextSecondary = Color.FromArgb(139, 148, 158); // #8B949E
    private static readonly Color AccentGreen = Color.FromArgb(35, 134, 54);   // #238636
    private static readonly Color AccentGreenHover = Color.FromArgb(46, 160, 67); // #2EA043
    private static readonly Color AccentGreenBorder = Color.FromArgb(63, 185, 80); // #3FB950
    private static readonly Color ErrorRed = Color.FromArgb(248, 81, 73);       // #F85149

    private readonly UpdateInfo updateInfo;
    private readonly UiTranslations translations;
    private readonly Font headerFont;
    private readonly Font labelFont;
    private readonly Font valueFont;
    private readonly Font buttonFont;

    private readonly Panel progressSection;
    private readonly Label lblProgressStatus;
    private readonly Label lblProgressPercent;
    private readonly Panel progressBarBox;
    private readonly Label lblError;
    private readonly Button btnUpdate;
    private readonly Button btnLater;

    private int currentPercentage;
    private bool isDownloading;

    [DllImport("dwmapi.dll")]
    private static extern int DwmSetWindowAttribute(IntPtr hwnd, int attr, ref int attrValue, int attrSize);

    public UpdateDialogForm(UpdateInfo info, AppLanguage language)
    {
        updateInfo = info ?? throw new ArgumentNullException(nameof(info));
        translations = LocalizationService.Get(language);

        Text = translations.UpdateAvailableTitle;
        StartPosition = FormStartPosition.CenterParent;
        FormBorderStyle = FormBorderStyle.FixedDialog;
        MaximizeBox = false;
        MinimizeBox = false;
        ShowInTaskbar = false;
        AutoScaleMode = AutoScaleMode.Dpi;
        BackColor = BgCanvas;
        ForeColor = TextPrimary;

        headerFont = new Font("Segoe UI Semibold", 11.5F, FontStyle.Regular, GraphicsUnit.Point);
        labelFont = new Font("Segoe UI", 9F, FontStyle.Regular, GraphicsUnit.Point);
        valueFont = new Font("Segoe UI Semibold", 10.5F, FontStyle.Regular, GraphicsUnit.Point);
        buttonFont = new Font("Segoe UI Semibold", 9.5F, FontStyle.Regular, GraphicsUnit.Point);

        using var iconStream = typeof(UpdateDialogForm).Assembly.GetManifestResourceStream("Migrator.Assets.app.ico");
        if (iconStream is not null)
        {
            Icon = new Icon(iconStream);
        }

        var panel = new FlowLayoutPanel
        {
            Dock = DockStyle.Fill,
            FlowDirection = FlowDirection.TopDown,
            WrapContents = false,
            AutoSize = true,
            AutoSizeMode = AutoSizeMode.GrowAndShrink,
            BackColor = BgCanvas,
            Padding = new Padding(22, 18, 22, 18)
        };

        var lblTitle = new Label
        {
            Text = $"🚀 {translations.UpdateAvailableTitle}",
            Font = headerFont,
            ForeColor = TextPrimary,
            Width = ContentWidth,
            Height = 26,
            TextAlign = ContentAlignment.MiddleCenter,
            Margin = new Padding(0, 0, 0, 3)
        };
        panel.Controls.Add(lblTitle);

        var lblSubtitle = new Label
        {
            Text = translations.UpdateReadySubtitle,
            Font = labelFont,
            ForeColor = TextSecondary,
            Width = ContentWidth,
            Height = 36,
            TextAlign = ContentAlignment.MiddleCenter,
            Margin = new Padding(0, 0, 0, 14)
        };
        panel.Controls.Add(lblSubtitle);

        var versionCard = new Panel
        {
            Width = ContentWidth,
            Height = 66,
            BackColor = BgInput,
            Margin = new Padding(0, 0, 0, 10)
        };
        versionCard.Paint += (s, e) =>
        {
            using var pen = new Pen(BorderSubtle, 1);
            e.Graphics.DrawRectangle(pen, 0, 0, versionCard.Width - 1, versionCard.Height - 1);
        };

        var lblCurrentTitle = new Label
        {
            Text = translations.UpdateCurrentVersionLabel,
            Font = labelFont,
            ForeColor = TextSecondary,
            Location = new Point(10, 10),
            Width = 150,
            Height = 18,
            TextAlign = ContentAlignment.MiddleCenter
        };
        var lblCurrentValue = new Label
        {
            Text = $"v{updateInfo.CurrentVersion}",
            Font = valueFont,
            ForeColor = TextPrimary,
            Location = new Point(10, 32),
            Width = 150,
            Height = 24,
            TextAlign = ContentAlignment.MiddleCenter
        };

        var lblArrow = new Label
        {
            Text = "➔",
            Font = new Font("Segoe UI", 13F, FontStyle.Regular, GraphicsUnit.Point),
            ForeColor = TextSecondary,
            Location = new Point(165, 10),
            Size = new Size(50, 44),
            TextAlign = ContentAlignment.MiddleCenter
        };

        var lblNewTitle = new Label
        {
            Text = translations.UpdateNewVersionLabel,
            Font = labelFont,
            ForeColor = TextSecondary,
            Location = new Point(220, 10),
            Width = 150,
            Height = 18,
            TextAlign = ContentAlignment.MiddleCenter
        };
        var lblNewValue = new Label
        {
            Text = $"v{updateInfo.LatestVersion}",
            Font = valueFont,
            ForeColor = AccentGreenBorder,
            Location = new Point(220, 32),
            Width = 150,
            Height = 24,
            TextAlign = ContentAlignment.MiddleCenter
        };

        versionCard.Controls.Add(lblCurrentTitle);
        versionCard.Controls.Add(lblCurrentValue);
        versionCard.Controls.Add(lblArrow);
        versionCard.Controls.Add(lblNewTitle);
        versionCard.Controls.Add(lblNewValue);
        panel.Controls.Add(versionCard);

        if (!string.IsNullOrWhiteSpace(updateInfo.ReleaseNotes))
        {
            var lblNotesTitle = new Label
            {
                Text = translations.UpdateReleaseNotesLabel,
                Font = labelFont,
                ForeColor = TextSecondary,
                AutoSize = true,
                Margin = new Padding(0, 2, 0, 4)
            };
            panel.Controls.Add(lblNotesTitle);

            var notesBox = new Panel
            {
                Width = ContentWidth,
                Height = 72,
                BackColor = BgInput,
                Margin = new Padding(0, 0, 0, 10)
            };
            notesBox.Paint += (s, e) =>
            {
                using var pen = new Pen(BorderSubtle, 1);
                e.Graphics.DrawRectangle(pen, 0, 0, notesBox.Width - 1, notesBox.Height - 1);
            };

            string rawNotes = updateInfo.ReleaseNotes.Trim();
            string cleanNotes = rawNotes.StartsWith('#') ? rawNotes.TrimStart('#', ' ') : rawNotes;

            var txtNotes = new TextBox
            {
                Text = cleanNotes,
                Multiline = true,
                ReadOnly = true,
                ScrollBars = cleanNotes.Length > 200 || cleanNotes.Split('\n').Length > 3 ? ScrollBars.Vertical : ScrollBars.None,
                BorderStyle = BorderStyle.None,
                BackColor = BgInput,
                ForeColor = TextSecondary,
                Font = labelFont,
                Location = new Point(8, 6),
                Width = ContentWidth - 16,
                Height = 60
            };
            notesBox.Controls.Add(txtNotes);
            panel.Controls.Add(notesBox);
        }

        progressSection = new Panel
        {
            Width = ContentWidth,
            Height = 36,
            Margin = new Padding(0, 6, 0, 4),
            BackColor = BgCanvas,
            Visible = false
        };

        lblProgressStatus = new Label
        {
            AutoSize = false,
            Width = ContentWidth - 60,
            Height = 18,
            Location = new Point(0, 0),
            Font = labelFont,
            ForeColor = TextSecondary,
            AutoEllipsis = true
        };

        lblProgressPercent = new Label
        {
            AutoSize = false,
            Width = 56,
            Height = 18,
            Location = new Point(ContentWidth - 56, 0),
            Font = labelFont,
            ForeColor = TextPrimary,
            TextAlign = ContentAlignment.TopRight
        };

        progressBarBox = new Panel
        {
            Width = ContentWidth,
            Height = 10,
            Location = new Point(0, 22),
            BackColor = BgInput
        };
        progressBarBox.Paint += (s, e) =>
        {
            int fillWidth = (int)Math.Round((progressBarBox.Width - 2) * (Math.Clamp(currentPercentage, 0, 100) / 100.0));
            if (fillWidth > 0)
            {
                using var brush = new SolidBrush(AccentGreenBorder);
                e.Graphics.FillRectangle(brush, 1, 1, fillWidth, progressBarBox.Height - 2);
            }
            using var pen = new Pen(BorderSubtle, 1);
            e.Graphics.DrawRectangle(pen, 0, 0, progressBarBox.Width - 1, progressBarBox.Height - 1);
        };

        progressSection.Controls.Add(lblProgressStatus);
        progressSection.Controls.Add(lblProgressPercent);
        progressSection.Controls.Add(progressBarBox);
        panel.Controls.Add(progressSection);

        lblError = new Label
        {
            Font = labelFont,
            ForeColor = ErrorRed,
            AutoSize = false,
            Width = ContentWidth,
            Height = 32,
            TextAlign = ContentAlignment.MiddleCenter,
            Margin = new Padding(0, 4, 0, 4),
            Visible = false
        };
        panel.Controls.Add(lblError);

        var buttonRow = new Panel
        {
            Width = ContentWidth,
            Height = 38,
            BackColor = BgCanvas,
            Margin = new Padding(0, 10, 0, 0)
        };

        int btnLaterWidth = 110;
        int btnUpdateWidth = 150;
        int btnGap = 12;
        int totalWidth = btnLaterWidth + btnUpdateWidth + btnGap;
        int startX = (ContentWidth - totalWidth) / 2;

        btnLater = new Button
        {
            Text = translations.UpdateDismissButton,
            Location = new Point(startX, 2),
            Width = btnLaterWidth,
            Height = 34,
            FlatStyle = FlatStyle.Flat,
            BackColor = BgButtonSubtle,
            ForeColor = TextPrimary,
            Font = buttonFont,
            Cursor = Cursors.Hand
        };
        btnLater.FlatAppearance.BorderSize = 1;
        btnLater.FlatAppearance.BorderColor = BorderSubtle;
        btnLater.FlatAppearance.MouseOverBackColor = BorderSubtle;
        btnLater.Click += (s, e) =>
        {
            if (!isDownloading)
            {
                DialogResult = DialogResult.Cancel;
                Close();
            }
        };

        btnUpdate = new Button
        {
            Text = translations.UpdateNowButton,
            Location = new Point(startX + btnLaterWidth + btnGap, 2),
            Width = btnUpdateWidth,
            Height = 34,
            FlatStyle = FlatStyle.Flat,
            BackColor = AccentGreen,
            ForeColor = Color.White,
            Font = buttonFont,
            Cursor = Cursors.Hand
        };
        btnUpdate.FlatAppearance.BorderSize = 1;
        btnUpdate.FlatAppearance.BorderColor = AccentGreenBorder;
        btnUpdate.FlatAppearance.MouseOverBackColor = AccentGreenHover;
        btnUpdate.Click += async (s, e) => await StartDownloadAndUpdateAsync();

        buttonRow.Controls.Add(btnLater);
        buttonRow.Controls.Add(btnUpdate);
        panel.Controls.Add(buttonRow);

        Controls.Add(panel);
        AutoSize = true;
        AutoSizeMode = AutoSizeMode.GrowAndShrink;
    }

    protected override void OnHandleCreated(EventArgs e)
    {
        base.OnHandleCreated(e);
        if (OperatingSystem.IsWindowsVersionAtLeast(10, 0, 17763))
        {
            int useDarkMode = 1;
            _ = DwmSetWindowAttribute(Handle, DwmwaUseImmersiveDarkMode, ref useDarkMode, sizeof(int));
        }
    }

    protected override void Dispose(bool disposing)
    {
        if (disposing)
        {
            headerFont.Dispose();
            labelFont.Dispose();
            valueFont.Dispose();
            buttonFont.Dispose();
        }
        base.Dispose(disposing);
    }

    private void SetProgress(int percent, string message)
    {
        currentPercentage = Math.Clamp(percent, 0, 100);
        lblProgressStatus.Text = message;
        lblProgressPercent.Text = $"{currentPercentage}%";
        progressSection.Visible = true;
        progressBarBox.Invalidate();
    }

    private async Task StartDownloadAndUpdateAsync()
    {
        if (string.IsNullOrWhiteSpace(updateInfo.DownloadUrl) || isDownloading)
        {
            return;
        }

        isDownloading = true;
        btnUpdate.Enabled = false;
        btnLater.Enabled = false;
        lblError.Visible = false;

        SetProgress(0, string.Format(translations.UpdateDownloadingStatus, 0));
        var progress = new Progress<int>(pct =>
        {
            SetProgress(pct, string.Format(translations.UpdateDownloadingStatus, pct));
        });

        try
        {
            string tempDir = Path.Combine(Path.GetTempPath(), "GitCommitMigrator_Update");
            string assetName = updateInfo.AssetName ?? "update.zip";
            string tempZip = Path.Combine(tempDir, assetName);

            await Task.Run(() => UpdateService.DownloadUpdateAsync(updateInfo.DownloadUrl, tempZip, progress));

            SetProgress(100, translations.UpdateApplyingStatus);
            await Task.Delay(400);

            UpdateService.ApplyUpdateAndRestart(tempZip);
        }
        catch (Exception ex)
        {
            ErrorLogService.LogException(ex, "UpdateDialogForm_DownloadAndUpdate");
            lblError.Text = $"{translations.UpdateFailedMessage}\n{ex.Message}";
            lblError.Visible = true;

            isDownloading = false;
            btnUpdate.Enabled = true;
            btnLater.Enabled = true;
        }
    }
}


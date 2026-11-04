using System;
using System.Collections.Generic;
using System.Drawing;
using System.Linq;
using System.Runtime.InteropServices;
using System.Threading.Tasks;
using System.Windows.Forms;
using Migrator.Models;
using Migrator.Services;

namespace Migrator.Forms;

public class MigratorForm : Form
{
    private const int FieldWidth = 390;
    private const int BrowseButtonWidth = 38;
    private const int DwmwaUseImmersiveDarkMode = 20;

    private static readonly Color BgCanvas = Color.FromArgb(13, 17, 23);       // #0D1117
    private static readonly Color BgInput = Color.FromArgb(22, 27, 34);        // #161B22
    private static readonly Color BgButtonSubtle = Color.FromArgb(33, 38, 45); // #21262D
    private static readonly Color BorderSubtle = Color.FromArgb(48, 54, 61);   // #30363D
    private static readonly Color BorderFocus = Color.FromArgb(56, 139, 253);  // #388BFD
    private static readonly Color TextPrimary = Color.FromArgb(230, 237, 243); // #E6EDF3
    private static readonly Color TextSecondary = Color.FromArgb(139, 148, 158); // #8B949E
    private static readonly Color AccentGreen = Color.FromArgb(35, 134, 54);   // #238636
    private static readonly Color AccentGreenHover = Color.FromArgb(46, 160, 67); // #2EA043
    private static readonly Color AccentGreenBorder = Color.FromArgb(63, 185, 80); // #3FB950

    private readonly ErrorProvider errorProvider;
    private readonly Font labelFont;
    private readonly Font inputFont;
    private readonly Font buttonFont;
    private readonly Button btnImportConfig;
    private readonly Button btnExportConfig;
    private readonly Label lblSourceRepo;
    private readonly TextBox txtSourceRepo;
    private readonly Label lblLocalTemp;
    private readonly TextBox txtLocalTemp;
    private readonly Label lblRemoteUrl;
    private readonly TextBox txtRemoteUrl;
    private readonly Label lblOriginalEmail;
    private readonly TextBox txtOriginalEmail;
    private readonly Label lblNewName;
    private readonly TextBox txtNewName;
    private readonly Label lblNewEmail;
    private readonly TextBox txtNewEmail;
    private readonly Label lblPatToken;
    private readonly TextBox txtPatToken;
    private readonly Panel progressSection;
    private readonly Label lblProgressStatus;
    private readonly Label lblProgressPercent;
    private readonly Panel progressBarBox;
    private readonly Button btnMigrate;
    private readonly Label lblLanguage;
    private readonly ComboBox cmbLanguage;

    private AppLanguage currentLanguage = AppLanguage.PtBr;
    private bool isProcessing;
    private bool hasActiveErrors;
    private int currentProgressPercentage;

    [DllImport("dwmapi.dll")]
    private static extern int DwmSetWindowAttribute(IntPtr hwnd, int attr, ref int attrValue, int attrSize);

    public MigratorForm()
    {
        StartPosition = FormStartPosition.CenterScreen;
        FormBorderStyle = FormBorderStyle.FixedDialog;
        MaximizeBox = false;
        AutoScaleMode = AutoScaleMode.Dpi;
        BackColor = BgCanvas;
        ForeColor = TextPrimary;

        labelFont = new Font("Segoe UI Semibold", 9F, FontStyle.Regular, GraphicsUnit.Point);
        inputFont = new Font("Segoe UI", 9.5F, FontStyle.Regular, GraphicsUnit.Point);
        buttonFont = new Font("Segoe UI Semibold", 9.75F, FontStyle.Regular, GraphicsUnit.Point);

        using var iconStream = typeof(MigratorForm).Assembly.GetManifestResourceStream("Migrator.Assets.app.ico");
        if (iconStream is not null)
        {
            Icon = new Icon(iconStream);
        }

        errorProvider = new ErrorProvider(this)
        {
            BlinkStyle = ErrorBlinkStyle.NeverBlink
        };

        var panel = new FlowLayoutPanel
        {
            Dock = DockStyle.Fill,
            FlowDirection = FlowDirection.TopDown,
            WrapContents = false,
            AutoSize = true,
            AutoSizeMode = AutoSizeMode.GrowAndShrink,
            BackColor = BgCanvas,
            Padding = new Padding(22, 18, 38, 16)
        };

        var configRow = new FlowLayoutPanel
        {
            FlowDirection = FlowDirection.LeftToRight,
            WrapContents = false,
            AutoSize = true,
            AutoSizeMode = AutoSizeMode.GrowAndShrink,
            BackColor = BgCanvas,
            Margin = new Padding(0, 0, 0, 6)
        };

        int halfWidth = (FieldWidth - 8) / 2;
        btnImportConfig = CreateSubtleActionButton(halfWidth, new Padding(0, 0, 8, 0), ImportConfigurationFromDialog);
        btnExportConfig = CreateSubtleActionButton(halfWidth, new Padding(0), ExportConfigurationFromDialog);
        configRow.Controls.Add(btnImportConfig);
        configRow.Controls.Add(btnExportConfig);
        panel.Controls.Add(configRow);

        (lblSourceRepo, txtSourceRepo) = AddFolderField(panel, () => LocalizationService.Get(currentLanguage).SourceRepoBrowseTitle);
        (lblLocalTemp, txtLocalTemp) = AddFolderField(panel, () => LocalizationService.Get(currentLanguage).LocalTempBrowseTitle);
        (lblRemoteUrl, txtRemoteUrl) = AddField(panel);
        (lblOriginalEmail, txtOriginalEmail) = AddField(panel);
        (lblNewName, txtNewName) = AddField(panel);
        (lblNewEmail, txtNewEmail) = AddField(panel);
        (lblPatToken, txtPatToken) = AddField(panel);
        txtPatToken.PasswordChar = '•';

        progressSection = new Panel
        {
            Width = FieldWidth,
            Height = 36,
            Margin = new Padding(0, 12, 0, 0),
            BackColor = BgCanvas,
            Visible = false
        };

        lblProgressStatus = new Label
        {
            AutoSize = false,
            Width = FieldWidth - 50,
            Height = 18,
            Location = new Point(0, 0),
            Font = labelFont,
            ForeColor = TextSecondary,
            AutoEllipsis = true
        };

        lblProgressPercent = new Label
        {
            AutoSize = false,
            Width = 48,
            Height = 18,
            Location = new Point(FieldWidth - 48, 0),
            Font = labelFont,
            ForeColor = TextPrimary,
            TextAlign = ContentAlignment.TopRight
        };

        progressBarBox = new Panel
        {
            Width = FieldWidth,
            Height = 10,
            Location = new Point(0, 22),
            BackColor = BgInput
        };
        progressBarBox.Paint += (s, e) =>
        {
            int fillWidth = (int)Math.Round((progressBarBox.Width - 2) * (Math.Clamp(currentProgressPercentage, 0, 100) / 100.0));
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

        btnMigrate = new Button
        {
            Width = FieldWidth,
            Height = 42,
            Margin = new Padding(0, 16, 0, 12),
            FlatStyle = FlatStyle.Flat,
            BackColor = AccentGreen,
            ForeColor = Color.White,
            Font = buttonFont,
            Cursor = Cursors.Hand
        };
        btnMigrate.FlatAppearance.BorderSize = 1;
        btnMigrate.FlatAppearance.BorderColor = AccentGreenBorder;
        btnMigrate.FlatAppearance.MouseOverBackColor = AccentGreenHover;
        btnMigrate.FlatAppearance.MouseDownBackColor = AccentGreen;
        btnMigrate.Click += async (s, e) => await ExecuteMigrationAsync();
        panel.Controls.Add(btnMigrate);

        var footerBar = new Panel
        {
            Width = FieldWidth,
            Height = 36,
            Margin = new Padding(0, 4, 0, 0),
            BackColor = BgCanvas
        };

        var separator = new Panel
        {
            BackColor = BorderSubtle,
            Height = 1,
            Width = FieldWidth,
            Location = new Point(0, 0)
        };

        lblLanguage = new Label
        {
            AutoSize = true,
            Font = labelFont,
            ForeColor = TextSecondary,
            Location = new Point(0, 12)
        };

        cmbLanguage = new ComboBox
        {
            DropDownStyle = ComboBoxStyle.DropDownList,
            FlatStyle = FlatStyle.Flat,
            BackColor = BgInput,
            ForeColor = TextPrimary,
            Font = inputFont,
            Width = 175,
            Location = new Point(FieldWidth - 175, 8)
        };
        cmbLanguage.Items.AddRange(
        [
            "Português (PT-BR)",
            "English (EN-US)",
            "Español (ES)"
        ]);
        cmbLanguage.SelectedIndex = 0;
        cmbLanguage.SelectedIndexChanged += (s, e) =>
        {
            currentLanguage = cmbLanguage.SelectedIndex switch
            {
                1 => AppLanguage.EnUs,
                2 => AppLanguage.Es,
                _ => AppLanguage.PtBr
            };
            ApplyLanguage();
        };

        footerBar.Controls.Add(separator);
        footerBar.Controls.Add(lblLanguage);
        footerBar.Controls.Add(cmbLanguage);
        panel.Controls.Add(footerBar);

        Controls.Add(panel);

        ApplyLanguage();

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
            labelFont.Dispose();
            inputFont.Dispose();
            buttonFont.Dispose();
        }
        base.Dispose(disposing);
    }

    private Button CreateSubtleActionButton(int width, Padding margin, Action onClick)
    {
        var button = new Button
        {
            Width = width,
            Height = 32,
            Margin = margin,
            FlatStyle = FlatStyle.Flat,
            BackColor = BgButtonSubtle,
            ForeColor = TextPrimary,
            Font = labelFont,
            Cursor = Cursors.Hand
        };
        button.FlatAppearance.BorderSize = 1;
        button.FlatAppearance.BorderColor = BorderSubtle;
        button.FlatAppearance.MouseOverBackColor = BorderSubtle;
        button.Click += (s, e) => onClick();
        return button;
    }

    private void ImportConfigurationFromDialog()
    {
        UiTranslations t = LocalizationService.Get(currentLanguage);
        using var dialog = new OpenFileDialog
        {
            Title = t.ImportDialogTitle,
            Filter = t.ConfigFileFilter,
            DefaultExt = "json"
        };

        if (dialog.ShowDialog(this) != DialogResult.OK)
        {
            return;
        }

        try
        {
            RunMigrationRequest imported = MigrationService.ImportConfiguration(dialog.FileName);
            ApplyRequestToFields(imported);
        }
        catch (Exception ex)
        {
            MessageBox.Show($"{t.ImportErrorMessage}\n{ex.Message}", t.ErrorTitle, MessageBoxButtons.OK, MessageBoxIcon.Error);
        }
    }

    private void ExportConfigurationFromDialog()
    {
        UiTranslations t = LocalizationService.Get(currentLanguage);
        using var dialog = new SaveFileDialog
        {
            Title = t.ExportDialogTitle,
            Filter = t.ConfigFileFilter,
            DefaultExt = "json",
            FileName = "migration-config.json"
        };

        if (dialog.ShowDialog(this) != DialogResult.OK)
        {
            return;
        }

        try
        {
            MigrationService.ExportConfiguration(BuildRequest(), dialog.FileName);
            MessageBox.Show(t.ExportSuccessMessage, t.SuccessTitle, MessageBoxButtons.OK, MessageBoxIcon.Information);
        }
        catch (Exception ex)
        {
            MessageBox.Show($"{t.ExportErrorMessage}\n{ex.Message}", t.ErrorTitle, MessageBoxButtons.OK, MessageBoxIcon.Error);
        }
    }

    private void ApplyRequestToFields(RunMigrationRequest request)
    {
        txtSourceRepo.Text = request.SourceRepoPath ?? string.Empty;
        txtLocalTemp.Text = request.TargetLocalTempPath ?? string.Empty;
        txtRemoteUrl.Text = request.TargetRemoteUrl ?? string.Empty;
        txtOriginalEmail.Text = request.FilterOriginalEmail ?? string.Empty;
        txtNewName.Text = request.NewAuthorName ?? string.Empty;
        txtNewEmail.Text = request.NewAuthorEmail ?? string.Empty;
        txtPatToken.Text = request.TargetPatToken ?? string.Empty;
        errorProvider.Clear();
        hasActiveErrors = false;
    }

    private void UpdateProgressUi(MigrationProgress progress)
    {
        currentProgressPercentage = Math.Clamp(progress.Percentage, 0, 100);
        lblProgressStatus.Text = progress.StatusMessage;
        lblProgressPercent.Text = $"{currentProgressPercentage}%";
        progressSection.Visible = true;
        progressBarBox.Invalidate();
    }

    private void ApplyLanguage()
    {
        UiTranslations t = LocalizationService.Get(currentLanguage);

        Text = t.WindowTitle;
        btnImportConfig.Text = t.ImportConfigButton;
        btnExportConfig.Text = t.ExportConfigButton;

        lblSourceRepo.Text = t.SourceRepoLabel;
        txtSourceRepo.PlaceholderText = t.SourceRepoPlaceholder;

        lblLocalTemp.Text = t.LocalTempLabel;
        txtLocalTemp.PlaceholderText = t.LocalTempPlaceholder;

        lblRemoteUrl.Text = t.RemoteUrlLabel;
        txtRemoteUrl.PlaceholderText = t.RemoteUrlPlaceholder;

        lblOriginalEmail.Text = t.OriginalEmailLabel;
        txtOriginalEmail.PlaceholderText = t.OriginalEmailPlaceholder;

        lblNewName.Text = t.NewNameLabel;
        txtNewName.PlaceholderText = t.NewNamePlaceholder;

        lblNewEmail.Text = t.NewEmailLabel;
        txtNewEmail.PlaceholderText = t.NewEmailPlaceholder;

        lblPatToken.Text = t.PatTokenLabel;
        txtPatToken.PlaceholderText = t.PatTokenPlaceholder;

        btnMigrate.Text = isProcessing ? t.ProcessingButton : t.MigrateButton;
        lblLanguage.Text = t.LanguageLabel;

        if (hasActiveErrors)
        {
            UpdateErrorProviderIcons(BuildRequest());
        }
    }

    private static (Panel Box, TextBox Input) CreateStyledInputBox(int width)
    {
        var textBox = new TextBox
        {
            BorderStyle = BorderStyle.None,
            BackColor = BgInput,
            ForeColor = TextPrimary,
            Width = width - 16,
            Location = new Point(8, 6)
        };

        var box = new Panel
        {
            Width = width,
            Height = 30,
            BackColor = BgInput,
            Margin = new Padding(0, 0, 0, 2)
        };

        bool isFocused = false;
        textBox.Enter += (s, e) =>
        {
            isFocused = true;
            box.Invalidate();
        };
        textBox.Leave += (s, e) =>
        {
            isFocused = false;
            box.Invalidate();
        };
        box.Paint += (s, e) =>
        {
            using var pen = new Pen(isFocused ? BorderFocus : BorderSubtle, 1);
            e.Graphics.DrawRectangle(pen, 0, 0, box.Width - 1, box.Height - 1);
        };
        box.Click += (s, e) => textBox.Focus();

        box.Controls.Add(textBox);
        return (box, textBox);
    }

    private (Label Label, TextBox Input) AddField(FlowLayoutPanel panel)
    {
        var label = new Label
        {
            Width = FieldWidth,
            AutoSize = true,
            Font = labelFont,
            ForeColor = TextSecondary,
            Margin = new Padding(0, 9, 0, 4)
        };
        panel.Controls.Add(label);

        var (box, textBox) = CreateStyledInputBox(FieldWidth);
        textBox.Font = inputFont;
        textBox.TextChanged += (s, e) => errorProvider.SetError(box, string.Empty);
        textBox.Tag = box;
        panel.Controls.Add(box);
        return (label, textBox);
    }

    private (Label Label, TextBox Input) AddFolderField(FlowLayoutPanel panel, Func<string> getDialogTitle)
    {
        var label = new Label
        {
            Width = FieldWidth,
            AutoSize = true,
            Font = labelFont,
            ForeColor = TextSecondary,
            Margin = new Padding(0, 9, 0, 4)
        };
        panel.Controls.Add(label);

        var row = new FlowLayoutPanel
        {
            FlowDirection = FlowDirection.LeftToRight,
            WrapContents = false,
            AutoSize = true,
            AutoSizeMode = AutoSizeMode.GrowAndShrink,
            BackColor = BgCanvas,
            Margin = new Padding(0, 0, 0, 2)
        };

        var (box, textBox) = CreateStyledInputBox(FieldWidth - BrowseButtonWidth - 6);
        textBox.Font = inputFont;
        box.Margin = new Padding(0, 0, 6, 0);

        var btnBrowse = new Button
        {
            Text = "...",
            Width = BrowseButtonWidth,
            Height = box.Height,
            Margin = new Padding(0),
            FlatStyle = FlatStyle.Flat,
            BackColor = BgButtonSubtle,
            ForeColor = TextPrimary,
            Font = labelFont,
            Cursor = Cursors.Hand
        };
        btnBrowse.FlatAppearance.BorderSize = 1;
        btnBrowse.FlatAppearance.BorderColor = BorderSubtle;
        btnBrowse.FlatAppearance.MouseOverBackColor = BorderSubtle;

        textBox.TextChanged += (s, e) => errorProvider.SetError(btnBrowse, string.Empty);

        btnBrowse.Click += (s, e) =>
        {
            using var dialog = new FolderBrowserDialog
            {
                Description = getDialogTitle(),
                UseDescriptionForTitle = true,
                ShowNewFolderButton = true
            };

            if (dialog.ShowDialog(this) == DialogResult.OK)
            {
                textBox.Text = dialog.SelectedPath;
            }
        };

        row.Controls.Add(box);
        row.Controls.Add(btnBrowse);
        panel.Controls.Add(row);
        textBox.Tag = btnBrowse;
        return (label, textBox);
    }

    private RunMigrationRequest BuildRequest() => new()
    {
        SourceRepoPath = txtSourceRepo.Text,
        TargetLocalTempPath = txtLocalTemp.Text,
        TargetRemoteUrl = txtRemoteUrl.Text,
        FilterOriginalEmail = txtOriginalEmail.Text,
        NewAuthorName = txtNewName.Text,
        NewAuthorEmail = txtNewEmail.Text,
        TargetPatToken = txtPatToken.Text
    };

    private Dictionary<string, string> UpdateErrorProviderIcons(RunMigrationRequest request)
    {
        errorProvider.Clear();

        Dictionary<string, string> errors = MigrationService.ValidateRequest(request, currentLanguage);
        hasActiveErrors = errors.Count > 0;

        var fieldMap = new Dictionary<string, Control>
        {
            [nameof(RunMigrationRequest.SourceRepoPath)] = (Control?)txtSourceRepo.Tag ?? txtSourceRepo,
            [nameof(RunMigrationRequest.TargetLocalTempPath)] = (Control?)txtLocalTemp.Tag ?? txtLocalTemp,
            [nameof(RunMigrationRequest.TargetRemoteUrl)] = (Control?)txtRemoteUrl.Tag ?? txtRemoteUrl,
            [nameof(RunMigrationRequest.FilterOriginalEmail)] = (Control?)txtOriginalEmail.Tag ?? txtOriginalEmail,
            [nameof(RunMigrationRequest.NewAuthorName)] = (Control?)txtNewName.Tag ?? txtNewName,
            [nameof(RunMigrationRequest.NewAuthorEmail)] = (Control?)txtNewEmail.Tag ?? txtNewEmail,
            [nameof(RunMigrationRequest.TargetPatToken)] = (Control?)txtPatToken.Tag ?? txtPatToken
        };

        foreach (var (key, message) in errors)
        {
            if (fieldMap.TryGetValue(key, out Control? control))
            {
                errorProvider.SetError(control, message);
            }
        }

        return errors;
    }

    private bool ValidateInputs(RunMigrationRequest request)
    {
        Dictionary<string, string> errors = UpdateErrorProviderIcons(request);
        if (errors.Count == 0)
        {
            return true;
        }

        UiTranslations t = LocalizationService.Get(currentLanguage);
        string summary = string.Join(Environment.NewLine, errors.Values.Select(m => $"• {m}"));
        MessageBox.Show(
            $"{t.ValidationSummaryHeader}\n\n{summary}",
            t.ValidationSummaryTitle,
            MessageBoxButtons.OK,
            MessageBoxIcon.Warning);

        return false;
    }

    private async Task ExecuteMigrationAsync()
    {
        RunMigrationRequest request = BuildRequest();

        if (!ValidateInputs(request))
        {
            return;
        }

        UiTranslations t = LocalizationService.Get(currentLanguage);
        AppLanguage langSnapshot = currentLanguage;
        isProcessing = true;
        btnImportConfig.Enabled = false;
        btnExportConfig.Enabled = false;
        btnMigrate.Enabled = false;
        btnMigrate.BackColor = BgButtonSubtle;
        btnMigrate.FlatAppearance.BorderColor = BorderSubtle;
        btnMigrate.Text = t.ProcessingButton;

        UpdateProgressUi(new MigrationProgress(0, t.StatusExtractingCommits));
        IProgress<MigrationProgress> progressReporter = new Progress<MigrationProgress>(UpdateProgressUi);

        try
        {
            await Task.Run(() => MigrationService.RunMigration(request, progressReporter, langSnapshot));

            t = LocalizationService.Get(currentLanguage);
            UpdateProgressUi(new MigrationProgress(100, t.StatusCompleted));
            MessageBox.Show(t.SuccessMessage, t.SuccessTitle, MessageBoxButtons.OK, MessageBoxIcon.Information);
        }
        catch (Exception ex)
        {
            t = LocalizationService.Get(currentLanguage);
            MessageBox.Show($"{t.ErrorMessagePrefix}\n{ex.Message}", t.ErrorTitle, MessageBoxButtons.OK, MessageBoxIcon.Error);
        }
        finally
        {
            isProcessing = false;
            btnImportConfig.Enabled = true;
            btnExportConfig.Enabled = true;
            btnMigrate.Enabled = true;
            btnMigrate.BackColor = AccentGreen;
            btnMigrate.FlatAppearance.BorderColor = AccentGreenBorder;
            btnMigrate.Text = LocalizationService.Get(currentLanguage).MigrateButton;
        }
    }
}

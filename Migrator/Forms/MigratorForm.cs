using System;
using System.Collections.Generic;
using System.Drawing;
using System.Linq;
using System.Threading.Tasks;
using System.Windows.Forms;
using Migrator.Models;
using Migrator.Services;

namespace Migrator.Forms;

public class MigratorForm : Form
{
    private const int FieldWidth = 380;
    private const int BrowseButtonWidth = 36;

    private readonly ErrorProvider errorProvider;
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
    private readonly Button btnMigrate;
    private readonly Label lblLanguage;
    private readonly ComboBox cmbLanguage;

    private AppLanguage currentLanguage = AppLanguage.PtBr;
    private bool isProcessing;
    private bool hasActiveErrors;

    public MigratorForm()
    {
        StartPosition = FormStartPosition.CenterScreen;
        FormBorderStyle = FormBorderStyle.FixedDialog;
        MaximizeBox = false;
        AutoScaleMode = AutoScaleMode.Dpi;

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
            Padding = new Padding(20, 20, 36, 12)
        };

        (lblSourceRepo, txtSourceRepo) = AddFolderField(panel, () => LocalizationService.Get(currentLanguage).SourceRepoBrowseTitle);
        (lblLocalTemp, txtLocalTemp) = AddFolderField(panel, () => LocalizationService.Get(currentLanguage).LocalTempBrowseTitle);
        (lblRemoteUrl, txtRemoteUrl) = AddField(panel);
        (lblOriginalEmail, txtOriginalEmail) = AddField(panel);
        (lblNewName, txtNewName) = AddField(panel);
        (lblNewEmail, txtNewEmail) = AddField(panel);
        (lblPatToken, txtPatToken) = AddField(panel);
        txtPatToken.PasswordChar = '*';

        btnMigrate = new Button
        {
            Width = FieldWidth,
            Height = 40,
            Margin = new Padding(0, 18, 0, 10),
            Cursor = Cursors.Hand
        };
        btnMigrate.Click += async (s, e) => await ExecuteMigrationAsync();
        panel.Controls.Add(btnMigrate);

        var footerBar = new Panel
        {
            Width = FieldWidth,
            Height = 32,
            Margin = new Padding(0, 4, 0, 0)
        };

        var separator = new Label
        {
            BorderStyle = BorderStyle.Fixed3D,
            Height = 2,
            Width = FieldWidth,
            Location = new Point(0, 0)
        };

        lblLanguage = new Label
        {
            AutoSize = true,
            Location = new Point(0, 10)
        };

        cmbLanguage = new ComboBox
        {
            DropDownStyle = ComboBoxStyle.DropDownList,
            Width = 170,
            Location = new Point(FieldWidth - 170, 6)
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

    private void ApplyLanguage()
    {
        UiTranslations t = LocalizationService.Get(currentLanguage);

        Text = t.WindowTitle;
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

    private (Label Label, TextBox Input) AddField(FlowLayoutPanel panel)
    {
        var label = new Label
        {
            Width = FieldWidth,
            AutoSize = true,
            Margin = new Padding(0, 8, 0, 3)
        };
        panel.Controls.Add(label);

        var textBox = new TextBox
        {
            Width = FieldWidth,
            Margin = new Padding(0, 0, 0, 2)
        };
        textBox.TextChanged += (s, e) => errorProvider.SetError(textBox, string.Empty);
        panel.Controls.Add(textBox);
        return (label, textBox);
    }

    private (Label Label, TextBox Input) AddFolderField(FlowLayoutPanel panel, Func<string> getDialogTitle)
    {
        var label = new Label
        {
            Width = FieldWidth,
            AutoSize = true,
            Margin = new Padding(0, 8, 0, 3)
        };
        panel.Controls.Add(label);

        var row = new FlowLayoutPanel
        {
            FlowDirection = FlowDirection.LeftToRight,
            WrapContents = false,
            AutoSize = true,
            AutoSizeMode = AutoSizeMode.GrowAndShrink,
            Margin = new Padding(0, 0, 0, 2)
        };

        var textBox = new TextBox
        {
            Width = FieldWidth - BrowseButtonWidth - 6,
            Margin = new Padding(0, 0, 6, 0)
        };

        var btnBrowse = new Button
        {
            Text = "...",
            Width = BrowseButtonWidth,
            Height = textBox.PreferredHeight,
            Margin = new Padding(0),
            Cursor = Cursors.Hand
        };

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

        row.Controls.Add(textBox);
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
            [nameof(RunMigrationRequest.TargetRemoteUrl)] = txtRemoteUrl,
            [nameof(RunMigrationRequest.FilterOriginalEmail)] = txtOriginalEmail,
            [nameof(RunMigrationRequest.NewAuthorName)] = txtNewName,
            [nameof(RunMigrationRequest.NewAuthorEmail)] = txtNewEmail,
            [nameof(RunMigrationRequest.TargetPatToken)] = txtPatToken
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
        isProcessing = true;
        btnMigrate.Enabled = false;
        btnMigrate.Text = t.ProcessingButton;

        try
        {
            await Task.Run(() => MigrationService.RunMigration(request));

            t = LocalizationService.Get(currentLanguage);
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
            btnMigrate.Enabled = true;
            btnMigrate.Text = LocalizationService.Get(currentLanguage).MigrateButton;
        }
    }
}

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
    private readonly TextBox txtSourceRepo;
    private readonly TextBox txtLocalTemp;
    private readonly TextBox txtRemoteUrl;
    private readonly TextBox txtOriginalEmail;
    private readonly TextBox txtNewName;
    private readonly TextBox txtNewEmail;
    private readonly TextBox txtPatToken;
    private readonly Button btnMigrate;

    public MigratorForm()
    {
        Text = "Git Commit Migrator";
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
            Padding = new Padding(20, 20, 36, 20)
        };

        txtSourceRepo = AddFolderField(
            panel,
            "Source Repo (Local Path ou Remote URL):",
            "Ex: C:\\Repos\\Projeto ou https://github.com/org/repo.git",
            "Selecione a pasta do repositório Git de origem");

        txtLocalTemp = AddFolderField(
            panel,
            "Target Local Temp Path:",
            "Ex: C:\\Temp\\MigracaoGhost",
            "Selecione a pasta temporária para reconstruir o histórico");

        txtRemoteUrl = AddField(
            panel,
            "Target Remote URL:",
            "Ex: https://github.com/seu-usuario/historico-migrado.git");

        txtOriginalEmail = AddField(
            panel,
            "Filter Original Email:",
            "Ex: seu.nome@empresa-antiga.com");

        txtNewName = AddField(
            panel,
            "New Author Name:",
            "Ex: Seu Nome");

        txtNewEmail = AddField(
            panel,
            "New Author Email:",
            "Ex: seu.email@pessoal.com");

        txtPatToken = AddField(
            panel,
            "Target PAT Token:",
            "Ex: ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx");
        txtPatToken.PasswordChar = '*';

        btnMigrate = new Button
        {
            Text = "Executar Migração",
            Width = FieldWidth,
            Height = 40,
            Margin = new Padding(0, 18, 0, 5),
            Cursor = Cursors.Hand
        };
        btnMigrate.Click += async (s, e) => await ExecuteMigrationAsync();

        panel.Controls.Add(btnMigrate);
        Controls.Add(panel);

        AutoSize = true;
        AutoSizeMode = AutoSizeMode.GrowAndShrink;
    }

    private TextBox AddField(FlowLayoutPanel panel, string labelText, string placeholder)
    {
        panel.Controls.Add(new Label
        {
            Text = labelText,
            Width = FieldWidth,
            AutoSize = true,
            Margin = new Padding(0, 8, 0, 3)
        });

        var textBox = new TextBox
        {
            Width = FieldWidth,
            PlaceholderText = placeholder,
            Margin = new Padding(0, 0, 0, 2)
        };
        textBox.TextChanged += (s, e) => errorProvider.SetError(textBox, string.Empty);
        panel.Controls.Add(textBox);
        return textBox;
    }

    private TextBox AddFolderField(FlowLayoutPanel panel, string labelText, string placeholder, string dialogDescription)
    {
        panel.Controls.Add(new Label
        {
            Text = labelText,
            Width = FieldWidth,
            AutoSize = true,
            Margin = new Padding(0, 8, 0, 3)
        });

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
            PlaceholderText = placeholder,
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
                Description = dialogDescription,
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
        return textBox;
    }

    private bool ValidateInputs(RunMigrationRequest request)
    {
        errorProvider.Clear();

        Dictionary<string, string> errors = MigrationService.ValidateRequest(request);
        if (errors.Count == 0)
        {
            return true;
        }

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

        string summary = string.Join(Environment.NewLine, errors.Values.Select(m => $"• {m}"));
        MessageBox.Show(
            $"Corrija os campos abaixo antes de continuar:\n\n{summary}",
            "Campos Inválidos",
            MessageBoxButtons.OK,
            MessageBoxIcon.Warning);

        return false;
    }

    private async Task ExecuteMigrationAsync()
    {
        var request = new RunMigrationRequest
        {
            SourceRepoPath = txtSourceRepo.Text,
            TargetLocalTempPath = txtLocalTemp.Text,
            TargetRemoteUrl = txtRemoteUrl.Text,
            FilterOriginalEmail = txtOriginalEmail.Text,
            NewAuthorName = txtNewName.Text,
            NewAuthorEmail = txtNewEmail.Text,
            TargetPatToken = txtPatToken.Text
        };

        if (!ValidateInputs(request))
        {
            return;
        }

        btnMigrate.Enabled = false;
        btnMigrate.Text = "Processando...";

        try
        {
            await Task.Run(() => MigrationService.RunMigration(request));

            MessageBox.Show("Migração concluída com sucesso!", "Sucesso", MessageBoxButtons.OK, MessageBoxIcon.Information);
        }
        catch (Exception ex)
        {
            MessageBox.Show($"Erro na migração:\n{ex.Message}", "Erro", MessageBoxButtons.OK, MessageBoxIcon.Error);
        }
        finally
        {
            btnMigrate.Enabled = true;
            btnMigrate.Text = "Executar Migração";
        }
    }
}

using System;
using System.Drawing;
using System.Threading.Tasks;
using System.Windows.Forms;
using Migrator.Models;
using Migrator.Services;

namespace Migrator.Forms;

public class MigratorForm : Form
{
    private const int FieldWidth = 380;

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

        var panel = new FlowLayoutPanel
        {
            Dock = DockStyle.Fill,
            FlowDirection = FlowDirection.TopDown,
            WrapContents = false,
            AutoSize = true,
            AutoSizeMode = AutoSizeMode.GrowAndShrink,
            Padding = new Padding(20)
        };

        txtSourceRepo = AddField(panel, "Source Repo Path (Local):");
        txtLocalTemp = AddField(panel, "Target Local Temp Path:");
        txtRemoteUrl = AddField(panel, "Target Remote URL:");
        txtOriginalEmail = AddField(panel, "Filter Original Email:");
        txtNewName = AddField(panel, "New Author Name:");
        txtNewEmail = AddField(panel, "New Author Email:");
        txtPatToken = AddField(panel, "Target PAT Token:");
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

    private static TextBox AddField(FlowLayoutPanel panel, string labelText)
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
            Margin = new Padding(0, 0, 0, 2)
        };
        panel.Controls.Add(textBox);
        return textBox;
    }

    private async Task ExecuteMigrationAsync()
    {
        btnMigrate.Enabled = false;
        btnMigrate.Text = "Processando...";

        try
        {
            await Task.Run(() => MigrationService.RunMigration(
                new RunMigrationRequest
                {
                    SourceRepoPath = txtSourceRepo.Text,
                    TargetLocalTempPath = txtLocalTemp.Text,
                    TargetRemoteUrl = txtRemoteUrl.Text,
                    FilterOriginalEmail = txtOriginalEmail.Text,
                    NewAuthorName = txtNewName.Text,
                    NewAuthorEmail = txtNewEmail.Text,
                    TargetPatToken = txtPatToken.Text
                }
            ));

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

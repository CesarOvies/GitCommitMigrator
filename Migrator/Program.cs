using System;
using System.Drawing;
using System.Threading.Tasks;
using System.Windows.Forms;

namespace Migrator;

public class Program
{
    [STAThread]
    public static void Main()
    {
        ApplicationConfiguration.Initialize();
        Application.Run(new MigratorForm());
    }
}

public class MigratorForm : Form
{
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
        Size = new Size(400, 520);
        StartPosition = FormStartPosition.CenterScreen;
        FormBorderStyle = FormBorderStyle.FixedDialog;
        MaximizeBox = false;

        var panel = new FlowLayoutPanel
        {
            Dock = DockStyle.Fill,
            FlowDirection = FlowDirection.TopDown,
            Padding = new Padding(15)
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
            Width = 350,
            Height = 40,
            Margin = new Padding(0, 15, 0, 0),
            Cursor = Cursors.Hand
        };
        btnMigrate.Click += async (s, e) => await ExecuteMigrationAsync();

        panel.Controls.Add(btnMigrate);
        Controls.Add(panel);
    }

    private TextBox AddField(FlowLayoutPanel panel, string labelText)
    {
        panel.Controls.Add(new Label { Text = labelText, Width = 350, Margin = new Padding(0, 5, 0, 2) });
        var textBox = new TextBox { Width = 350 };
        panel.Controls.Add(textBox);
        return textBox;
    }

    private async Task ExecuteMigrationAsync()
    {
        btnMigrate.Enabled = false;
        btnMigrate.Text = "Processando...";

        try
        {
            await Task.Run(() => Logical.RunMigration(
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
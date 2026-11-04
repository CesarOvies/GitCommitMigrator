using System;
using System.Windows.Forms;
using Migrator.Forms;
using Migrator.Services;

namespace Migrator;

public static class Program
{
    [STAThread]
    public static void Main()
    {
        ApplicationConfiguration.Initialize();
        Application.ThreadException += (_, e) =>
        {
            ErrorLogService.LogException(e.Exception, "UnhandledUiException");
            MessageBox.Show(e.Exception.Message, "Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
        };
        AppDomain.CurrentDomain.UnhandledException += (_, e) =>
        {
            if (e.ExceptionObject is Exception ex)
            {
                ErrorLogService.LogException(ex, "UnhandledException");
            }
        };
        Application.Run(new MigratorForm());
    }
}

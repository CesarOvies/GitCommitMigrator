using System;
using System.Windows.Forms;
using Migrator.Forms;

namespace Migrator;

public static class Program
{
    [STAThread]
    public static void Main()
    {
        ApplicationConfiguration.Initialize();
        Application.Run(new MigratorForm());
    }
}

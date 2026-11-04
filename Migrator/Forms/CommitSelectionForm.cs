using System;
using System.Collections.Generic;
using System.Drawing;
using System.Linq;
using System.Runtime.InteropServices;
using System.Windows.Forms;
using Migrator.Models;
using Migrator.Services;

namespace Migrator.Forms;

public sealed class CommitSelectionForm : Form
{
    private const int DwmwaUseImmersiveDarkMode = 20;
    private const int ContentWidth = 480;

    private static readonly Color BgCanvas = Color.FromArgb(13, 17, 23);
    private static readonly Color BgInput = Color.FromArgb(22, 27, 34);
    private static readonly Color BgButtonSubtle = Color.FromArgb(33, 38, 45);
    private static readonly Color BorderSubtle = Color.FromArgb(48, 54, 61);
    private static readonly Color TextPrimary = Color.FromArgb(230, 237, 243);
    private static readonly Color TextSecondary = Color.FromArgb(139, 148, 158);
    private static readonly Color AccentGreen = Color.FromArgb(35, 134, 54);
    private static readonly Color AccentGreenHover = Color.FromArgb(46, 160, 67);
    private static readonly Color AccentGreenBorder = Color.FromArgb(63, 185, 80);

    private readonly IReadOnlyList<CommitMetadata> allCommits;
    private readonly AppLanguage language;
    private readonly Font labelFont;
    private readonly Font inputFont;
    private readonly Font buttonFont;

    private readonly RadioButton rbAll;
    private readonly RadioButton rbSingle;
    private readonly RadioButton rbPeriod;
    private readonly Panel singlePanel;
    private readonly ComboBox cmbSingleCommit;
    private readonly Panel periodPanel;
    private readonly DateTimePicker dtpStart;
    private readonly DateTimePicker dtpEnd;
    private readonly Label lblPreviewCount;

    public List<CommitMetadata> SelectedCommits { get; private set; } = new();

    [DllImport("dwmapi.dll")]
    private static extern int DwmSetWindowAttribute(IntPtr hwnd, int attr, ref int attrValue, int attrSize);

    public CommitSelectionForm(IReadOnlyList<CommitMetadata> commits, AppLanguage language)
    {
        allCommits = commits ?? throw new ArgumentNullException(nameof(commits));
        this.language = language;
        UiTranslations t = LocalizationService.Get(language);

        Text = t.CommitSelectionTitle;
        StartPosition = FormStartPosition.CenterParent;
        FormBorderStyle = FormBorderStyle.FixedDialog;
        MaximizeBox = false;
        MinimizeBox = false;
        AutoScaleMode = AutoScaleMode.Dpi;
        BackColor = BgCanvas;
        ForeColor = TextPrimary;

        labelFont = new Font("Segoe UI Semibold", 9F, FontStyle.Regular, GraphicsUnit.Point);
        inputFont = new Font("Segoe UI", 9.25F, FontStyle.Regular, GraphicsUnit.Point);
        buttonFont = new Font("Segoe UI Semibold", 9.5F, FontStyle.Regular, GraphicsUnit.Point);

        var mainPanel = new FlowLayoutPanel
        {
            Dock = DockStyle.Fill,
            FlowDirection = FlowDirection.TopDown,
            WrapContents = false,
            AutoSize = true,
            AutoSizeMode = AutoSizeMode.GrowAndShrink,
            BackColor = BgCanvas,
            Padding = new Padding(22, 18, 22, 18)
        };

        var lblHeader = new Label
        {
            Text = string.Format(t.CommitSelectionHeader, allCommits.Count),
            Font = labelFont,
            ForeColor = TextPrimary,
            AutoSize = true,
            MaximumSize = new Size(ContentWidth, 0),
            Margin = new Padding(0, 0, 0, 12)
        };
        mainPanel.Controls.Add(lblHeader);

        rbAll = CreateRadioButton(t.SelectAllCommitsOption, true);
        rbSingle = CreateRadioButton(t.SelectSingleCommitOption, false);
        rbPeriod = CreateRadioButton(t.SelectByPeriodOption, false);

        mainPanel.Controls.Add(rbAll);
        mainPanel.Controls.Add(rbSingle);

        singlePanel = new Panel
        {
            Width = ContentWidth,
            Height = 36,
            Margin = new Padding(22, 2, 0, 6),
            BackColor = BgCanvas,
            Enabled = false
        };

        cmbSingleCommit = new ComboBox
        {
            DropDownStyle = ComboBoxStyle.DropDownList,
            FlatStyle = FlatStyle.Flat,
            BackColor = BgInput,
            ForeColor = TextPrimary,
            Font = inputFont,
            Width = ContentWidth - 22,
            Location = new Point(0, 4)
        };

        foreach (CommitMetadata c in allCommits)
        {
            string firstLine = (c.Message ?? string.Empty)
                .Split(['\r', '\n'], StringSplitOptions.RemoveEmptyEntries)
                .FirstOrDefault() ?? "(empty)";
            if (firstLine.Length > 55)
            {
                firstLine = firstLine[..52] + "...";
            }
            cmbSingleCommit.Items.Add($"{c.When:yyyy-MM-dd HH:mm} — {firstLine}");
        }

        if (cmbSingleCommit.Items.Count > 0)
        {
            cmbSingleCommit.SelectedIndex = 0;
        }
        cmbSingleCommit.SelectedIndexChanged += (s, e) => UpdatePreviewCount();

        singlePanel.Controls.Add(cmbSingleCommit);
        mainPanel.Controls.Add(singlePanel);

        mainPanel.Controls.Add(rbPeriod);

        periodPanel = new Panel
        {
            Width = ContentWidth,
            Height = 58,
            Margin = new Padding(22, 2, 0, 8),
            BackColor = BgCanvas,
            Enabled = false
        };

        int dateWidth = (ContentWidth - 22 - 14) / 2;

        var lblStart = new Label
        {
            Text = t.PeriodStartDateLabel,
            Font = labelFont,
            ForeColor = TextSecondary,
            AutoSize = true,
            Location = new Point(0, 0)
        };

        dtpStart = new DateTimePicker
        {
            Format = DateTimePickerFormat.Short,
            Font = inputFont,
            Width = dateWidth,
            Location = new Point(0, 22)
        };

        var lblEnd = new Label
        {
            Text = t.PeriodEndDateLabel,
            Font = labelFont,
            ForeColor = TextSecondary,
            AutoSize = true,
            Location = new Point(dateWidth + 14, 0)
        };

        dtpEnd = new DateTimePicker
        {
            Format = DateTimePickerFormat.Short,
            Font = inputFont,
            Width = dateWidth,
            Location = new Point(dateWidth + 14, 22)
        };

        if (allCommits.Count > 0)
        {
            dtpStart.Value = allCommits.Min(c => c.When.LocalDateTime).Date;
            dtpEnd.Value = allCommits.Max(c => c.When.LocalDateTime).Date;
        }

        dtpStart.ValueChanged += (s, e) => UpdatePreviewCount();
        dtpEnd.ValueChanged += (s, e) => UpdatePreviewCount();

        periodPanel.Controls.Add(lblStart);
        periodPanel.Controls.Add(dtpStart);
        periodPanel.Controls.Add(lblEnd);
        periodPanel.Controls.Add(dtpEnd);
        mainPanel.Controls.Add(periodPanel);

        lblPreviewCount = new Label
        {
            Font = labelFont,
            ForeColor = AccentGreenBorder,
            AutoSize = true,
            Margin = new Padding(0, 6, 0, 12)
        };
        mainPanel.Controls.Add(lblPreviewCount);

        var buttonRow = new FlowLayoutPanel
        {
            FlowDirection = FlowDirection.LeftToRight,
            WrapContents = false,
            AutoSize = true,
            AutoSizeMode = AutoSizeMode.GrowAndShrink,
            BackColor = BgCanvas,
            Margin = new Padding(0, 4, 0, 0)
        };

        int btnWidth = (ContentWidth - 10) / 2;

        var btnCancel = new Button
        {
            Text = t.CancelSelectionButton,
            Width = btnWidth,
            Height = 38,
            Margin = new Padding(0, 0, 10, 0),
            FlatStyle = FlatStyle.Flat,
            BackColor = BgButtonSubtle,
            ForeColor = TextPrimary,
            Font = buttonFont,
            Cursor = Cursors.Hand
        };
        btnCancel.FlatAppearance.BorderSize = 1;
        btnCancel.FlatAppearance.BorderColor = BorderSubtle;
        btnCancel.FlatAppearance.MouseOverBackColor = BorderSubtle;
        btnCancel.Click += (s, e) =>
        {
            DialogResult = DialogResult.Cancel;
            Close();
        };

        var btnConfirm = new Button
        {
            Text = t.ConfirmSelectionButton,
            Width = btnWidth,
            Height = 38,
            Margin = new Padding(0),
            FlatStyle = FlatStyle.Flat,
            BackColor = AccentGreen,
            ForeColor = Color.White,
            Font = buttonFont,
            Cursor = Cursors.Hand
        };
        btnConfirm.FlatAppearance.BorderSize = 1;
        btnConfirm.FlatAppearance.BorderColor = AccentGreenBorder;
        btnConfirm.FlatAppearance.MouseOverBackColor = AccentGreenHover;
        btnConfirm.FlatAppearance.MouseDownBackColor = AccentGreen;
        btnConfirm.Click += (s, e) => ConfirmSelection();

        buttonRow.Controls.Add(btnCancel);
        buttonRow.Controls.Add(btnConfirm);
        mainPanel.Controls.Add(buttonRow);

        Controls.Add(mainPanel);

        rbAll.CheckedChanged += (s, e) => OnModeChanged();
        rbSingle.CheckedChanged += (s, e) => OnModeChanged();
        rbPeriod.CheckedChanged += (s, e) => OnModeChanged();

        UpdatePreviewCount();

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

    private RadioButton CreateRadioButton(string text, bool isChecked)
    {
        return new RadioButton
        {
            Text = text,
            Checked = isChecked,
            AutoSize = true,
            Font = labelFont,
            ForeColor = TextPrimary,
            BackColor = BgCanvas,
            Margin = new Padding(0, 4, 0, 4),
            Cursor = Cursors.Hand
        };
    }

    private void OnModeChanged()
    {
        singlePanel.Enabled = rbSingle.Checked;
        periodPanel.Enabled = rbPeriod.Checked;
        UpdatePreviewCount();
    }

    private List<CommitMetadata> ComputeCurrentSelection()
    {
        if (rbAll.Checked)
        {
            return allCommits.ToList();
        }

        if (rbSingle.Checked)
        {
            int idx = cmbSingleCommit.SelectedIndex;
            return idx >= 0 && idx < allCommits.Count
                ? [allCommits[idx]]
                : [];
        }

        DateTime startDate = dtpStart.Value.Date;
        DateTime endDate = dtpEnd.Value.Date;
        return MigrationService.FilterCommitsByPeriod(allCommits, startDate, endDate);
    }

    private void UpdatePreviewCount()
    {
        UiTranslations t = LocalizationService.Get(language);
        List<CommitMetadata> current = ComputeCurrentSelection();
        lblPreviewCount.Text = string.Format(t.SelectedCommitsCountLabel, current.Count, allCommits.Count);
    }

    private void ConfirmSelection()
    {
        UiTranslations t = LocalizationService.Get(language);

        if (rbPeriod.Checked && dtpStart.Value.Date > dtpEnd.Value.Date)
        {
            MessageBox.Show(t.ErrInvalidPeriodRange, t.ValidationSummaryTitle, MessageBoxButtons.OK, MessageBoxIcon.Warning);
            return;
        }

        List<CommitMetadata> chosen = ComputeCurrentSelection();
        if (chosen.Count == 0)
        {
            MessageBox.Show(t.ErrNoCommitsSelected, t.ValidationSummaryTitle, MessageBoxButtons.OK, MessageBoxIcon.Warning);
            return;
        }

        SelectedCommits = chosen;
        DialogResult = DialogResult.OK;
        Close();
    }
}


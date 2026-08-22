import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { DevoteeMonthlySummary, PrasadamCount, Expense } from '../types';
import { formatRupee, formatMonthName } from './calculations';
import { formatDevoteeFamilyDisplay } from './devoteeHelpers';

/**
 * Export full monthly data to a multi-sheet Excel workbook
 */
export function exportToExcel(
  cycleMonth: string,
  summaries: DevoteeMonthlySummary[],
  allCounts: PrasadamCount[],
  allExpenses: Expense[]
) {
  const monthName = formatMonthName(cycleMonth);
  const wb = XLSX.utils.book_new();

  // Sheet 1: Master Summary
  const summaryData = summaries.map(s => ({
    'Phone': s.devotee.phone_number,
    'Group Name': s.devotee.group_name,
    'Family Members': formatDevoteeFamilyDisplay(s.devotee, true),
    'Breakfast Count': s.breakfast_total,
    'Lunch Count': s.lunch_total,
    'Dinner Count': s.dinner_total,
    'Total Meals': s.total_meals,
    'Prasadam Cost (₹)': s.prasadam_cost,
    'Approved Regular Expenses (₹)': s.approved_expenses,
    'Current Month Net (₹)': s.current_month_net,
    'Carried Forward (₹)': s.carried_forward,
    'Settled Reported (₹)': s.settlement_reported,
    'Final Balance (₹)': s.final_balance,
    'Balance Status': s.final_balance > 0 ? 'Owes GNH' : s.final_balance < 0 ? 'GNH Owes' : 'Settled',
    'Settlement Status': s.settlement_status,
    'Janmashtami Expenses (₹)': s.janmashtami_expenses,
  }));

  const wsSummary = XLSX.utils.json_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Devotee Summary');

  // Sheet 2: Daily Counts
  const countsMap = new Map(summaries.map(s => [s.devotee.id, s.devotee.group_name]));
  const monthCounts = allCounts
    .filter(c => c.date.startsWith(cycleMonth))
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(c => ({
      'Date': c.date,
      'Group Name': countsMap.get(c.devotee_id) || 'Unknown',
      'Breakfast (B)': c.breakfast_count,
      'Lunch (L)': c.lunch_count,
      'Dinner (D)': c.dinner_count,
      'Total Count': c.breakfast_count + c.lunch_count + c.dinner_count,
      'Cost (₹)': (c.breakfast_count * 40) + (c.lunch_count * 80) + (c.dinner_count * 40),
      'Auto Filled': c.is_auto_filled ? 'YES' : 'NO',
    }));

  const wsCounts = XLSX.utils.json_to_sheet(monthCounts);
  XLSX.utils.book_append_sheet(wb, wsCounts, 'Daily Counts');

  // Sheet 3: Expense Ledger
  const expenseData = allExpenses
    .filter(e => e.cycle_month === cycleMonth || e.type === 'JANMASHTAMI')
    .map(e => ({
      'Date': e.created_at ? e.created_at.slice(0, 10) : cycleMonth,
      'Cycle Month': e.cycle_month,
      'Type': e.type,
      'Group / Guest': e.devotee_id ? countsMap.get(e.devotee_id) : `Guest: ${e.guest_name || 'Anonymous'}`,
      'Payer Name': e.payer_name,
      'Title / Item': e.title,
      'Amount (₹)': e.amount,
      'Status': e.status,
      'Rejection Reason': e.rejection_reason || '-',
      'Comments': e.comments || '',
      'Bill Attached': e.bill_url ? 'YES' : 'NO'
    }));

  const wsExpenses = XLSX.utils.json_to_sheet(expenseData);
  XLSX.utils.book_append_sheet(wb, wsExpenses, 'Expense Ledger');

  // Write and trigger download
  const filename = `GNH_Ledger_${cycleMonth}_${monthName.replace(/\s+/g, '_')}.xlsx`;
  XLSX.writeFile(wb, filename);
}

/**
 * Export a formatted A4 PDF summary statement
 */
export function exportToPDF(
  cycleMonth: string,
  summaries: DevoteeMonthlySummary[],
  _allExpenses?: Expense[]
) {
  const monthName = formatMonthName(cycleMonth);
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
  });

  // Colors
  const saffronColor: [number, number, number] = [217, 119, 6]; // #d97706
  const slateDark: [number, number, number] = [30, 41, 59];

  // Header Banner
  doc.setFillColor(...saffronColor);
  doc.rect(0, 0, 595.28, 70, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('GNH PRASADAM & EXPENSE STATEMENT', 40, 36);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`Monthly Ledger: ${monthName} | Generated: ${new Date().toLocaleDateString('en-IN')}`, 40, 54);

  // Financial Overview Aggregates
  const totalCost = summaries.reduce((sum, s) => sum + s.prasadam_cost, 0);
  const totalExpenses = summaries.reduce((sum, s) => sum + s.approved_expenses, 0);
  const totalMeals = summaries.reduce((sum, s) => sum + s.total_meals, 0);
  const netDue = summaries.filter(s => s.final_balance > 0).reduce((sum, s) => sum + s.final_balance, 0);
  const netSurplus = summaries.filter(s => s.final_balance < 0).reduce((sum, s) => sum + Math.abs(s.final_balance), 0);

  doc.setTextColor(...slateDark);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('1. Community Financial Summary', 40, 95);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Total Devotee Groups: ${summaries.length}`, 40, 112);
  doc.text(`Total Prasadam Meals Served: ${totalMeals}`, 40, 126);
  doc.text(`Total Prasadam Cost: ${formatRupee(totalCost)}`, 220, 112);
  doc.text(`Approved Regular Expenses: ${formatRupee(totalExpenses)}`, 220, 126);
  doc.text(`Net Receivable from Devotees: ${formatRupee(netDue)}`, 400, 112);
  doc.text(`Net Payable by GNH: ${formatRupee(netSurplus)}`, 400, 126);

  // Table of Devotees
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('2. Devotee-wise Ledger & Balances', 40, 155);

  const tableBody = summaries.map((s, index) => [
    (index + 1).toString(),
    s.devotee.group_name,
    s.devotee.phone_number,
    s.total_meals.toString(),
    formatRupee(s.prasadam_cost),
    formatRupee(s.approved_expenses),
    formatRupee(s.carried_forward),
    formatRupee(s.final_balance),
    s.final_balance > 0 ? 'Owes GNH' : s.final_balance < 0 ? 'GNH Owes' : 'Settled',
  ]);

  autoTable(doc, {
    startY: 165,
    head: [['#', 'Group Name', 'Phone', 'Meals', 'Cost', 'Expense', 'Carry Fwd', 'Final Bal', 'Status']],
    body: tableBody,
    theme: 'grid',
    headStyles: {
      fillColor: saffronColor,
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [30, 41, 59],
    },
    columnStyles: {
      0: { cellWidth: 20 },
      1: { cellWidth: 105 },
      2: { cellWidth: 65 },
      3: { cellWidth: 35, halign: 'center' },
      4: { cellWidth: 55, halign: 'right' },
      5: { cellWidth: 55, halign: 'right' },
      6: { cellWidth: 55, halign: 'right' },
      7: { cellWidth: 65, halign: 'right' },
      8: { cellWidth: 60, halign: 'center' },
    },
    styles: {
      cellPadding: 3,
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 7) {
        const rawText = data.cell.raw as string;
        if (rawText.startsWith('-')) {
          data.cell.styles.textColor = [16, 185, 129]; // Green
          data.cell.styles.fontStyle = 'bold';
        } else if (rawText !== '₹0') {
          data.cell.styles.textColor = [225, 29, 72]; // Red
          data.cell.styles.fontStyle = 'bold';
        }
      }
    }
  });

  // Footer note on last page
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `GNH Community Seva App - Page ${i} of ${pageCount} | Prasadam Rates: B ₹40, L ₹80, D ₹40`,
      40,
      820
    );
  }

  const filename = `GNH_Statement_${cycleMonth}.pdf`;
  doc.save(filename);
}

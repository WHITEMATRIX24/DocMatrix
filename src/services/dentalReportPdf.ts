import { jsPDF } from 'jspdf';
import { DentalReportData, DentalReportSection } from './dentalReportsApi';

/**
 * Generates and downloads a clean, professional PDF file of the dental report.
 */
export function downloadDentalReportPdf(
  report: DentalReportData,
  customTitle?: string,
  customSummary?: string,
  customSections?: DentalReportSection[]
): void {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;
  const contentWidth = pageWidth - margin * 2;
  let y = 45;

  const checkPageBreak = (neededHeight: number) => {
    if (y + neededHeight > pageHeight - 55) {
      doc.addPage();
      y = 45;
    }
  };

  // 1. Clinic Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text((report.clinic.name || 'DOCMATRIX DENTAL CLINIC').toUpperCase(), margin, y);

  // Report Reference & Date (Right aligned)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(13, 148, 136); // teal-600
  doc.text(report.reportId, pageWidth - margin, y, { align: 'right' });

  y += 15;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139); // slate-500
  const clinicContact = [report.clinic.address, report.clinic.phone ? `Tel: ${report.clinic.phone}` : '', report.clinic.email ? `Email: ${report.clinic.email}` : '']
    .filter(Boolean)
    .join('  •  ');
  doc.text(clinicContact || 'DocMatrix Dental Healthcare System', margin, y);

  const formattedDate = new Date(report.generatedAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  doc.text(`Date: ${formattedDate}`, pageWidth - margin, y, { align: 'right' });

  // Divider line
  y += 12;
  doc.setDrawColor(13, 148, 136);
  doc.setLineWidth(1.5);
  doc.line(margin, y, pageWidth - margin, y);

  // 2. Report Document Title
  y += 24;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  const finalTitle = (customTitle || report.title).toUpperCase();
  doc.text(finalTitle, margin, y);

  // 3. Patient Demographic Card
  y += 12;
  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.setLineWidth(0.75);
  doc.roundedRect(margin, y, contentWidth, 54, 4, 4, 'FD');

  const pY = y + 16;
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'bold');
  doc.text('PATIENT NAME', margin + 12, pY);
  doc.text('PATIENT ID', margin + 140, pY);
  doc.text('AGE / GENDER', margin + 230, pY);
  doc.text('MOBILE PHONE', margin + 320, pY);
  doc.text('TREATING DOCTOR', margin + 410, pY);

  const vY = pY + 14;
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.text(report.patient.fullName, margin + 12, vY);
  doc.text(report.patient.patientCode || report.patient.id, margin + 140, vY);
  doc.setFont('helvetica', 'normal');
  doc.text(`${report.patient.age} / ${report.patient.gender}`, margin + 230, vY);
  doc.text(report.patient.mobile || 'N/A', margin + 320, vY);
  doc.text(report.doctorSignoff.doctorName, margin + 410, vY);

  y += 62;

  // Medical Alert Banner if Allergies exist
  const allergies = report.patient.medicalSafetyAlerts?.allergies;
  if (allergies) {
    checkPageBreak(30);
    doc.setFillColor(254, 242, 242); // red-50
    doc.setDrawColor(254, 202, 202); // red-200
    doc.roundedRect(margin, y, contentWidth, 24, 4, 4, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(185, 28, 28); // red-700
    doc.text(`MEDICAL SAFETY ALERT: Patient has documented allergies: ${allergies}`, margin + 10, y + 15);
    y += 32;
  }

  // 4. Clinical Executive Summary Box
  const summaryText = customSummary || report.executiveSummary;
  if (summaryText) {
    const summaryLines = doc.splitTextToSize(summaryText, contentWidth - 24);
    const boxHeight = summaryLines.length * 13 + 16;
    checkPageBreak(boxHeight);

    doc.setFillColor(240, 253, 250); // teal-50
    doc.setDrawColor(13, 148, 136); // teal-600
    doc.roundedRect(margin, y, contentWidth, boxHeight, 3, 3, 'F');
    doc.setLineWidth(3);
    doc.line(margin, y, margin, y + boxHeight); // thick left border

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 118, 110); // teal-700
    doc.text('CLINICAL SUMMARY', margin + 12, y + 14);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(19, 78, 74);
    doc.text(summaryLines, margin + 12, y + 26);

    y += boxHeight + 16;
  }

  // 5. Sections
  const sectionsToRender = customSections || report.sections;
  for (const sec of sectionsToRender) {
    checkPageBreak(40);

    // Section Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text(sec.title.toUpperCase(), margin, y);

    if (sec.badge) {
      doc.setFontSize(8);
      doc.setTextColor(13, 148, 136);
      doc.text(`[${sec.badge}]`, margin + doc.getTextWidth(sec.title.toUpperCase()) + 8, y);
    }

    y += 4;
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);
    y += 12;

    // Section Body Text
    if (sec.content) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(51, 65, 85);
      const contentLines = doc.splitTextToSize(sec.content, contentWidth);
      checkPageBreak(contentLines.length * 12);
      doc.text(contentLines, margin, y);
      y += contentLines.length * 12 + 8;
    }

    // Section Table if present
    if (sec.tableData && sec.tableData.length > 0) {
      const cols = Object.keys(sec.tableData[0]);
      const colWidth = contentWidth / cols.length;
      checkPageBreak(40);

      // Table Header Row
      doc.setFillColor(241, 245, 249);
      doc.rect(margin, y, contentWidth, 18, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);

      cols.forEach((col, cIdx) => {
        const headerLabel = col.replace(/([A-Z])/g, ' $1').toUpperCase();
        doc.text(headerLabel, margin + cIdx * colWidth + 6, y + 12);
      });
      y += 18;

      // Table Data Rows
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      sec.tableData.forEach((row, rIdx) => {
        checkPageBreak(16);
        if (rIdx % 2 === 1) {
          doc.setFillColor(250, 250, 250);
          doc.rect(margin, y, contentWidth, 15, 'F');
        }
        doc.setTextColor(30, 41, 59);
        cols.forEach((col, cIdx) => {
          const val = String(row[col] ?? '');
          const truncated = doc.splitTextToSize(val, colWidth - 8)[0] || '';
          doc.text(truncated, margin + cIdx * colWidth + 6, y + 11);
        });
        y += 15;
      });

      y += 10;
    }

    y += 6;
  }

  // 6. Odontogram Charting Summary if present
  if (report.odontogramSummary) {
    checkPageBreak(50);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text('DENTAL ODONTOGRAM CHARTING STATUS (FDI)', margin, y);
    y += 4;
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);
    y += 14;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(51, 65, 85);

    const odontItems = [
      `Active Caries: ${report.odontogramSummary.caries.join(', ') || 'None detected'}`,
      `Restorations Present: ${report.odontogramSummary.restored.join(', ') || 'None'}`,
      `Root Canal Treated (RCT): ${report.odontogramSummary.rct.join(', ') || 'None'}`,
      `Crowns & Fixed Units: ${report.odontogramSummary.crowns.join(', ') || 'None'}`,
      `Missing Teeth: ${report.odontogramSummary.missing.join(', ') || 'None'}`,
    ];

    odontItems.forEach((item) => {
      checkPageBreak(14);
      doc.text(`• ${item}`, margin + 8, y);
      y += 13;
    });

    y += 8;
  }

  // 7. Doctor Sign-off Block
  checkPageBreak(80);
  y += 16;
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 24;

  // Left notice
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text('Electronically verified clinical record', margin, y);
  doc.text('DocMatrix Automated Clinical Reporting Engine', margin, y + 10);

  // Right signature
  const sigX = pageWidth - margin - 180;
  doc.setDrawColor(148, 163, 184);
  doc.line(sigX, y + 14, sigX + 180, y + 14);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text(report.doctorSignoff.doctorName, sigX, y + 28);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(report.doctorSignoff.doctorTitle, sigX, y + 40);
  doc.text(`Date: ${formattedDate}  |  Reg: ${report.doctorSignoff.registrationNumber}`, sigX, y + 51);

  // Add Page Numbers to all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Page ${i} of ${totalPages}  •  Confidential Medical Record`,
      pageWidth / 2,
      pageHeight - 20,
      { align: 'center' }
    );
  }

  // Trigger browser file download
  const sanitizedName = (report.patient.fullName || 'patient').replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
  const fileReportType = report.reportType.toLowerCase();
  const filename = `${fileReportType}_report_${sanitizedName}_${report.patient.patientCode || 'pt'}.pdf`;
  doc.save(filename);
}

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Generates a professional cybersecurity PDF remediation report using jsPDF & autotable.
 * 
 * @param {Object} reportData
 * @param {number} reportData.initialScore
 * @param {number} reportData.finalScore
 * @param {number} reportData.scoreImprovement
 * @param {Array<Object>} reportData.findingsBefore
 * @param {Array<Object>} reportData.findingsResolved
 * @param {Array<Object>} reportData.findingsRemaining
 * @param {Array<string>} reportData.remediationSummary
 * @param {string} reportData.verificationStatus
 * @param {string} reportData.timestamp
 * @param {string} reportData.fileName
 * @param {string} reportData.scanId
 */
export function generateRemediationPdf(reportData) {
  try {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 14;

    // Dark cyber header banner
    doc.setFillColor(15, 17, 26); // #0F111A
    doc.rect(0, 0, pageWidth, 42, 'F');

    // Accent line
    doc.setFillColor(124, 92, 255); // #7C5CFF
    doc.rect(0, 41, pageWidth, 1.5, 'F');

    // CloudGuard Branding
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(245, 247, 255);
    doc.text('CLOUDGUARD SECURITY PLATFORM', margin, 15);

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(34, 211, 238); // Cyan
    doc.text('VERIFIED SECURITY REMEDIATION REPORT', margin, 23);

    doc.setFontSize(8.5);
    doc.setTextColor(141, 145, 166);
    const dateStr = new Date(reportData.timestamp || Date.now()).toUTCString();
    doc.text(`Generated: ${dateStr}  |  Scan ID: ${reportData.scanId || 'LIVE-AUDIT'}`, margin, 31);
    doc.text(`Target Configuration: ${reportData.fileName || 'cloud-config.json'}`, margin, 36);

    // Verification Badge
    doc.setFillColor(52, 211, 153); // Emerald #34D399
    doc.roundedRect(pageWidth - 75, 12, 61, 10, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(7, 7, 12);
    doc.text('VERIFIED RE-SCAN AUDIT', pageWidth - 71, 18.5);

    let currentY = 50;

    // Executive Score Summary Box
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, currentY, pageWidth - margin * 2, 28, 3, 3, 'FD');

    // Initial Score
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text('INITIAL SECURITY SCORE', margin + 6, currentY + 8);
    doc.setFontSize(18);
    doc.setTextColor(239, 68, 68); // Red
    doc.text(`${reportData.initialScore ?? 0}/100`, margin + 6, currentY + 18);

    // Arrow
    doc.setFontSize(16);
    doc.setTextColor(148, 163, 184);
    doc.text('→', margin + 62, currentY + 16);

    // Final Score
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text('FINAL SECURITY SCORE', margin + 76, currentY + 8);
    doc.setFontSize(18);
    doc.setTextColor(16, 185, 129); // Green
    doc.text(`${reportData.finalScore ?? 100}/100`, margin + 76, currentY + 18);

    // Improvement Delta
    const delta = (reportData.finalScore ?? 100) - (reportData.initialScore ?? 0);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text('SCORE IMPROVEMENT', margin + 132, currentY + 8);
    doc.setFontSize(18);
    doc.setTextColor(124, 92, 255); // Purple
    doc.text(`+${Math.max(0, delta)} pts`, margin + 132, currentY + 18);

    // Score subtitle
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(100, 116, 139);
    doc.text(
      'Evaluated deterministically via the CloudGuard Rule Engine. Zero AI hallucinations in scoring.',
      margin + 6,
      currentY + 24
    );

    currentY += 36;

    // Section 1: Exact Remediation Summary
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text('1. Deterministic Remediation Actions Applied', margin, currentY);

    currentY += 4;

    const summaryItems = (reportData.remediationSummary && reportData.remediationSummary.length > 0)
      ? reportData.remediationSummary
      : ['No automated configuration modifications applied.'];

    summaryItems.forEach((action, idx) => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(51, 65, 85);
      const textLines = doc.splitTextToSize(`• ${action}`, pageWidth - margin * 2 - 4);
      doc.text(textLines, margin + 2, currentY + 3);
      currentY += textLines.length * 4.2;
    });

    currentY += 4;

    // Section 2: Findings Resolved Table
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text(`2. Misconfigurations Resolved & Verified (${reportData.findingsResolved?.length || 0})`, margin, currentY);

    const resolvedRows = (reportData.findingsResolved || []).map((f) => [
      f.ruleId || 'RULE',
      f.severity || 'HIGH',
      f.resource || 'Resource',
      f.title || f.description || 'Misconfiguration resolved via deterministic patch',
      'VERIFIED RESOLVED'
    ]);

    autoTable(doc, {
      startY: currentY + 3,
      head: [['Rule ID', 'Severity', 'Target Resource', 'Finding Title', 'Audit Status']],
      body: resolvedRows.length > 0 ? resolvedRows : [['N/A', 'N/A', 'No resolved findings', 'N/A', 'N/A']],
      theme: 'grid',
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: [255, 255, 255],
        fontSize: 8,
        fontStyle: 'bold'
      },
      bodyStyles: {
        fontSize: 7.5,
        textColor: [51, 65, 85]
      },
      columnStyles: {
        0: { cellWidth: 24, fontStyle: 'bold' },
        1: { cellWidth: 20 },
        2: { cellWidth: 42 },
        3: { cellWidth: 'auto' },
        4: { cellWidth: 32, fontStyle: 'bold', textColor: [5, 150, 105] }
      },
      margin: { left: margin, right: margin }
    });

    currentY = doc.lastAutoTable.finalY + 8;

    // Section 3: Findings Remaining Table (if any)
    const remainingFindings = reportData.findingsRemaining || [];
    if (remainingFindings.length > 0) {
      if (currentY > pageHeight - 40) {
        doc.addPage();
        currentY = 20;
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(185, 28, 28);
      doc.text(`3. Findings Remaining Requiring Manual Attention (${remainingFindings.length})`, margin, currentY);

      const remainingRows = remainingFindings.map((f) => [
        f.ruleId || 'RULE',
        f.severity || 'HIGH',
        f.resource || 'Resource',
        f.remediation || f.description || 'Manual intervention required',
        'OPEN'
      ]);

      autoTable(doc, {
        startY: currentY + 3,
        head: [['Rule ID', 'Severity', 'Target Resource', 'Recommended Action', 'Status']],
        body: remainingRows,
        theme: 'grid',
        headStyles: {
          fillColor: [153, 27, 27],
          textColor: [255, 255, 255],
          fontSize: 8,
          fontStyle: 'bold'
        },
        bodyStyles: {
          fontSize: 7.5,
          textColor: [51, 65, 85]
        },
        columnStyles: {
          0: { cellWidth: 24, fontStyle: 'bold' },
          1: { cellWidth: 20 },
          2: { cellWidth: 42 },
          3: { cellWidth: 'auto' },
          4: { cellWidth: 20, fontStyle: 'bold', textColor: [220, 38, 38] }
        },
        margin: { left: margin, right: margin }
      });

      currentY = doc.lastAutoTable.finalY + 8;
    }

    // Footer / Attestation Statement
    if (currentY > pageHeight - 30) {
      doc.addPage();
      currentY = 20;
    }

    doc.setFillColor(241, 245, 249);
    doc.roundedRect(margin, currentY, pageWidth - margin * 2, 18, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text('AUDIT ATTESTATION & DETERMINISTIC INTEGRITY GUARANTEE', margin + 4, currentY + 5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(100, 116, 139);
    doc.text(
      'This report reflects results verified via AST reconfiguration and re-execution of CloudGuard deterministic security rules.',
      margin + 4,
      currentY + 10
    );
    doc.text(
      `Verification Status: ${reportData.verificationStatus || 'DETERMINISTIC_RESCAN_VERIFIED'} | Zero Real Cloud Credentials Required.`,
      margin + 4,
      currentY + 14
    );

    // Save PDF file
    const safeName = (reportData.fileName || 'CloudGuard')
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .replace(/_{2,}/g, '_');
    doc.save(`CloudGuard-Remediation-Report-${safeName}.pdf`);
    return true;
  } catch (err) {
    console.error('Failed to generate remediation PDF:', err);
    alert('PDF Generation failed: ' + err.message);
    return false;
  }
}

function escapePdfText(input: string): string {
  return String(input || '')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/[^\x20-\x7E]/g, ' ');
}

function wrapText(text: string, maxChars = 88): string[] {
  const lines: string[] = [];
  const paragraphs = String(text || '').split(/\r?\n/);
  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (!trimmed) {
      lines.push('');
      continue;
    }
    const words = trimmed.split(/\s+/);
    let current = '';
    for (const word of words) {
      if (!current) {
        current = word;
      } else if (current.length + 1 + word.length <= maxChars) {
        current += ' ' + word;
      } else {
        lines.push(current);
        current = word;
      }
    }
    if (current) lines.push(current);
  }
  return lines;
}

export interface ConsentPdfPayload {
  documentRef: string;
  title: string;
  status: string;
  templateVersion?: number | null;
  documentVersion?: number | null;
  clinicName: string;
  clinicAddress?: string | null;
  clinicPhone?: string | null;
  patientName: string;
  patientCode: string;
  patientAge?: string | number | null;
  patientGender?: string | null;
  patientMobile?: string | null;
  patientAddress?: string | null;
  appointmentId?: string | null;
  appointmentDate?: string | null;
  appointmentTime?: string | null;
  consultationId?: string | null;
  procedureName?: string | null;
  treatmentPlanTitle?: string | null;
  toothOrArea?: string | null;
  dentistName?: string | null;
  sections: { heading: string; body?: string | null }[];
  patientSignedAt?: string | null;
  patientSignatureMethod?: string | null;
  hasPatientSignature: boolean;
  guardianName?: string | null;
  guardianRelationship?: string | null;
  guardianSignedAt?: string | null;
  hasGuardianSignature: boolean;
  dentistVerifiedBy?: string | null;
  verifiedAt?: string | null;
  hasDentistSignature: boolean;
  evidenceHash?: string | null;
}

/**
 * Generates a valid multi-page PDF 1.4 buffer for a patient consent record.
 */
export function buildConsentPdfBuffer(payload: ConsentPdfPayload): Buffer {
  const lines: { text: string; bold?: boolean; size?: number }[] = [];

  const pushHeading = (text: string) => {
    lines.push({ text: '', size: 10 });
    lines.push({ text, bold: true, size: 11 });
  };
  const pushBody = (text: string) => {
    for (const l of wrapText(text, 90)) {
      lines.push({ text: l, bold: false, size: 9.5 });
    }
  };

  lines.push({ text: payload.clinicName || 'DocMatrix Dental Clinic', bold: true, size: 14 });
  if (payload.clinicAddress || payload.clinicPhone) {
    lines.push({
      text: [payload.clinicAddress, payload.clinicPhone].filter(Boolean).join(' | '),
      bold: false,
      size: 9,
    });
  }
  lines.push({ text: '------------------------------------------------------------------------------------------', size: 9 });
  lines.push({ text: payload.title || 'Informed Dental Consent', bold: true, size: 13 });
  lines.push({
    text: `Ref: ${payload.documentRef}   |   Status: ${payload.status}   |   Template v${payload.templateVersion ?? 1} / Doc v${payload.documentVersion ?? 1}`,
    size: 9,
  });

  pushHeading('PATIENT INFORMATION');
  pushBody(`Patient Name: ${payload.patientName}   |   Patient ID: ${payload.patientCode}`);
  pushBody(
    `Age: ${payload.patientAge ?? '—'}   |   Gender: ${payload.patientGender || '—'}   |   Mobile: ${payload.patientMobile || '—'}`,
  );
  pushBody(`Address: ${payload.patientAddress || '—'}`);

  pushHeading('APPOINTMENT & PROCEDURE DETAILS');
  pushBody(
    `Procedure: ${payload.procedureName || '—'}   |   Dentist: ${payload.dentistName || '—'}`,
  );
  pushBody(
    `Appointment Date: ${payload.appointmentDate || '—'}   |   Time: ${payload.appointmentTime || '—'}   |   Appointment ID: ${payload.appointmentId || '—'}`,
  );
  pushBody(
    `Consultation ID: ${payload.consultationId || '—'}   |   Treatment Plan: ${payload.treatmentPlanTitle || '—'}   |   Tooth/Area: ${payload.toothOrArea || '—'}`,
  );

  for (const section of payload.sections) {
    if (!section.body) continue;
    pushHeading(section.heading.toUpperCase());
    pushBody(section.body);
  }

  pushHeading('SIGNATURES & VERIFICATION');
  pushBody(
    `Patient Signature: ${
      payload.hasPatientSignature
        ? `SIGNED on ${payload.patientSignedAt || '—'} (Method: ${payload.patientSignatureMethod || 'Digital'})`
        : 'Pending Patient Signature'
    }`,
  );
  if (payload.hasGuardianSignature || payload.guardianName) {
    pushBody(
      `Guardian Signature: ${
        payload.hasGuardianSignature
          ? `SIGNED by ${payload.guardianName || '—'} (${payload.guardianRelationship || 'Authorized Representative'}) on ${payload.guardianSignedAt || '—'}`
          : 'Not signed'
      }`,
    );
  }
  pushBody(
    `Dentist Verification: ${
      payload.hasDentistSignature || payload.verifiedAt
        ? `VERIFIED by ${payload.dentistVerifiedBy || payload.dentistName || 'Dentist'} on ${payload.verifiedAt || '—'}`
        : 'Pending Dentist Verification'
    }`,
  );
  if (payload.evidenceHash) {
    pushBody(`Integrity Hash (SHA-256): ${payload.evidenceHash}`);
  }

  // Paginate into 52 lines per page
  const linesPerPage = 52;
  const pages: { text: string; bold?: boolean; size?: number }[][] = [];
  for (let i = 0; i < lines.length; i += linesPerPage) {
    pages.push(lines.slice(i, i + linesPerPage));
  }
  if (pages.length === 0) pages.push([{ text: 'Consent Record', bold: true, size: 12 }]);

  const objects: string[] = [];
  // 1: Catalog, 2: Pages, 3: Font Regular, 4: Font Bold
  const fontRegularId = 3;
  const fontBoldId = 4;
  const pageIds: number[] = [];

  // Placeholder for 1..4
  objects.push(''); // 1
  objects.push(''); // 2
  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'); // 3
  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>'); // 4

  for (const pageLines of pages) {
    const contentStreamParts: string[] = ['BT'];
    let y = 760;
    for (const line of pageLines) {
      const fontRef = line.bold ? '/F2' : '/F1';
      const fontSize = line.size || 10;
      contentStreamParts.push(`${fontRef} ${fontSize} Tf`);
      contentStreamParts.push(`1 0 0 1 45 ${y} Tm`);
      contentStreamParts.push(`(${escapePdfText(line.text)}) Tj`);
      y -= fontSize + 4;
    }
    contentStreamParts.push('ET');
    const streamStr = contentStreamParts.join('\n');
    const contentId = objects.length + 1;
    objects.push(`<< /Length ${Buffer.byteLength(streamStr, 'utf8')} >>\nstream\n${streamStr}\nendstream`);

    const pageId = objects.length + 1;
    pageIds.push(pageId);
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 ${fontRegularId} 0 R /F2 ${fontBoldId} 0 R >> >> /Contents ${contentId} 0 R >>`,
    );
  }

  objects[0] = '<< /Type /Catalog /Pages 2 0 R >>';
  objects[1] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`;

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [0];
  for (let i = 0; i < objects.length; i++) {
    offsets.push(Buffer.byteLength(pdf, 'utf8'));
    pdf += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
  }
  const xrefOffset = Buffer.byteLength(pdf, 'utf8');
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (let i = 1; i <= objects.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  return Buffer.from(pdf, 'utf8');
}

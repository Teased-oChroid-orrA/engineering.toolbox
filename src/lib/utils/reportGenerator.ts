import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export function generateReport(name: string, props: any, audit: any) {
  const doc = new jsPDF();
  doc.setFontSize(18);
  doc.text('Engineering Evaluation Report', 10, 20);

  autoTable(doc, {
    startY: 30,
    head: [['Property', 'Result']],
    body: [
      ['Area', String(props?.area ?? '')],
      ['Ixx', String(props?.ixx ?? '')],
      ['Iyy', String(props?.iyy ?? '')],
      ['Sxx Top', String(props?.sxx_top ?? '')],
      ['Sxx Bot', String(props?.sxx_bot ?? '')],
      ['R_g', String(props?.r_g ?? '')],
    ],
  });

  if (Array.isArray(audit) && audit.length) {
    const rows = audit.map((a: any) => [a.entity_id, a.constraint_type, a.status, String(a.residual_error)]);
    // @ts-ignore
    const y = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 10 : 90;
    autoTable(doc, {
      startY: y,
      head: [['Entity', 'Constraint', 'Status', 'Residual']],
      body: rows,
    });
  }

  doc.save(`${name}_Analysis.pdf`);
}

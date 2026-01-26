import jsPDF from 'jspdf';

interface InvoiceData {
  invoiceNumber: string;
  invoiceDate: string;
  month: string;
  parentName: string;
  parentEmail: string;
  childName: string;
  centerName: string;
  activityName: string;
  coursePrice: number;
  transportPrice: number;
  totalAmount: number;
}

export function generateInvoicePDF(data: InvoiceData): jsPDF {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let yPosition = 20;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.setTextColor(255, 193, 7);
  doc.text('SHIPP', pageWidth / 2, yPosition, { align: 'center' });

  yPosition += 10;
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.setFont('helvetica', 'normal');
  doc.text('Abidjan Cocody Vallon – Rue J79', pageWidth / 2, yPosition, { align: 'center' });

  yPosition += 5;
  doc.text('infos@shipp-group.com', pageWidth / 2, yPosition, { align: 'center' });

  yPosition += 15;
  doc.setDrawColor(200, 200, 200);
  doc.line(15, yPosition, pageWidth - 15, yPosition);

  yPosition += 10;
  doc.setFontSize(18);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.text('FACTURE', 15, yPosition);

  yPosition += 8;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`N° ${data.invoiceNumber}`, 15, yPosition);
  doc.text(`Date: ${data.invoiceDate}`, pageWidth - 15, yPosition, { align: 'right' });

  yPosition += 15;
  doc.setFont('helvetica', 'bold');
  doc.text('INFORMATIONS CLIENT', 15, yPosition);

  yPosition += 7;
  doc.setFont('helvetica', 'normal');
  doc.text(`Nom: ${data.parentName}`, 15, yPosition);

  yPosition += 6;
  doc.text(`Email: ${data.parentEmail}`, 15, yPosition);

  yPosition += 12;
  doc.setFont('helvetica', 'bold');
  doc.text('INFORMATIONS ENFANT', 15, yPosition);

  yPosition += 7;
  doc.setFont('helvetica', 'normal');
  doc.text(`Enfant: ${data.childName}`, 15, yPosition);

  yPosition += 6;
  doc.text(`Centre: ${data.centerName}`, 15, yPosition);

  yPosition += 6;
  doc.text(`Activité: ${data.activityName}`, 15, yPosition);

  yPosition += 15;
  doc.setFillColor(245, 245, 245);
  doc.rect(15, yPosition - 3, pageWidth - 30, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.text('DÉTAILS DE LA FACTURATION', 15, yPosition);

  yPosition += 10;
  doc.setFont('helvetica', 'normal');
  doc.text(`Mois concerné: ${data.month}`, 15, yPosition);

  yPosition += 10;
  doc.text('Tarif formation:', 15, yPosition);
  doc.text(`${data.coursePrice.toLocaleString('fr-FR')} FCFA`, pageWidth - 15, yPosition, { align: 'right' });

  yPosition += 7;
  doc.text('Tarif transport:', 15, yPosition);
  doc.text(`${data.transportPrice.toLocaleString('fr-FR')} FCFA`, pageWidth - 15, yPosition, { align: 'right' });

  yPosition += 10;
  doc.setDrawColor(0, 0, 0);
  doc.line(15, yPosition, pageWidth - 15, yPosition);

  yPosition += 7;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('TOTAL', 15, yPosition);
  doc.text(`${data.totalAmount.toLocaleString('fr-FR')} FCFA`, pageWidth - 15, yPosition, { align: 'right' });

  const footerY = doc.internal.pageSize.getHeight() - 20;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(120, 120, 120);
  doc.text('Facture générée par SHIPP – coordination transport et activités', pageWidth / 2, footerY, { align: 'center' });

  return doc;
}

export function downloadInvoice(pdf: jsPDF, filename: string): void {
  pdf.save(filename);
}

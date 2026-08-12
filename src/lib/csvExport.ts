export function exportToCSV(data: any[], filename: string) {
  if (!data || data.length === 0) {
    alert('Aucune donnée à exporter');
    return;
  }

  const headers = Object.keys(data[0]);

  const csvContent = [
    headers.join(','),
    ...data.map(row =>
      headers.map(header => {
        const value = row[header];

        if (value === null || value === undefined) {
          return '';
        }

        const stringValue = String(value);

        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }

        return stringValue;
      }).join(',')
    )
  ].join('\n');

  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });

  const link = document.createElement('a');
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

export function generateCSVFilename(prefix: string): string {
  const now = new Date();
  const date = now.toISOString().split('T')[0].replace(/-/g, '');
  const time = now.toTimeString().split(' ')[0].replace(/:/g, '').substring(0, 4);
  return `shipp_${prefix}_${date}_${time}.csv`;
}

export function formatDateForCSV(date: string | null): string {
  if (!date) return '';
  return new Date(date).toISOString().split('T')[0];
}

export function formatAmountForCSV(amount: number | null): string {
  if (amount === null || amount === undefined) return '0';
  return amount.toString();
}

export function exportEnrollmentsToCSV(enrollments: any[], filename: string) {
  if (!enrollments || enrollments.length === 0) {
    alert('Aucune inscription à exporter');
    return;
  }

  const calculateAge = (birthDate: string) => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const csvData = enrollments.map(enrollment => ({
    'Enfant': enrollment.children ? `${enrollment.children.first_name} ${enrollment.children.last_name}` : 'N/A',
    'Âge': enrollment.children?.birth_date ? calculateAge(enrollment.children.birth_date) : 'N/A',
    'Parent': enrollment.profiles?.full_name || 'N/A',
    'Téléphone': enrollment.profiles?.phone || 'N/A',
    'Activité': enrollment.activities?.name || 'N/A',
    'Mois': enrollment.enrollment_month ? new Date(enrollment.enrollment_month).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long' }) : 'N/A',
    'Montant (FCFA)': enrollment.amount_total || 0,
    'Paiement': enrollment.payment_status === 'paid' ? 'Payé' : enrollment.payment_status === 'pending' ? 'En attente' : enrollment.payment_status,
    'Statut': enrollment.status === 'confirmed' ? 'Actif' : enrollment.status === 'cancelled' ? 'Annulé' : enrollment.status,
    'Date inscription': formatDateForCSV(enrollment.created_at),
  }));

  exportToCSV(csvData, `${filename}.csv`);
}

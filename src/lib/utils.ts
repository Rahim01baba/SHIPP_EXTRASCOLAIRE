export function calculateAge(dateOfBirth: string): number {
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  return age;
}

export function formatCurrency(amount: number): string {
  return `${amount.toFixed(2)} $`;
}

export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function formatTime(time: string): string {
  return time.slice(0, 5);
}

export function generatePaymentReference(childId: string, activityId: string, month: string): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 7);
  return `SHIPP-${timestamp}-${random}`.toUpperCase();
}

export function generateInvoiceNumber(): string {
  const year = new Date().getFullYear();
  const month = (new Date().getMonth() + 1).toString().padStart(2, '0');
  const timestamp = Date.now().toString(36);
  return `INV-${year}${month}-${timestamp}`.toUpperCase();
}

export function getEnrollmentMonthOptions(): { value: string; label: string }[] {
  const options: { value: string; label: string }[] = [];
  const currentDate = new Date();

  for (let i = 0; i < 12; i++) {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth() + i, 1);
    const value = date.toISOString().slice(0, 7) + '-01';
    const label = date.toLocaleDateString('fr-FR', { year: 'numeric', month: 'long' });
    options.push({ value, label });
  }

  return options;
}

export function validateAge(dateOfBirth: string, minAge: number, maxAge: number): boolean {
  const age = calculateAge(dateOfBirth);
  return age >= minAge && age <= maxAge;
}

export function getActivityTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    painting: 'Peinture',
    music: 'Musique',
    sport: 'Sport',
    robotics: 'Robotique',
    aviation: 'Aviation',
    language: 'Langues',
    science: 'Sciences',
    theater: 'Théâtre',
    dance: 'Danse',
    other: 'Autre',
  };
  return labels[type] || type;
}

export function getStatusLabel(status: string): { label: string; color: string } {
  const statuses: Record<string, { label: string; color: string }> = {
    pending: { label: 'En attente', color: 'yellow' },
    confirmed: { label: 'Confirmée', color: 'green' },
    cancelled: { label: 'Annulée', color: 'red' },
    completed: { label: 'Complétée', color: 'blue' },
    failed: { label: 'Échouée', color: 'red' },
    refunded: { label: 'Remboursée', color: 'orange' },
  };
  return statuses[status] || { label: status, color: 'gray' };
}

export function classNames(...classes: (string | boolean | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}

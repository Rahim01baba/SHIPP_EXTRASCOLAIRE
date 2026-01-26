export type EnrollmentStatus =
  | 'pending_admin_validation'
  | 'active'
  | 'rejected'
  | 'cancelled'
  | 'confirmed';

export const ENROLLMENT_STATUS = {
  PENDING_ADMIN_VALIDATION: 'pending_admin_validation' as const,
  ACTIVE: 'active' as const,
  REJECTED: 'rejected' as const,
  CANCELLED: 'cancelled' as const,
  CONFIRMED: 'confirmed' as const,
};

export function getEnrollmentStatusLabel(status: string): string {
  switch (status) {
    case 'pending_admin_validation':
      return 'En attente validation SHIPP';
    case 'active':
    case 'confirmed':
      return 'Validée';
    case 'rejected':
      return 'Refusée';
    case 'cancelled':
      return 'Annulée';
    default:
      return status;
  }
}

export function getEnrollmentStatusColor(status: string): 'yellow' | 'green' | 'red' | 'gray' {
  switch (status) {
    case 'pending_admin_validation':
      return 'yellow';
    case 'active':
    case 'confirmed':
      return 'green';
    case 'rejected':
      return 'red';
    case 'cancelled':
      return 'gray';
    default:
      return 'gray';
  }
}

export function getEnrollmentStatusBadgeVariant(status: string): 'success' | 'warning' | 'danger' | 'neutral' {
  switch (status) {
    case 'pending_admin_validation':
      return 'warning';
    case 'active':
    case 'confirmed':
      return 'success';
    case 'rejected':
      return 'danger';
    case 'cancelled':
      return 'neutral';
    default:
      return 'neutral';
  }
}

export function normalizeEnrollmentStatus(status: string): string {
  if (status === 'confirmed') return 'active';
  return status;
}

export function isActiveEnrollment(status: string): boolean {
  return status === 'active' || status === 'confirmed';
}

export function isPendingValidation(status: string): boolean {
  return status === 'pending_admin_validation';
}

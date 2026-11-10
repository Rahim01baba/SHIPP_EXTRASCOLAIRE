/**
 * Authentification des parents par numéro de téléphone (sans OTP).
 *
 * Supabase Auth exige un e-mail pour la connexion e-mail + mot de passe.
 * Pour les parents, on dérive donc un e-mail technique à partir du numéro
 * normalisé (ex. parent.2250701020304@shipp-group.com). Le parent ne le voit
 * jamais : il se connecte avec son numéro et son mot de passe.
 *
 * Prérequis Supabase : Authentication → Providers → Email → « Confirm email »
 * doit être désactivé, sinon Supabase tentera d'envoyer un e-mail de
 * confirmation à cette adresse technique.
 */

// Domaine réel de SHIPP (il a des enregistrements MX, ce qui évite un rejet
// par la validation d'adresse de Supabase). Aucun e-mail n'y est envoyé tant
// que la confirmation d'e-mail est désactivée.
const PHONE_EMAIL_PREFIX = 'parent.';
const PHONE_EMAIL_DOMAIN = 'shipp-group.com';
const PHONE_EMAIL_PATTERN = /^parent\.225\d{10}@shipp-group\.com$/i;

/**
 * Normalise un numéro ivoirien vers le format international sans "+"
 * (225 + 10 chiffres). Accepte : "07 01 02 03 04", "+225 0701020304",
 * "00225 07-01-02-03-04"… Retourne null si le numéro est invalide.
 */
export function normalizeCIPhone(input: string): string | null {
  let digits = (input || '').replace(/\D/g, '');

  if (digits.startsWith('00225')) digits = digits.slice(5);
  else if (digits.startsWith('225') && digits.length === 13) digits = digits.slice(3);

  // Numérotation ivoirienne à 10 chiffres (01, 05, 07 mobiles ; 21, 25, 27 fixes)
  if (!/^(01|05|07|21|25|27)\d{8}$/.test(digits)) return null;

  return `225${digits}`;
}

/** Format lisible : +225 07 01 02 03 04 */
export function formatCIPhone(normalized: string): string {
  const local = normalized.startsWith('225') ? normalized.slice(3) : normalized;
  return `+225 ${local.replace(/(\d{2})(?=\d)/g, '$1 ')}`.trim();
}

export function phoneToAuthEmail(normalized: string): string {
  return `${PHONE_EMAIL_PREFIX}${normalized}@${PHONE_EMAIL_DOMAIN}`;
}

export function isPhoneAuthEmail(email: string | null | undefined): boolean {
  return !!email && PHONE_EMAIL_PATTERN.test(email);
}

/** E-mail à afficher : masque l'adresse technique des comptes téléphone. */
export function displayEmail(email: string | null | undefined): string {
  if (!email || isPhoneAuthEmail(email)) return '—';
  return email;
}

/**
 * Convertit l'identifiant saisi à la connexion (téléphone ou e-mail)
 * en e-mail Supabase. Retourne null si ce n'est ni l'un ni l'autre.
 */
export function loginIdentifierToEmail(identifier: string): string | null {
  const value = identifier.trim();
  if (value.includes('@')) return value.toLowerCase();
  const phone = normalizeCIPhone(value);
  return phone ? phoneToAuthEmail(phone) : null;
}

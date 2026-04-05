/** Основной облачный аккаунт с персональным профилем привычек / целей / дневника. */
export const NIKOLAY_ACCOUNT_EMAIL_PRIMARY = 'nikolaytwins@gmail.com';

/** Частая опечатка в логине — учитываем оба варианта. */
export const NIKOLAY_ACCOUNT_EMAIL_ALIAS = 'nikollaytwins@gmail.com';

export function isNikolayPrimaryAccount(email: string | null | undefined): boolean {
  if (!email) return false;
  const e = email.trim().toLowerCase();
  return e === NIKOLAY_ACCOUNT_EMAIL_PRIMARY || e === NIKOLAY_ACCOUNT_EMAIL_ALIAS;
}

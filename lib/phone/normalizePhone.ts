export function normalizePhoneForHref(phone: string): string {
  return phone.replace(/[^\d+]/g, "");
}

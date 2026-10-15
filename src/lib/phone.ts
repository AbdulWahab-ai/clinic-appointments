/**
 * Phone helpers. Numbers are stored in E.164 (+923001234567).
 * Pakistani local formats are normalized: 03001234567, 3001234567, 0092300…, +92 300-1234567.
 */
export function normalizePhone(input: string, defaultCountry: "PK" = "PK"): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const hasPlus = trimmed.startsWith("+");
  let digits = trimmed.replace(/\D/g, "");
  if (!digits) return null;

  if (hasPlus) return isPlausibleE164(digits) ? `+${digits}` : null;
  if (digits.startsWith("00")) digits = digits.slice(2);
  else if (defaultCountry === "PK") {
    if (digits.startsWith("0")) digits = `92${digits.slice(1)}`;
    else if (digits.length === 10 && digits.startsWith("3")) digits = `92${digits}`;
  }
  return isPlausibleE164(digits) ? `+${digits}` : null;
}

function isPlausibleE164(digits: string): boolean {
  if (digits.length < 8 || digits.length > 15 || digits.startsWith("0")) return false;
  // Pakistani mobiles: +92 3XX XXXXXXX (12 digits total).
  if (digits.startsWith("92")) return /^92\d{9,10}$/.test(digits);
  return true;
}

/** "+923001234567" → "+92 300 ***4567": for logs and on-screen hints. */
export function maskPhone(e164: string): string {
  if (e164.length < 8) return "***";
  return `${e164.slice(0, 3)} ${e164.slice(3, 6)} ***${e164.slice(-4)}`;
}

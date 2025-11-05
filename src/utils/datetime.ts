// Utilities to parse and format backend timestamps like
// "YYYY-MM-DD HH:mm:ss.SSSSSS" (e.g., 2025-11-05 13:19:28.512932)

export function parseDbDate(input: string | Date | null | undefined): Date | null {
  if (!input) return null;
  if (input instanceof Date) return isNaN(input.getTime()) ? null : input;
  const s = String(input).trim();
  // Try fast path: ISO-like replace and trim microseconds
  const match = s.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,6}))?$/);
  if (match) {
    const [, y, m, d, hh, mm, ss, frac] = match;
    const year = Number(y);
    const month = Number(m) - 1; // JS Date: 0-11
    const day = Number(d);
    const hour = Number(hh);
    const minute = Number(mm);
    const second = Number(ss);
    const millis = frac ? Number((frac + '000').slice(0, 3)) : 0; // keep only ms precision
    const dt = new Date(year, month, day, hour, minute, second, millis);
    return isNaN(dt.getTime()) ? null : dt;
  }
  // Fallback: replace space with 'T' and drop anything after 3 fractional digits
  const parts = s.replace(' ', 'T').split('.');
  const normalized = parts.length > 1 ? `${parts[0]}.${parts[1].slice(0, 3)}` : parts[0];
  const d = new Date(normalized);
  return isNaN(d.getTime()) ? null : d;
}

export function formatLocalDateTime(
  input: string | Date | null | undefined,
  locale?: string,
  options?: Intl.DateTimeFormatOptions
): string {
  const d = parseDbDate(input);
  if (!d) return '';
  try {
    return d.toLocaleString(locale, options);
  } catch {
    return d.toString();
  }
}

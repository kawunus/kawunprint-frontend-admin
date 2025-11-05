export type JwtPayload = Record<string, any> & {
  id?: number;
  email?: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  role?: string;
};

function base64UrlDecode(input: string): string {
  const b64 = input.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((input.length + 3) % 4);
  try {
    return decodeURIComponent(escape(atob(b64)));
  } catch {
    try {
      const binStr = atob(b64);
      const bytes = new Uint8Array(binStr.length);
      for (let i = 0; i < binStr.length; i++) bytes[i] = binStr.charCodeAt(i);
      return new TextDecoder('utf-8').decode(bytes);
    } catch {
      return '';
    }
  }
}

export function parseJwt<T extends JwtPayload = JwtPayload>(token?: string): T | null {
  const raw = token ?? localStorage.getItem('authToken');
  if (!raw) return null;
  const parts = raw.split('.');
  if (parts.length < 2) return null;
  const json = base64UrlDecode(parts[1]);
  if (!json) return null;
  try {
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}

export function getUserIdFromToken(): number | null {
  const payload = parseJwt();
  const id = (payload?.id ?? null);
  return typeof id === 'number' && Number.isFinite(id) ? id : (id != null ? Number(id) : null) || null;
}

export function getUserNameFromToken(): string | null {
  const p = parseJwt();
  if (!p) return null;
  if (p.name && typeof p.name === 'string') return p.name;
  const first = (p.firstName as string) || '';
  const last = (p.lastName as string) || '';
  const full = `${first} ${last}`.trim();
  return full || null;
}

export interface JwtUserInfo {
  firstName?: string;
  lastName?: string;
  full?: string;
  role?: string;
  email?: string;
}

export function getUserInfoFromToken(): JwtUserInfo | null {
  const data: any = parseJwt();
  if (!data) return null;
  const firstName = data.firstName || data.given_name || undefined;
  const lastName = data.lastName || data.family_name || undefined;
  const full = data.name || (firstName && lastName ? `${firstName} ${lastName}` : firstName || lastName) || undefined;
  const email = data.email || undefined;
  const role = data.role || data['role'] || undefined;
  return { firstName, lastName, full, role, email };
}


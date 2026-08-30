export type AccessPayload = {
  sub: string;
  handle: string;
  role: string;
};

export function readAccessPayload(token: string): AccessPayload | null {
  const parts = token.split('.');
  if (parts.length < 2) {
    return null;
  }
  try {
    const json = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'))) as {
      sub?: unknown;
      handle?: unknown;
      role?: unknown;
    };
    if (typeof json.sub !== 'string' || typeof json.handle !== 'string') {
      return null;
    }
    return {
      sub: json.sub,
      handle: json.handle,
      role: typeof json.role === 'string' ? json.role : 'member',
    };
  } catch {
    return null;
  }
}

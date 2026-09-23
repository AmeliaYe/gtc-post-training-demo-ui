import { timingSafeEqual } from 'node:crypto';

function matches(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

export function isValidAdminAuthorization(authorization: string | null) {
  const expectedUser = process.env.ANALYTICS_ADMIN_USER;
  const expectedPassword = process.env.ANALYTICS_ADMIN_PASSWORD;

  if (!expectedUser || !expectedPassword || !authorization?.startsWith('Basic ')) return false;

  try {
    const decoded = Buffer.from(authorization.slice(6), 'base64').toString('utf8');
    const separator = decoded.indexOf(':');
    if (separator < 0) return false;

    return matches(decoded.slice(0, separator), expectedUser)
      && matches(decoded.slice(separator + 1), expectedPassword);
  } catch {
    return false;
  }
}

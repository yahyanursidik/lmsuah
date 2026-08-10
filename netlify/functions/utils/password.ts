import { hashPassword, verifyPassword } from 'better-auth/crypto';
import { compare as verifyBcryptPassword } from 'bcryptjs';

export async function hashCredentialPassword(password: string) {
  return hashPassword(password);
}

export async function verifyCompatiblePassword({ hash, password }: { hash: string; password: string }) {
  if (/^\$2[aby]\$/.test(hash)) {
    return verifyBcryptPassword(password, hash);
  }

  // Temporary compatibility for participant accounts created before password
  // hashing was added to manual registration/import/reset flows.
  if (!hash.includes(':')) {
    return hash === password;
  }

  return verifyPassword({ hash, password });
}

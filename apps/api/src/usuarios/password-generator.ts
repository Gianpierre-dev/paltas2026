import * as crypto from 'crypto';

// Alfabeto sin chars ambiguos (sin 0/O, 1/l/I) — facilita transcripción manual.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
const DEFAULT_LENGTH = 12;

/**
 * Genera una password aleatoria fuerte de 12 chars [A-Za-z2-9] (sin chars confusos).
 * Entropía ≈ 71 bits — más que suficiente para uso humano + cambio obligatorio
 * al primer login.
 */
export function generateTemporaryPassword(length = DEFAULT_LENGTH): string {
  const bytes = crypto.randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i++) {
    out += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return out;
}

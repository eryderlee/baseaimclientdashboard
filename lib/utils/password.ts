/**
 * Secure password generation utility
 * Uses crypto.getRandomValues for cryptographically secure randomness
 */

/**
 * Helper: Get a cryptographically secure random integer in [0, max)
 * @param max - Upper bound (exclusive)
 * @returns Random integer from 0 to max-1
 */
function secureRandomInt(max: number): number {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return array[0] % max;
}

/**
 * Generate a cryptographically secure password
 * @param length - Password length (default: 12)
 * @returns Password containing at least one lowercase, uppercase, digit, and symbol
 */
export function generateSecurePassword(length: number = 12): string {
  const lowercase = "abcdefghijklmnopqrstuvwxyz";
  const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const digits = "0123456789";
  const symbols = "!@#$%^&*";
  const allChars = lowercase + uppercase + digits + symbols;

  // Ensure we have at least one of each required character type
  const result: string[] = [
    lowercase[secureRandomInt(lowercase.length)],
    uppercase[secureRandomInt(uppercase.length)],
    digits[secureRandomInt(digits.length)],
    symbols[secureRandomInt(symbols.length)],
  ];

  // Fill remaining length with random characters from all sets
  for (let i = result.length; i < length; i++) {
    result.push(allChars[secureRandomInt(allChars.length)]);
  }

  // Fisher-Yates shuffle using secure randomness
  for (let i = result.length - 1; i > 0; i--) {
    const j = secureRandomInt(i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result.join("");
}

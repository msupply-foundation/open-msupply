/*
 * The demo program's patient code: the issuing store's code, three random
 * characters and a counter the server keeps per store, `GRY-K7Q-0001`
 * (kdd/custom-forms/specs.md § Generated identifiers). Deliberately unlike
 * the host's own generator (`GRY0001`, from the store's name): a plugin's
 * generator is a few lines of its own code, so it can build whatever a
 * deployment's codes look like.
 */

/**
 * The server counter the codes are drawn from. Named once and never renamed:
 * a new name would start a new counter and reissue numbers already given out.
 */
export const PATIENT_CODE_COUNTER = 'DemoPatientCode';

// Upper-case letters and digits without the ones read as each other (0 and O,
// 1, I and L), so a code read aloud or copied by hand survives.
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

// The largest multiple of the alphabet's length a byte can hold: bytes at or
// above it are drawn again, so every character is equally likely.
const LIMIT = 256 - (256 % ALPHABET.length);

/**
 * Three random characters of the alphabet. `randomBytes` is the source of
 * randomness, the browser's cryptographic one unless a test passes its own.
 */
export const randomPart = (
  randomBytes: (count: number) => Uint8Array = count =>
    crypto.getRandomValues(new Uint8Array(count))
): string => {
  let part = '';
  while (part.length < 3) {
    for (const byte of randomBytes(3 - part.length)) {
      if (byte < LIMIT) part += ALPHABET[byte % ALPHABET.length];
    }
  }
  return part;
};

/** The code for a counter value drawn at a store. */
export const formatPatientCode = (
  storeCode: string,
  random: string,
  counter: number
): string => `${storeCode}-${random}-${String(counter).padStart(4, '0')}`;

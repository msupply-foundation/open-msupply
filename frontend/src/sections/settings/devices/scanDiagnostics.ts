// Making a scan inspectable — the pure half of the Test scanner screen.
//
// The screen exists to answer one question a list of strings cannot: did the
// scanner produce EXACTLY these characters? That matters because the barcode
// registry keys on the code "character for character, including case and any
// spaces" (spec/barcode-scanning/rules.md § Looking a code up), and the
// registry has no maintenance surface — a code learned wrong is wrong
// permanently (rules § The book has no maintenance surface).
//
// The characters that actually go wrong are the ones a plain <code> block
// cannot show: the GS1 field separator, stray spaces, a terminator the
// scanner appended. So they are rendered visibly, and two reads can be
// compared character by character.

/** The GS1 field separator — invisible, load-bearing, and easy to lose. */
const GROUP_SEPARATOR = 29;

/**
 * Render a raw scan so every character is visible, using the Unicode Control
 * Pictures block (U+2400…) — ␝ for the field separator, ␣ for a space, ␊ for
 * a newline. A control character rendered as itself is the one thing a
 * diagnostic screen must never do.
 */
export const visualiseRaw = (raw: string): string =>
  [...raw]
    .map(char => {
      const code = char.codePointAt(0) ?? 0;
      if (code === 32) return '␣'; // ␣ open box
      if (code === 127) return '␡'; // ␡
      if (code < 32) return String.fromCharCode(0x2400 + code); // ␀…␟
      return char;
    })
    .join('');

/** Every byte as two hex digits, for the raw readout of a HID report. */
export const toHex = (bytes: number[]): string =>
  bytes.map(b => b.toString(16).padStart(2, '0')).join(' ');

const isInvisible = (char: string): boolean => {
  const code = char.codePointAt(0) ?? 0;
  return code < 33 || code === 127;
};

/** Whether a scan carries anything that would be invisible if printed as-is. */
export const hasInvisibleCharacters = (raw: string): boolean =>
  [...raw].some(isInvisible);

/** How many characters would be invisible if printed as-is. */
export const invisibleCount = (raw: string): number =>
  [...raw].filter(isInvisible).length;

/**
 * How many field separators a scan carries — a structured label has at
 * least one.
 */
export const separatorCount = (raw: string): number =>
  [...raw].filter(char => char.codePointAt(0) === GROUP_SEPARATOR).length;

export type ScanComparison =
  | { equal: true }
  | {
      equal: false;
      /** 1-based, for display. */
      position: number;
      /** Absent where one scan simply ran out. */
      reference?: string;
      actual?: string;
    };

/**
 * Compare two reads character by character.
 *
 * This is what makes the cross-mode check on the Test scanner screen a glance
 * rather than an exercise: the same label read in USB report mode and in
 * keyboard-wedge mode MUST produce identical characters, or the registry
 * learns one physical label as two separate codes. The reference app's wedge
 * fails exactly this — it uppercases everything and drops all punctuation.
 */
export const compareScans = (
  reference: string,
  actual: string
): ScanComparison => {
  const refChars = [...reference];
  const actualChars = [...actual];
  const length = Math.max(refChars.length, actualChars.length);
  for (let i = 0; i < length; i += 1) {
    if (refChars[i] !== actualChars[i]) {
      return {
        equal: false,
        position: i + 1,
        reference: refChars[i],
        actual: actualChars[i],
      };
    }
  }
  return { equal: true };
};

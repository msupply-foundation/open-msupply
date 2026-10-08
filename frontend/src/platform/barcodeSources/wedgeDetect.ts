// Telling a keyboard-wedge scanner from a person typing — the pure half, so
// all of it is testable without a DOM or a scanner.
//
// A wedge scanner emulates a USB keyboard, so it sends KEY POSITIONS (HID
// usage codes), not characters. This module decides only which runs of
// positions are a scan. It never decides which CHARACTERS they stand for:
// that depends on the layout the scanner emits against, which is an
// interpretation, and lives in the reading layer
// (src/domain/barcode/keystrokes.ts). Nothing here needs it — whether a
// position produces a character at all is the same on every layout, and
// that is the only question run detection asks.
//
// The reference implementation (client/packages/electron/src/keyboardScanner)
// keeps only `Key*` and `Digit*`, uppercased, so case is lost and every
// hyphen, dot and slash is silently deleted. The barcode registry keys on the
// code EXACTLY — "character for character, including case and any spaces"
// (spec/barcode-scanning/rules.md § Looking a code up) — so here every
// character-bearing position is kept, and anything that cannot be part of a
// barcode FAILS the scan rather than shortening it.

import type { ScanKey } from './source';

// --- Which positions carry a character --------------------------------------
//
// Exported so the reading layer's layout tables can be typed against them:
// a position classified here as a character but missing from a table there
// is a compile error, not a silently dropped character.

/** Punctuation positions, US naming (`KeyboardEvent.code`). */
export const PUNCTUATION_POSITIONS = [
  'Minus',
  'Equal',
  'BracketLeft',
  'BracketRight',
  'Backslash',
  'Semicolon',
  'Quote',
  'Comma',
  'Period',
  'Slash',
  'Backquote',
  'Space',
] as const;
export type PunctuationPosition = (typeof PUNCTUATION_POSITIONS)[number];

/** The keypad's non-digit symbol keys, which some scanners use. */
export const NUMPAD_SYMBOL_POSITIONS = [
  'NumpadDecimal',
  'NumpadAdd',
  'NumpadSubtract',
  'NumpadMultiply',
  'NumpadDivide',
] as const;
export type NumpadSymbolPosition = (typeof NUMPAD_SYMBOL_POSITIONS)[number];

/**
 * Positions that, with Ctrl held, stand for a C0 control character — how a
 * scanner sends a byte no key produces. Ctrl+] is the GS1 field separator.
 * Ctrl+letter is handled separately (every letter has one).
 */
export const CONTROL_POSITIONS = [
  'BracketLeft',
  'Backslash',
  'BracketRight',
  'Digit6',
  'Minus',
] as const;
export type ControlPosition = (typeof CONTROL_POSITIONS)[number];

/**
 * Keys a scanner uses for a byte with no key of its own. ZKTeco sends F8 for
 * the GS1 separator. The mapping is the reading layer's; that it carries a
 * character at all is capture's.
 */
export const SEPARATOR_KEY_POSITIONS = ['F8'] as const;

/** Keys that produce no character and must not disturb a run. */
const MODIFIERS = new Set([
  'ShiftLeft', 'ShiftRight', 'ControlLeft', 'ControlRight',
  'AltLeft', 'AltRight', 'MetaLeft', 'MetaRight', 'CapsLock',
  // A scanner toggles NumLock around an Alt+numpad sequence to guarantee the
  // keypad is in numeric mode. Carries no character, and must not break the
  // run it sits inside.
  'NumLock',
]);

/** Ends a barcode. Scanners are commonly configured to suffix one of these. */
const TERMINATORS = new Set(['Enter', 'NumpadEnter', 'Tab']);

const isLetter = (code: string) => code.startsWith('Key') && code.length === 4;
const isDigitRow = (code: string) => /^Digit\d$/.test(code);
const isNumpadDigit = (code: string) => /^Numpad\d$/.test(code);
const has = <T extends string>(list: readonly T[], code: string): code is T =>
  (list as readonly string[]).includes(code);

type KeyClass =
  /** A position that stands for one character, whatever the layout. */
  | 'char'
  /**
   * One digit of an Alt+numpad code-entry sequence — `Alt+0029` for the GS1
   * separator. The whole sequence is one character.
   */
  | 'alt-digit'
  /** The scanner's end-of-barcode keystroke. */
  | 'terminator'
  /** A bare modifier, or a Ctrl combination with no character. Not a defect. */
  | 'ignore'
  /**
   * Meaningful to a human, meaningless inside a barcode — Escape, arrows,
   * function keys.
   */
  | 'unmappable';

export const classifyKey = ({ code, alt, ctrl }: ScanKey): KeyClass => {
  if (has(SEPARATOR_KEY_POSITIONS, code)) return 'char';
  // Windows Alt-code entry: Alt held while decimal digits are typed on the
  // keypad. Only the host composes it, and only on Windows, so everywhere
  // else the raw keystrokes arrive.
  if (alt && isNumpadDigit(code)) return 'alt-digit';
  if (ctrl) {
    return isLetter(code) || has(CONTROL_POSITIONS, code) ? 'char' : 'ignore';
  }
  if (MODIFIERS.has(code)) return 'ignore';
  if (TERMINATORS.has(code)) return 'terminator';
  if (
    isLetter(code) ||
    isDigitRow(code) ||
    isNumpadDigit(code) ||
    has(NUMPAD_SYMBOL_POSITIONS, code) ||
    has(PUNCTUATION_POSITIONS, code)
  ) {
    return 'char';
  }
  return 'unmappable';
};

/**
 * How many characters a run of keystrokes stands for, without deciding which
 * ones: an Alt+numpad sequence is four keystrokes and one character.
 */
export const characterCount = (keys: ScanKey[]): number => {
  let count = 0;
  let inAltSequence = false;
  for (const key of keys) {
    const kind = classifyKey(key);
    if (kind === 'alt-digit') {
      inAltSequence = true;
      continue;
    }
    // A modifier must not break a sequence it sits inside — a scanner
    // brackets its Alt+numpad run with NumLock.
    if (kind === 'ignore') continue;
    if (inAltSequence) count += 1;
    inAltSequence = false;
    if (kind === 'char') count += 1;
  }
  return inAltSequence ? count + 1 : count;
};

// --- Telling a scanner from a human -----------------------------------------
//
// A scanner emits keystrokes far faster than anyone can type, which is the
// only signal available. A run of keys whose gaps are all under
// `maxMsBetweenKeys`, at least `minBarcodeLength` long, is a scan.
//
// The reference implementation suppresses EVERY keystroke while armed and
// re-injects the ones it later judges human, which costs a full timeout of
// latency on every character the user types and needs a busy-wait lock in the
// Electron main process to stay consistent. Here the first key of a run is
// deliberately let THROUGH instead:
//
//   - human typing (gaps over the threshold) is never a run of more than one,
//     so nothing is ever suppressed and there is no latency at all;
//   - a scan leaks exactly one character into whatever had focus, which the
//     caller removes when the barcode completes;
//   - a short fast burst — a quick typist, rarely — is replayed.
//
// So the expensive paths are the rare ones, instead of the universal one.

type WedgeSettings = {
  /** Above this gap, the next key starts a new run. */
  maxMsBetweenKeys: number;
  /** Shorter completed runs are typing, not a scan. */
  minBarcodeLength: number;
};

/** The reference app's values, which are matched to real scanner output. */
export const WEDGE_DEFAULTS: WedgeSettings = {
  maxMsBetweenKeys: 50,
  minBarcodeLength: 5,
};

/**
 * A keystroke as captured: the position that a scan hands up, plus the
 * character the OS produced for it, which is what gets put back if the run
 * turns out to be a person typing.
 *
 * The replay uses the OS's character rather than any layout table because
 * typing went through the USER's layout, not the scanner's — replaying it
 * through a US table would turn an AZERTY user's "a" into "q". The reference
 * app replays positions and gets exactly that wrong.
 */
export type CapturedKey = ScanKey & {
  /** `KeyboardEvent.key` where it is a single character; else absent. */
  typed?: string;
};

type Run = {
  /** The keystrokes as they arrived. */
  keys: CapturedKey[];
  lastMs: number;
  /** An unmappable key arrived mid-run: the read is incomplete, not shorter. */
  corrupt: boolean;
};

export type WedgeState = { run?: Run };

export const emptyWedgeState = (): WedgeState => ({});

export type WedgeOutcome =
  /**
   * A scan, as the KEY POSITIONS that arrived. Which characters those mean
   * is decided by the reading layer. `leakedChars` already reached the page
   * and need removing.
   */
  | { kind: 'barcode'; keys: ScanKey[]; leakedChars: number }
  /**
   * A scan that cannot be trusted — reported, never handed up as a code
   * with a character missing. Carries the keystrokes anyway: which key
   * could not be placed is the whole diagnostic.
   */
  | { kind: 'corrupt'; keys: ScanKey[] }
  /** Not a scan. `replay` was suppressed and must be given back to the page. */
  | { kind: 'typing'; replay: string };

/** Drop the capture-only `typed` field: a scan hands up positions alone. */
const positions = (keys: CapturedKey[]): ScanKey[] =>
  keys.map(({ code, shift, alt, ctrl }) => ({ code, shift, alt, ctrl }));

const finish = (run: Run, settings: WedgeSettings): WedgeOutcome => {
  // Length is counted in CHARACTERS, not keystrokes: an Alt+numpad sequence
  // is four keystrokes and one character, and a run of six keys that is
  // really two characters is not a barcode.
  const isScan = characterCount(run.keys) >= settings.minBarcodeLength;
  if (isScan && run.corrupt) return { kind: 'corrupt', keys: positions(run.keys) };
  if (isScan) return { kind: 'barcode', keys: positions(run.keys), leakedChars: 1 };
  // The first character was let through; only the rest were held back.
  return {
    kind: 'typing',
    replay: run.keys
      .slice(1)
      .map(k => k.typed ?? '')
      .join(''),
  };
};

type WedgeStep = {
  state: WedgeState;
  /** Whether the caller must preventDefault this keystroke. */
  suppress: boolean;
  /** A run ended on this keystroke. */
  completed?: WedgeOutcome;
};

export const feedKey = (
  state: WedgeState,
  stroke: CapturedKey,
  nowMs: number,
  settings: WedgeSettings = WEDGE_DEFAULTS
): WedgeStep => {
  const kind = classifyKey(stroke);
  // A bare modifier carries no character and must not count as a gap — a
  // scanner holding shift for a capital would otherwise break its own run.
  if (kind === 'ignore') return { state, suppress: false };

  const run = state.run;
  const inRun = run !== undefined && nowMs - run.lastMs < settings.maxMsBetweenKeys;

  // A key arriving after the threshold closes whatever came before it.
  const completed = run && !inRun ? finish(run, settings) : undefined;
  const carried = inRun ? run : undefined;

  if (kind === 'terminator') {
    // Outside a run this is the user's own Enter or Tab — leave it alone.
    if (!carried) return { state: {}, suppress: false, completed };
    // Inside one it is the scanner's suffix: swallow it, so a scan cannot
    // submit the form underneath, and close the run now rather than waiting
    // out the timeout.
    return { state: {}, suppress: true, completed: finish(carried, settings) };
  }

  if (kind === 'unmappable') {
    // Outside a run: an ordinary Escape or arrow key, none of our business.
    if (!carried) return { state: {}, suppress: false, completed };
    // Inside one: a key that cannot be part of a barcode arrived
    // mid-barcode. Marked rather than dropped — a dropped character yields a
    // plausible, WRONG code (see the registry note at the top of this file).
    return {
      state: {
        run: {
          ...carried,
          keys: [...carried.keys, stroke],
          corrupt: true,
          lastMs: nowMs,
        },
      },
      suppress: true,
      completed,
    };
  }

  if (!carried) {
    // First key of a possible run. Let it through: it is far more likely to
    // be someone typing, and holding it back would tax every keystroke.
    return {
      state: {
        run: { keys: [stroke], lastMs: nowMs, corrupt: false },
      },
      suppress: false,
      completed,
    };
  }

  return {
    state: {
      run: { ...carried, keys: [...carried.keys, stroke], lastMs: nowMs },
    },
    suppress: true,
    completed,
  };
};

/** Close an open run because the threshold elapsed with no further key. */
export const flushWedge = (
  state: WedgeState,
  settings: WedgeSettings = WEDGE_DEFAULTS
): { state: WedgeState; completed?: WedgeOutcome } =>
  state.run
    ? { state: {}, completed: finish(state.run, settings) }
    : { state };

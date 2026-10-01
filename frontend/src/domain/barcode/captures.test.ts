import { describe, expect, it } from 'vitest';
import { itemNumber, readScan, scanCode, type ReadScan } from './readScan';
import type { RawScan, ScanKey } from '@/platform/barcodeSources/source';
import { toRawScan as fromHoneywell } from '@/platform/barcodeSources/honeywell';
import { toRawScan as fromCamera } from '@/platform/barcodeSources/camera';
import {
  emptyWedgeState,
  feedKey,
  flushWedge,
  type WedgeOutcome,
  type WedgeState,
} from '@/platform/barcodeSources/wedgeDetect';

/*
 * Real reads of real labels, 2026-09-23: six labels on one desk, read by
 * every input the app drives, transcribed from the Test scanner screen's
 * raw readouts. The property under test is the one the barcode registry
 * depends on — it keys on the code exactly, and has no screen that can list
 * or correct one — so ONE PHYSICAL LABEL MUST READ AS ONE THING, whichever
 * scanner, mode or decoder produced it (OMS-REG-BAC-01.69; test names lead
 * with the behaviours they cover).
 *
 * Each capture is fed through the same conversion its source uses in the
 * app, then through the reading layer, and must equal its label's expected
 * reading exactly. A change to framing, key mapping, tidying or GS1 parsing
 * that makes any scanner disagree fails here.
 *
 * Inputs:
 *   zebra-wedge     USB scanner, keyboard emulation; separator as Alt+0029
 *   usb-hid         the same scanner in HID mode, via WebHID
 *   desktop-hid     the same scanner in HID mode, via the desktop app's
 *                   native reader (node-hid) — 2026-09-25, same labels
 *   f8-wedge        a second USB scanner, keyboard emulation; separator as F8
 *   honeywell       Honeywell SDK on Android (text + out-of-band AIM id)
 *   camera-bundled  MLKit, bundled engine
 *   camera-google   MLKit, Google Code Scanner
 *
 * Not every input read every label; gaps are gaps, not omissions. One
 * Google Code Scanner read of the EAN-13 came back as 9300817270520 — a
 * two-digit misread whose check digit still validates — and repeat scans
 * read it correctly. The misread is left out: it is the decoder's error, not
 * one this layer could have caught.
 */

const GS = String.fromCharCode(29);

// --- The labels -----------------------------------------------------------

/** A GS1 DataMatrix carrying the whole label. */
const FULL_LABEL = `016036658250798921100000087118${GS}1726013110U013383${GS}3072`;

const EXPECTED: Record<string, ReadScan> = {
  fullLabel: {
    kind: 'gs1',
    content: FULL_LABEL,
    elements: [
      { ai: '01', data: '60366582507989' },
      { ai: '21', data: '100000087118' },
      { ai: '17', data: '260131' },
      { ai: '10', data: 'U013383' },
      { ai: '30', data: '72' },
    ],
  },
  // The two linear halves of a second box's label: identity on one,
  // batch/expiry/quantity on the other.
  secondaryA: {
    kind: 'gs1',
    content: `1726013110U013383${GS}3072`,
    elements: [
      { ai: '17', data: '260131' },
      { ai: '10', data: 'U013383' },
      { ai: '30', data: '72' },
    ],
  },
  secondaryB: {
    kind: 'gs1',
    content: `17240600101907002${GS}302400`,
    elements: [
      { ai: '17', data: '240600' },
      { ai: '10', data: '1907002' },
      { ai: '30', data: '2400' },
    ],
  },
  gtinOnly: {
    kind: 'gs1',
    content: '0150382903018883',
    elements: [{ ai: '01', data: '50382903018883' }],
  },
  // Two different stickers — every input that read both read both.
  stickerC: { kind: 'raw', content: 'PX27052/C' },
  stickerD: { kind: 'raw', content: 'PX27052/D' },
  // A retail EAN-13, which must NOT read as GS1 (the reference app's parser
  // reads it as AI 93).
  ean13: { kind: 'raw', content: '9300657270520' },
};

// --- Transcription helpers ------------------------------------------------

/**
 * A keystroke readout from the Test scanner screen: "Shift+KeyU Alt+Numpad0
 * F8".
 */
const keystrokes = (readout: string): ScanKey[] =>
  readout.split(' ').map(token => {
    const parts = token.split('+');
    const code = parts.pop() ?? '';
    return {
      code,
      shift: parts.includes('Shift'),
      alt: parts.includes('Alt'),
      ctrl: parts.includes('Ctrl'),
    };
  });

/** A raw-report readout: "35 00 5d 64 …". */
const report = (readout: string): RawScan => ({
  kind: 'bytes',
  bytes: new Uint8Array(readout.split(' ').map(b => parseInt(b, 16))),
});

// --- The captures ---------------------------------------------------------

type Capture = { input: string; label: keyof typeof EXPECTED; scan: RawScan };

const wedge = (
  input: string,
  label: keyof typeof EXPECTED,
  readout: string
): Capture => ({ input, label, scan: { kind: 'keystrokes', keys: keystrokes(readout) } });

const ALT_GS = 'Alt+Numpad0 Alt+Numpad0 Alt+Numpad2 Alt+Numpad9';

const CAPTURES: Capture[] = [
  // zebra-wedge, 15:08
  wedge(
    'zebra-wedge',
    'fullLabel',
    `Digit0 Digit1 Digit6 Digit0 Digit3 Digit6 Digit6 Digit5 Digit8 Digit2 Digit5 Digit0 Digit7 Digit9 Digit8 Digit9 Digit2 Digit1 Digit1 Digit0 Digit0 Digit0 Digit0 Digit0 Digit0 Digit8 Digit7 Digit1 Digit1 Digit8 ${ALT_GS} Digit1 Digit7 Digit2 Digit6 Digit0 Digit1 Digit3 Digit1 Digit1 Digit0 Shift+KeyU Digit0 Digit1 Digit3 Digit3 Digit8 Digit3 ${ALT_GS} Digit3 Digit0 Digit7 Digit2`
  ),
  wedge(
    'zebra-wedge',
    'secondaryA',
    `Digit1 Digit7 Digit2 Digit6 Digit0 Digit1 Digit3 Digit1 Digit1 Digit0 Shift+KeyU Digit0 Digit1 Digit3 Digit3 Digit8 Digit3 ${ALT_GS} Digit3 Digit0 Digit7 Digit2`
  ),
  wedge(
    'zebra-wedge',
    'secondaryB',
    `Digit1 Digit7 Digit2 Digit4 Digit0 Digit6 Digit0 Digit0 Digit1 Digit0 Digit1 Digit9 Digit0 Digit7 Digit0 Digit0 Digit2 ${ALT_GS} Digit3 Digit0 Digit2 Digit4 Digit0 Digit0`
  ),
  wedge(
    'zebra-wedge',
    'gtinOnly',
    'Digit0 Digit1 Digit5 Digit0 Digit3 Digit8 Digit2 Digit9 Digit0 Digit3 Digit0 Digit1 Digit8 Digit8 Digit8 Digit3'
  ),
  wedge(
    'zebra-wedge',
    'stickerC',
    'Shift+KeyP Shift+KeyX Digit2 Digit7 Digit0 Digit5 Digit2 Slash Shift+KeyC'
  ),
  wedge(
    'zebra-wedge',
    'ean13',
    'Digit9 Digit3 Digit0 Digit0 Digit6 Digit5 Digit7 Digit2 Digit7 Digit0 Digit5 Digit2 Digit0'
  ),

  // usb-hid, 15:09 — one framing: length, 00, AIM id, data, padding, code, 00
  {
    input: 'usb-hid',
    label: 'fullLabel',
    scan: report(
      '35 00 5d 64 32 30 31 36 30 33 36 36 35 38 32 35 30 37 39 38 39 32 31 31 30 30 30 30 30 30 38 37 31 31 38 1d 31 37 32 36 30 31 33 31 31 30 55 30 31 33 33 38 33 1d 33 30 37 32 00 00 00 77 00'
    ),
  },
  {
    input: 'usb-hid',
    label: 'secondaryA',
    scan: report(
      '16 00 5d 43 31 31 37 32 36 30 31 33 31 31 30 55 30 31 33 33 38 33 1d 33 30 37 32 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 3f 00'
    ),
  },
  {
    input: 'usb-hid',
    label: 'secondaryB',
    scan: report(
      '18 00 5d 43 31 31 37 32 34 30 36 30 30 31 30 31 39 30 37 30 30 32 1d 33 30 32 34 30 30 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 3f 00'
    ),
  },
  {
    input: 'usb-hid',
    label: 'gtinOnly',
    scan: report(
      '10 00 5d 43 31 30 31 35 30 33 38 32 39 30 33 30 31 38 38 38 33 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 3f 00'
    ),
  },
  {
    input: 'usb-hid',
    label: 'stickerC',
    scan: report(
      '09 00 5d 64 31 50 58 32 37 30 35 32 2f 43 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 77 00'
    ),
  },
  {
    input: 'usb-hid',
    label: 'ean13',
    // This scanner calls an EAN-13 "]X9", where the Honeywell says "]E0".
    scan: report(
      '0d 00 5d 58 39 39 33 30 30 36 35 37 32 37 30 35 32 30 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 64 00'
    ),
  },

  // desktop-hid, 2026-09-25 14:24 — the usb-hid framing with the report ID
  // (02) in front, which node-hid keeps and WebHID strips
  {
    input: 'desktop-hid',
    label: 'fullLabel',
    scan: report(
      '02 35 00 5d 64 32 30 31 36 30 33 36 36 35 38 32 35 30 37 39 38 39 32 31 31 30 30 30 30 30 30 38 37 31 31 38 1d 31 37 32 36 30 31 33 31 31 30 55 30 31 33 33 38 33 1d 33 30 37 32 00 00 00 77 00'
    ),
  },
  {
    input: 'desktop-hid',
    label: 'secondaryA',
    scan: report(
      '02 16 00 5d 43 31 31 37 32 36 30 31 33 31 31 30 55 30 31 33 33 38 33 1d 33 30 37 32 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 3f 00'
    ),
  },
  {
    input: 'desktop-hid',
    label: 'stickerD',
    scan: report(
      '02 09 00 5d 64 31 50 58 32 37 30 35 32 2f 44 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 77 00'
    ),
  },
  {
    input: 'desktop-hid',
    label: 'ean13',
    scan: report(
      '02 0d 00 5d 58 39 39 33 30 30 36 35 37 32 37 30 35 32 30 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 64 00'
    ),
  },

  // f8-wedge, 15:16
  wedge(
    'f8-wedge',
    'fullLabel',
    'Digit0 Digit1 Digit6 Digit0 Digit3 Digit6 Digit6 Digit5 Digit8 Digit2 Digit5 Digit0 Digit7 Digit9 Digit8 Digit9 Digit2 Digit1 Digit1 Digit0 Digit0 Digit0 Digit0 Digit0 Digit0 Digit8 Digit7 Digit1 Digit1 Digit8 F8 Digit1 Digit7 Digit2 Digit6 Digit0 Digit1 Digit3 Digit1 Digit1 Digit0 Shift+KeyU Digit0 Digit1 Digit3 Digit3 Digit8 Digit3 F8 Digit3 Digit0 Digit7 Digit2'
  ),
  wedge(
    'f8-wedge',
    'gtinOnly',
    'Digit0 Digit1 Digit5 Digit0 Digit3 Digit8 Digit2 Digit9 Digit0 Digit3 Digit0 Digit1 Digit8 Digit8 Digit8 Digit3'
  ),
  wedge(
    'f8-wedge',
    'stickerC',
    'Shift+KeyP Shift+KeyX Digit2 Digit7 Digit0 Digit5 Digit2 Slash Shift+KeyC'
  ),
  wedge(
    'f8-wedge',
    'ean13',
    'Digit9 Digit3 Digit0 Digit0 Digit6 Digit5 Digit7 Digit2 Digit7 Digit0 Digit5 Digit2 Digit0'
  ),

  // honeywell, 15:19–15:25 — the SDK strips GS1's FNC1 and reports it as the
  // AIM id
  { input: 'honeywell', label: 'fullLabel', scan: fromHoneywell({ data: FULL_LABEL, aimId: ']d2' }) },
  { input: 'honeywell', label: 'secondaryA', scan: fromHoneywell({ data: `1726013110U013383${GS}3072`, aimId: ']C1' }) },
  { input: 'honeywell', label: 'secondaryB', scan: fromHoneywell({ data: `17240600101907002${GS}302400`, aimId: ']C1' }) },
  { input: 'honeywell', label: 'gtinOnly', scan: fromHoneywell({ data: '0150382903018883', aimId: ']C1' }) },
  { input: 'honeywell', label: 'stickerD', scan: fromHoneywell({ data: 'PX27052/D', aimId: ']d1' }) },
  { input: 'honeywell', label: 'ean13', scan: fromHoneywell({ data: '9300657270520', aimId: ']E0' }) },

  // camera-bundled, 15:27. MLKit marks GS1 IN the text, two different ways:
  // a leading separator on a DataMatrix, a literal "]C1" on GS1-128. (The
  // DataMatrix's leading separator is inferred: the build it was read on
  // converted it to "]d2" before display.)
  { input: 'camera-bundled', label: 'fullLabel', scan: fromCamera({ rawValue: GS + FULL_LABEL, format: 'DATA_MATRIX' }, 'bundled') },
  { input: 'camera-bundled', label: 'gtinOnly', scan: fromCamera({ rawValue: ']C10150382903018883', format: 'CODE_128' }, 'bundled') },
  { input: 'camera-bundled', label: 'stickerC', scan: fromCamera({ rawValue: 'PX27052/C', format: 'DATA_MATRIX' }, 'bundled') },
  { input: 'camera-bundled', label: 'stickerD', scan: fromCamera({ rawValue: 'PX27052/D', format: 'DATA_MATRIX' }, 'bundled') },
  { input: 'camera-bundled', label: 'ean13', scan: fromCamera({ rawValue: '9300657270520', format: 'EAN_13' }, 'bundled') },

  // camera-google, 15:29 (leading separator inferred as above)
  { input: 'camera-google', label: 'fullLabel', scan: fromCamera({ rawValue: GS + FULL_LABEL, format: 'DATA_MATRIX' }, 'google') },
  { input: 'camera-google', label: 'gtinOnly', scan: fromCamera({ rawValue: ']C10150382903018883', format: 'CODE_128' }, 'google') },
  { input: 'camera-google', label: 'secondaryB', scan: fromCamera({ rawValue: `]C117240600101907002${GS}302400`, format: 'CODE_128' }, 'google') },
  { input: 'camera-google', label: 'stickerC', scan: fromCamera({ rawValue: 'PX27052/C', format: 'DATA_MATRIX' }, 'google') },
];

// --- The tests ------------------------------------------------------------

describe('one label reads as one thing, whatever read it', () => {
  it.each(CAPTURES.map(c => [c.label, c.input, c] as const))(
    '.69 %s from %s',
    (_label, _input, capture) => {
      expect(readScan(capture.scan)).toEqual(EXPECTED[capture.label]);
    }
  );

  it('.69 looks each label up by one code', () => {
    const codes = new Map<string, Set<string | undefined>>();
    for (const capture of CAPTURES) {
      const seen = codes.get(capture.label) ?? new Set();
      seen.add(scanCode(readScan(capture.scan)));
      codes.set(capture.label, seen);
    }
    for (const [, seen] of codes) expect(seen.size).toBe(1);
    expect([...(codes.get('fullLabel') ?? [])]).toEqual(['60366582507989']);
    expect([...(codes.get('gtinOnly') ?? [])]).toEqual(['50382903018883']);
    // The batch-and-expiry halves carry no item number, so nothing to look
    // up (OMS-REG-BAC-01.67) …
    expect([...(codes.get('secondaryA') ?? [])]).toEqual([undefined]);
    expect([...(codes.get('secondaryB') ?? [])]).toEqual([undefined]);
    // … and the EAN-13 is looked up exactly as printed.
    expect([...(codes.get('ean13') ?? [])]).toEqual(['9300657270520']);
  });

  // What receiving may learn: a real item number, never a sticker's text.
  it('.69 finds an item number on the labels that carry one, and only those', () => {
    const numbers = new Map<string, Set<string | undefined>>();
    for (const capture of CAPTURES) {
      const seen = numbers.get(capture.label) ?? new Set();
      seen.add(itemNumber(readScan(capture.scan)));
      numbers.set(capture.label, seen);
    }
    expect(Object.fromEntries([...numbers].map(([k, v]) => [k, [...v]]))).toEqual({
      fullLabel: ['60366582507989'],
      gtinOnly: ['50382903018883'],
      ean13: ['9300657270520'], // a retail barcode (OMS-REG-BAC-01.65)
      secondaryA: [undefined],
      secondaryB: [undefined],
      stickerC: [undefined],
      stickerD: [undefined],
    });
  });
});

// The keyboard captures above are what the wedge handed up — so capture must
// actually hand them up: arriving at scanner speed, each one must be
// recognised as a single scan, not typing and not a corrupt read.
describe('the keyboard captures are recognised as scans', () => {
  const recognise = (keys: ScanKey[]): WedgeOutcome[] => {
    let state: WedgeState = emptyWedgeState();
    const outcomes: WedgeOutcome[] = [];
    keys.forEach((key, i) => {
      const step = feedKey(state, key, 1000 + i * 5);
      state = step.state;
      if (step.completed) outcomes.push(step.completed);
    });
    const end = flushWedge(state);
    if (end.completed) outcomes.push(end.completed);
    return outcomes;
  };

  it.each(
    CAPTURES.filter(c => c.scan.kind === 'keystrokes').map(c => [c.label, c.input, c] as const)
  )('%s from %s', (_label, _input, capture) => {
    const keys = (capture.scan as Extract<RawScan, { kind: 'keystrokes' }>).keys;
    expect(recognise(keys)).toEqual([{ kind: 'barcode', keys, leakedChars: 1 }]);
  });
});

// The one contract every scanning input satisfies (spec/barcode-scanning).
//
// spec/android/behaviours.md § Barcode scanning makes the seam a requirement,
// not a tidiness preference: "Scans from either input feed the same barcode
// handling; a vertical consuming barcodes cannot tell (and must not care)
// which input produced one." So a source hands up RAW CHARACTERS and nothing
// else — no GS1 parsing, no registry lookup, no notion of what a scan means.
// Reading the label is the next layer's job (spec/barcode-scanning/rules.md §
// Reading a scan).
//
// Six sources implement this, one per row of the settings spec's scanner
// list (spec/settings/ui-surface.md § Devices): manual, honeywell,
// desktop-hid, web-hid, keyboard-wedge, camera. A screen that just wants a
// scan goes through ../barcodeScanner.ts, which picks between them. A few
// callers reach a source directly, each for something the registry has no
// business owning: app start-up (index.tsx) starts the HID device watchers;
// the camera and manual sources' own UI (CameraScanOverlay.tsx,
// ManualScanInput.tsx, backButton.ts) reads their open/cancel state; the
// Devices screen drives pairing and the keystroke diagnostics; and
// domain/barcode imports the RawScan / ScanKey types and wedgeDetect's key
// classification.

/**
 * The inputs a scan can come from.
 *
 * Each is genuinely independent — different detection, different code path,
 * different failure modes — and several can be present at once, so each gets
 * its own entry rather than being folded into a mode of another. A device
 * can perfectly well have a paired HID scanner AND a keyboard-emulation one;
 * a single "USB scanner, in one of two modes" cannot express that.
 */
export type ScanSourceId =
  | 'honeywell'
  | 'desktop-hid'
  | 'web-hid'
  | 'keyboard-wedge'
  | 'camera'
  | 'manual';

/**
 * One reading of one label, in whatever form the transport actually
 * produced.
 *
 * Not a string. A HID scanner hands over BYTES and a keyboard-emulation
 * scanner hands over KEY POSITIONS; turning either into characters takes an
 * assumption — a report framing, a keyboard layout — that this layer has no
 * business making and, in both cases, got wrong when it tried. Only the
 * sources that genuinely decode text (a camera, a scanner SDK, a person
 * typing) report text.
 *
 * So each source says what it has, and every interpretation lives together
 * one layer up (the reading layer, src/domain/barcode/scanText.ts) where the
 * framing table and the layout table can sit side by side and be configured
 * and tested as what they are: guesses about a particular piece of hardware.
 */
export type RawScan =
  /**
   * Characters, from a source that really did decode characters.
   *
   * `aimId` is the AIM symbology identifier, where the decoder reports one
   * (the Honeywell SDK does): "]C1" is GS1-128 where "]C0" is plain Code 128,
   * "]d2" GS1 DataMatrix. It says whether the text is GS1-structured, which
   * the characters alone cannot — a reading-layer input, not part of the code.
   *
   * `format` is the decoder's own name for the symbology where it has no AIM
   * identifier to give (MLKit: "DATA_MATRIX", "CODE_128"…). Coarser — it
   * cannot tell GS1-128 from Code 128 — but diagnostic all the same.
   *
   * `decoder` names what did the decoding where one source has more than
   * one (the camera's two engines), so reads can be compared side by side.
   * Diagnostic only.
   */
  | {
      kind: 'text';
      text: string;
      aimId?: string;
      format?: string;
      decoder?: string;
    }
  /** An undecoded HID input report. */
  | { kind: 'bytes'; bytes: Uint8Array }
  /** Key positions as they arrived, unmapped. */
  | { kind: 'keystrokes'; keys: ScanKey[] };

/**
 * One keystroke as the browser reported it: the physical POSITION and the
 * modifiers, never the character. Which character a position means depends
 * on the keyboard layout the scanner is emitting against, which is a fact
 * about the hardware rather than about the scan.
 */
export type ScanKey = {
  /** `KeyboardEvent.code`. */
  code: string;
  shift: boolean;
  alt: boolean;
  ctrl: boolean;
};

/**
 * The result of asking for one scan.
 *
 * `cancelled` is a first-class outcome rather than an error string, because
 * the two are treated differently: "A scan the user cancelled is silent —
 * cancelling is not a failure" (spec/barcode-scanning/ui-surface.md § Notices
 * raised outside these surfaces). The reference app distinguishes them by
 * sniffing the message for 'canceled', which breaks on any plugin that words
 * it differently.
 */
export type ScanOutcome =
  | { ok: true; scan: RawScan }
  | { ok: false; cancelled: true }
  | { ok: false; cancelled: false; message: string };

/**
 * Whether arming succeeded. Never throws across the seam
 * (kdd/capacitor-plugins).
 */
export type ListenResult = { ok: boolean; message?: string };

/**
 * What an armed source reports back.
 *
 * `onError` exists because a reading can fail WITHOUT the arming having
 * failed — a wedge scan carrying a key that cannot be decoded, a Honeywell
 * read the SDK rejects. spec/barcode-scanning/ui-surface.md § Notices raised
 * outside these surfaces gives that its own notice ("The scanner could not
 * produce a reading"), so the layer has to be able to say it. Reporting a bad
 * read matters more than it sounds: a code silently shortened by one
 * character is a plausible, wrong key in a registry no screen can edit.
 */
/**
 * A reading that failed, WITH whatever arrived before it failed.
 *
 * The evidence is the point. A read is rejected rather than truncated
 * because a code short of a character is a plausible, wrong registry key —
 * but rejecting it and then discarding what came in leaves nothing to
 * diagnose, and the one thing worth knowing is which keystroke or byte the
 * decoder could not place. That is usually a separator spelled a way this
 * app does not recognise yet, which is a one-line fix once it can be seen.
 */
export type ScanFailure = {
  message: string;
  /** What arrived, including the part that could not be read. */
  raw?: RawScan;
};

export type ScanHandlers = {
  onScan: (scan: RawScan) => void;
  onError?: (failure: ScanFailure) => void;
};

export type ScanSource = {
  id: ScanSourceId;
  /**
   * Localised, for the Devices diagnostic screen. Never shown to a user who
   * is merely scanning.
   */
  displayName: () => string;
  /**
   * Can this input stay armed and report every scan, or must it be asked for
   * exactly one at a time? Decides which shape the scan affordance takes
   * (spec/barcode-scanning/rules.md § Triggering a scan).
   */
  continuous: boolean;
  /**
   * Does this input exist on this device at all? Drives HIDDEN vs shown — a
   * device with no scanner shows no scan affordance whatsoever.
   */
  available: () => Promise<boolean>;
  /**
   * Is it usable right now? Drives shown-but-DISABLED, with a reason: "Present
   * but unusable beats absent where a scanner is configured yet not connected"
   * (rules § Triggering a scan). Synchronous because it is read during render.
   */
  connected: () => boolean;
  /** Ask for exactly one scan. */
  scanOnce: () => Promise<ScanOutcome>;
  /** Arm, reporting to `handlers` until `release`. Continuous sources only. */
  listen: (handlers: ScanHandlers) => Promise<ListenResult>;
  /**
   * Arm ALONE, suppressing every other source.
   *
   * Only manual input sets this, and only because standing in for hardware
   * is the entire point of it: a typed prompt appearing every time a real
   * scanner is armed would be intolerable. Every other source is armed
   * alongside its peers, because none of them can tell whether it is the
   * one the user is actually holding.
   */
  exclusive?: boolean;
  /** Disarm and give the hardware back. Safe to call when not armed. */
  release: () => Promise<void>;
};

/**
 * The readable part of whatever a plugin, a browser API or the shell threw —
 * an Error's message, or the thrown value itself when it is not one.
 */
export const messageOf = (e: unknown): string =>
  e instanceof Error ? e.message : String(e);

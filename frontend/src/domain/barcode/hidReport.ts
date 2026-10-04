// HID report bytes -> characters.
//
// The WebHID source hands up the report undecoded (RawScan `bytes`),
// because which of its bytes are the label is an interpretation, not
// transport. This is that interpretation.
//
// A HID scanner wraps the label in framing whose shape varies by vendor and
// by mode, and guessing at it produces plausible, wrong codes — worse than
// obviously wrong ones. So exactly one framing is decoded, the one captured
// from real hardware (2026-09-23, six labels read in HID mode through the
// Test scanner screen, byte-identical to the same labels read in
// keyboard-emulation mode):
//
//   byte  0       data length (≤ 56)
//   byte  1       0x00
//   bytes 2–4     AIM symbology identifier — "]d2" GS1 DataMatrix,
//                 "]C1" GS1-128, "]d1" plain DataMatrix…
//   bytes 5–60    the label, zero-padded
//   byte  61      the scanner's own one-byte symbology code
//   byte  62      0x00
//
// The same framing also arrives with the HID REPORT ID in front — 64 bytes,
// the first being the ID (0x02 on the scanner captured). A scanner that
// numbers its reports has the ID kept by node-hid, which the desktop app
// reads through (src/platform/barcodeSources/desktopHid.ts), and stripped by
// WebHID, which reports it separately. Captured 2026-09-25 from the same
// labels through both: identical after the first byte. Only that exact
// shape is accepted — a nonzero first byte followed by a report that passes
// the check below — so it cannot be mistaken for the 63-byte form.
//
// A report is read this way only when it matches that shape exactly.
// Anything else is NOT a code: its characters are still decoded, for the
// Test scanner screen, but it is reported as unrecognised (`framed: false`)
// and the reading layer treats it as unreadable. Before the framing was
// known, keeping every printable byte was all there was, and it leaked the
// length byte and the symbology code into the code ("5]d2…3072w") — a
// plausible, wrong code that the registry would have learned for good.
//
// A label longer than 56 bytes presumably spans several reports, likely
// flagged in the last byte. None has been captured, so none is assumed:
// a report whose length exceeds 56 or whose last byte is set fails the
// shape check, and is unreadable rather than a truncated code.
//
// One rule holds whatever the framing: the GS1 field separator (0x1D) is
// DATA. It is what tells the reading layer where one field ends and the
// next begins, and dropping one silently merges two fields into a single
// plausible value.

/** The GS1 field separator — data, never framing. */
const GROUP_SEPARATOR = 0x1d;

const FRAMED_LENGTH = 63;
const DATA_START = 5;
const DATA_CAPACITY = 56;
const AIM_START = 2;

export type HidReading = {
  text: string;
  /** Where the report carried one. */
  aimId?: string;
  /** Whether the known framing was recognised, for diagnostics. */
  framed: boolean;
};

/**
 * Latin-1, not UTF-8: a HID scanner sends one byte per character, so a byte
 * above 0x7f is a character in its own right rather than the start of a
 * sequence.
 */
const latin1 = (bytes: number[]): string =>
  bytes.map(byte => String.fromCharCode(byte)).join('');

const isFramed = (bytes: number[]): boolean => {
  if (bytes.length !== FRAMED_LENGTH) return false;
  const length = bytes[0] ?? 0;
  if (length === 0 || length > DATA_CAPACITY || bytes[1] !== 0) return false;
  // Possibly a "more data follows" flag: a split label read as one report
  // would be a truncated code.
  if (bytes[FRAMED_LENGTH - 1] !== 0) return false;
  // An AIM identifier is "]" + a symbology letter + a modifier character.
  const aim = bytes.slice(AIM_START, DATA_START);
  if (aim[0] !== 0x5d || !aim.every(b => b >= 0x20 && b < 0x7f)) return false;
  // Nothing but padding between the label and the trailer — otherwise the
  // length byte is not what this framing says it is.
  const padding = bytes.slice(DATA_START + length, DATA_START + DATA_CAPACITY);
  return padding.every(b => b === 0);
};

/** The framing with a report ID in front of it (see above). */
const isFramedWithReportId = (bytes: number[]): boolean =>
  bytes.length === FRAMED_LENGTH + 1 &&
  (bytes[0] ?? 0) !== 0 &&
  isFramed(bytes.slice(1));

export const decodeHidReport = (bytes: number[]): HidReading => {
  if (isFramedWithReportId(bytes)) return decodeHidReport(bytes.slice(1));
  if (isFramed(bytes)) {
    const length = bytes[0] ?? 0;
    return {
      text: latin1(bytes.slice(DATA_START, DATA_START + length)),
      aimId: latin1(bytes.slice(AIM_START, DATA_START)),
      framed: true,
    };
  }
  return {
    text: latin1(bytes.filter(byte => byte === GROUP_SEPARATOR || byte >= 0x20)),
    framed: false,
  };
};

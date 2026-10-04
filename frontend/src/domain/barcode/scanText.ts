// Turning a reading into characters — the first step of reading a scan.
//
// The hardware layer hands up whatever the transport produced (RawScan):
// text from a source that decoded it, undecoded HID report bytes, or
// keyboard positions. Every assumption about a particular piece of hardware
// needed to get from those to characters lives here and nowhere lower: how a
// HID report is framed (./hidReport.ts), and which character a key position
// stands for (./keystrokes.ts). Both are guesses about a device, both have
// already been wrong once, and both are far easier to correct — or make
// configurable per site — sitting together than buried in a transport.

import type { RawScan } from '@/platform/barcodeSources/source';
import { decodeHidReport } from './hidReport';
import { keysToText } from './keystrokes';

export type ScanCharacters = {
  text: string;
  /**
   * The characters are NOT a code: a HID report in no recognised framing
   * (./hidReport.ts). Kept for diagnostics only.
   */
  unrecognised?: true;
  /**
   * The AIM symbology identifier, wherever the reading carried one — from a
   * decoder that reports it, or from a HID report's framing. Says whether a
   * label is GS1, which the characters alone cannot.
   */
  aimId?: string;
};

export const scanCharacters = (scan: RawScan): ScanCharacters => {
  switch (scan.kind) {
    case 'text':
      return scan.aimId ? { text: scan.text, aimId: scan.aimId } : { text: scan.text };
    case 'bytes': {
      const { text, aimId, framed } = decodeHidReport([...scan.bytes]);
      if (!framed) return { text, unrecognised: true };
      return aimId ? { text, aimId } : { text };
    }
    case 'keystrokes':
      return { text: keysToText(scan.keys) };
  }
};

export const scanText = (scan: RawScan): string => scanCharacters(scan).text;

// Manual input — a typed stand-in for a scanner, so the whole scanning cycle
// is exercisable with no hardware attached (spec/settings/rules.md § Devices —
// barcode scanner). It is a testing aid and MUST NOT be relied on for normal
// store operation; the toggle that enables it is remembered on this device
// and never sent to the server.
//
// It is a real source rather than a special case: it satisfies the same
// contract as the hardware ones, so every screen above the seam behaves
// identically whether a CK65 or a keyboard produced the scan. That is what
// makes the barcode-scanning spec's cases exercisable in CI and on a laptop —
// spec/barcode-scanning/README.md § Status records that the manual-input
// toggle overturns the moved case's `needs: [hardware]` flag.
//
// Prompt state lives here as module-level signals; ManualScanInput renders it.
// The overlay calls back into this module (a one-shot) or into
// ../barcodeScanner (while armed) by direct call — no subscriber registry,
// per the repo's explicit-composition anti-default.

import { createSignal } from 'solid-js';
import { t } from '../../intl';
import { getMockBarcodeScannerEnabled } from '../../appData';
import type {
  ListenResult,
  ScanHandlers,
  ScanOutcome,
  ScanSource,
} from './source';

/** Whether the prompt is being shown, and why — the overlay reads both. */
type ManualPromptMode = 'once' | 'listening';

const [promptMode, setPromptMode] = createSignal<ManualPromptMode | undefined>(
  undefined
);
export const manualPromptMode = promptMode;
export const manualPromptOpen = (): boolean => promptMode() !== undefined;

// Exactly one of these is set while the prompt is open: a one-shot has a
// promise waiting on it, an armed source has a handler to feed.
let pendingOnce: ((outcome: ScanOutcome) => void) | undefined;
let listenHandler: ScanHandlers['onScan'] | undefined;

/**
 * The user submitted a typed barcode. A one-shot resolves and closes; while
 * armed the prompt stays open so the next "scan" needs no extra click —
 * continuous listening is the behaviour being stood in for.
 */
export const submitManualScan = (raw: string): void => {
  if (pendingOnce) {
    const resolve = pendingOnce;
    pendingOnce = undefined;
    setPromptMode(undefined);
    resolve({ ok: true, scan: { kind: 'text', text: raw } });
    return;
  }
  listenHandler?.({ kind: 'text', text: raw });
};

/**
 * The user dismissed the prompt. A one-shot resolves as CANCELLED, not
 * failed — the caller stays silent (spec/barcode-scanning/ui-surface.md:
 * "A scan the user cancelled is silent").
 */
export const cancelManualScan = (): void => {
  const resolve = pendingOnce;
  pendingOnce = undefined;
  setPromptMode(undefined);
  resolve?.({ ok: false, cancelled: true });
};

export const manualSource: ScanSource = {
  id: 'manual',
  // The reference app renders this as an untranslated literal 'Mock Scanner'
  // (⚠️ i18n gap captured as-is by spec/settings/ui-surface.md § Devices).
  // Named through the catalogue here; the literal is not worth reproducing.
  displayName: () => t('label.barcode-scanner-manual'),
  continuous: true,
  // Enabled, this is a deliberate stand-in for hardware, so it takes the
  // scan to itself rather than raising its prompt alongside a real scanner.
  exclusive: true,

  // Read from the device, never the server. Deliberately re-read per call
  // rather than snapshotted, so toggling it in Settings takes effect without
  // a reload.
  available: async () => getMockBarcodeScannerEnabled(),
  connected: () => getMockBarcodeScannerEnabled(),

  scanOnce: () =>
    new Promise<ScanOutcome>(resolve => {
      // A one-shot supersedes an armed prompt rather than queueing behind it:
      // the wrapper only ever drives one source, and the user pressed a
      // button expecting this scan.
      listenHandler = undefined;
      pendingOnce = resolve;
      setPromptMode('once');
    }),

  listen: async ({ onScan }): Promise<ListenResult> => {
    listenHandler = onScan;
    setPromptMode('listening');
    return { ok: true };
  },

  release: async () => {
    // A pending one-shot must not be left unresolved — its caller is awaiting.
    const resolve = pendingOnce;
    pendingOnce = undefined;
    listenHandler = undefined;
    setPromptMode(undefined);
    resolve?.({ ok: false, cancelled: true });
  },
};

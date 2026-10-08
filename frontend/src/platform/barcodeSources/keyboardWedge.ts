// A scanner configured to emulate a keyboard — it types the barcode instead
// of sending data reports.
//
// Independent of ./webHid.ts: they share no code, and a device may have one,
// the other, or both. This one needs no pairing and no device permission,
// which is why most scanners ship this way — but it is lossy by
// construction (./wedgeDetect.ts explains what is lost and what is done
// about it), so the preference order in ../barcodeScanner.ts puts it after
// every input that reads a label's bytes directly.
//
// It cannot be DETECTED: a wedge scanner is indistinguishable from a
// keyboard, which is the whole point of the mode. So it is opted into on the
// Devices screen, and that toggle is its availability.

import { t } from '../../intl';
import { getKeyboardWedgeEnabled } from '../../appData';
import {
  listenToKeyboardWedge,
  releaseKeyboardWedge,
} from './wedgeCapture';
import type { ScanOutcome, ScanSource } from './source';

export const keyboardWedgeSource: ScanSource = {
  id: 'keyboard-wedge',
  displayName: () => t('label.barcode-scanner-keyboard-wedge'),
  continuous: true,

  // Re-read per call rather than snapshotted, so the Devices toggle takes
  // effect without a reload.
  available: async () => getKeyboardWedgeEnabled(),
  // Nothing to connect to: the scanner is a keyboard and the OS already has
  // it. Enabled is the whole of "connected" here.
  connected: () => getKeyboardWedgeEnabled(),

  scanOnce: () =>
    new Promise<ScanOutcome>(resolve => {
      void listenToKeyboardWedge({
        onScan: scan => {
          void releaseKeyboardWedge();
          resolve({ ok: true, scan });
        },
        onError: failure => {
          void releaseKeyboardWedge();
          resolve({ ok: false, cancelled: false, message: failure.message });
        },
      }).then(result => {
        if (!result.ok) {
          resolve({
            ok: false,
            cancelled: false,
            message: result.message ?? t('error.unable-to-read-barcode'),
          });
        }
      });
    }),

  listen: handlers => listenToKeyboardWedge(handlers),
  release: () => releaseKeyboardWedge(),
};

// The camera's 'google' engine: Google Code Scanner, the plugin's scan().
// Google's own full-screen UI from Play services, whose module downloads over
// the internet on first use. The default engine (./camera.ts has why).

import { t } from '../../intl';
import { messageOf, type ScanOutcome } from './source';
import {
  toRawScan,
  type BarcodeScannerPlugin,
  type ListenerHandle,
} from './cameraMlkit';

/** How long a first-use Google module download may take before giving up. */
const GOOGLE_INSTALL_TIMEOUT_MS = 60_000;
/** GoogleBarcodeScannerModuleInstallState values that end an install. */
const INSTALL_CANCELED = 3;
const INSTALL_COMPLETED = 4;
const INSTALL_FAILED = 5;
/** What the plugin rejects scan() with when the user backs out of it. */
const GOOGLE_SCAN_CANCELED = 'scan canceled.';

/**
 * Make sure Google's scanner module is on the device, downloading it if not.
 * Needs Play services and — the first time — the internet.
 */
const ensureGoogleModule = async (p: BarcodeScannerPlugin): Promise<void> => {
  const { available } = await p.isGoogleBarcodeScannerModuleAvailable();
  if (available) return;
  let handle: Promise<ListenerHandle> | undefined;
  try {
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error(t('error.camera-google-module-unavailable'))),
        GOOGLE_INSTALL_TIMEOUT_MS
      );
      handle = p.addListener(
        'googleBarcodeScannerModuleInstallProgress',
        ({ state }) => {
          if (state === INSTALL_COMPLETED) {
            clearTimeout(timer);
            resolve();
          } else if (state === INSTALL_FAILED || state === INSTALL_CANCELED) {
            clearTimeout(timer);
            reject(new Error(t('error.camera-google-module-unavailable')));
          }
        }
      );
      p.installGoogleBarcodeScannerModule().catch((e: unknown) => {
        clearTimeout(timer);
        reject(e);
      });
    });
  } finally {
    await handle?.then(h => h.remove()).catch(() => undefined);
  }
};

export const scanGoogle = async (
  p: BarcodeScannerPlugin
): Promise<ScanOutcome> => {
  try {
    await ensureGoogleModule(p);
    // Google's UI is its own, so there is no viewfinder to filter against —
    // and it takes the first code it sees. Letting the user pick among
    // several is a Google option (enableAllPotentialBarcodes) this plugin
    // version does not expose; only a native change could turn it on.
    const { barcodes } = await p.scan({ autoZoom: true });
    const first = barcodes.find(b => b.rawValue !== '');
    if (!first) return { ok: false, cancelled: true };
    return { ok: true, scan: toRawScan(first, 'google') };
  } catch (e) {
    // The plugin reports the user backing out as an error; it is not one.
    if (messageOf(e) === GOOGLE_SCAN_CANCELED) {
      return { ok: false, cancelled: true };
    }
    return { ok: false, cancelled: false, message: messageOf(e) };
  }
};

// The barcode-scanner inputs, as a list a screen can render.
//
// Both surfaces that show scanner state — the Devices settings section and
// the Test scanner screen — want the same answer: which inputs exist, which
// one is in use, and why the others are not. Deriving it once here keeps
// them from drifting, and keeps the derivation testable.
//
// Every input this kind of app can have is listed, including the ones this
// device cannot use: "Built-in scanner — not present on this device" tells a
// user more than omitting the row. The two USB rows are the exception — they
// are platform alternatives for ONE physical input (the browser reaches it
// in a browser, the desktop app natively in the desktop app), so only the
// one this platform uses is listed, and both are called "USB scanner"
// (spec/settings/ui-surface.md § Devices; OMS-REG-SET-05.57).
//
// Everything is worded for whoever is holding the scanner, not for the
// engineer who wrote the source: no symbology, no "reads the bytes".

import { t } from '../../../intl';
import {
  activeSource,
  allSourceIds,
  availableSources,
  scanOwner,
  type ScanSourceId,
} from '../../../platform/barcodeScanner';
import {
  desktopHidStatus,
  desktopHidSupported,
} from '../../../platform/barcodeSources/desktopHid';
import {
  cameraEngine,
  hidSupported,
  keyboardWedgeEnabled,
  mockScannerEnabled,
  pairedScanners,
} from './scanner';

/**
 * The four states a row can be in (OMS-REG-SET-05.57–.59):
 *  - `in-use` — a screen is listening for scans right now, and this is the
 *    input it is taking them from;
 *  - `available` — usable, but nothing is using it at this moment;
 *  - `not-connected` — this device cannot use it now; the detail says why
 *    (absent, unreachable, not paired, unplugged);
 *  - `off` — an input the user switches on here, switched off.
 */
export type ScannerSourceState =
  'in-use' | 'available' | 'not-connected' | 'off';

export type ScannerSourceRow = {
  id: ScanSourceId;
  name: string;
  state: ScannerSourceState;
  /** One short line: what it is for, or why it is not usable. */
  detail: string;
};

/**
 * The input's name in the user's words — the same words the Test scanner
 * screen uses to say which input read a scan (OMS-REG-SET-05.64).
 */
export const scannerInputName = (id: ScanSourceId): string => {
  switch (id) {
    case 'honeywell':
      return t('label.scanner-input-built-in');
    case 'web-hid':
    case 'desktop-hid':
      return t('label.scanner-input-usb');
    case 'keyboard-wedge':
      return t('label.scanner-input-keyboard');
    case 'camera':
      return t('label.scanner-input-camera');
    case 'manual':
      return t('label.barcode-scanner-manual');
    default:
      return id;
  }
};

export const scannerStateLabel = (state: ScannerSourceState): string =>
  state === 'in-use'
    ? t('label.scanner-state-active')
    : state === 'available'
      ? t('label.scanner-state-ready')
      : state === 'off'
        ? t('label.scanner-state-off')
        : t('label.scanner-state-not-connected');

/**
 * The status colour for a state. Never the only carrier of meaning — every
 * row shows the state as text beside it (ui-standards § colour independence).
 */
export const scannerStateColour = (state: ScannerSourceState): string =>
  state === 'in-use'
    ? 'var(--success-main)'
    : state === 'available'
      ? 'var(--info-main)'
      : 'var(--text-secondary)';

const detailFor = (id: ScanSourceId, state: ScannerSourceState): string => {
  switch (id) {
    case 'manual':
      return t('messages.scanner-detail-manual-off');
    case 'web-hid': {
      // Nothing can reach USB here / nothing paired yet / paired and ready —
      // the difference is the whole point of the row.
      if (!hidSupported()) {
        return t('messages.scanner-detail-web-hid-unsupported');
      }
      const paired = pairedScanners();
      if (paired.length > 0) return paired.join(', ');
      return state === 'not-connected'
        ? t('messages.scanner-detail-web-hid-unpaired')
        : t('messages.scanner-detail-usb-recommended');
    }
    case 'desktop-hid': {
      const { paired, connected } = desktopHidStatus();
      if (!paired) return t('messages.scanner-detail-desktop-hid-unpaired');
      return connected
        ? paired.name
        : t('messages.scanner-detail-desktop-hid-disconnected', {
            name: paired.name,
          });
    }
    case 'honeywell':
      return state === 'not-connected'
        ? t('messages.scanner-detail-not-on-device')
        : t('messages.scanner-detail-built-in');
    case 'camera':
      return state === 'not-connected'
        ? t('messages.scanner-detail-not-on-device')
        : t('messages.scanner-detail-camera-simple');
    case 'keyboard-wedge':
      // One line in both states: what tells the user whether to switch it
      // on at all (OMS-REG-SET-05.60).
      return t('messages.scanner-detail-keyboard');
    default:
      return t('messages.scanner-detail-not-on-device');
  }
};

/**
 * Which rows this platform lists: every input, except the USB row that
 * belongs to the other platform (see the header).
 */
const listedHere = (id: ScanSourceId): boolean =>
  id === 'desktop-hid'
    ? desktopHidSupported()
    : id === 'web-hid'
      ? !desktopHidSupported()
      : true;

/**
 * `in-use` needs evidence that something is armed right now: a screen holds
 * the scan, and this is the input credited with driving it. Without that
 * check an input read as in use — or, before this, "Listening" — on the
 * Settings page itself, where nothing is armed at all (OMS-REG-SET-05.58).
 * A one-scan-per-press camera is never armed, so it is never in use between
 * presses.
 */
export const scannerSourceRows = (): ScannerSourceRow[] => {
  const available = new Set(availableSources());
  const driving = scanOwner() !== undefined ? activeSource() : undefined;
  return allSourceIds()
    .filter(listedHere)
    .map(id => {
      const state: ScannerSourceState = !available.has(id)
        ? id === 'manual' || id === 'keyboard-wedge'
          ? 'off'
          : 'not-connected'
        : id === driving
          ? 'in-use'
          : 'available';
      return {
        id,
        name: scannerInputName(id),
        state,
        detail: detailFor(id, state),
      };
    });
};

/**
 * Which inputs carry their own on/off control. Both are assertions the user
 * makes about this device rather than anything detectable: manual input is a
 * testing stand-in, and a keyboard-emulation scanner is indistinguishable
 * from a keyboard. The camera's decoder choice is not here: it is a
 * developer comparison, rendered separately (CameraEngineSelect).
 */
export const scannerRowToggle = (
  id: ScanSourceId
): 'manual' | 'keyboard-wedge' | undefined =>
  id === 'manual' || id === 'keyboard-wedge' ? id : undefined;

/**
 * Whether this row offers pairing. Only the HID one does, and only where the
 * platform can reach USB at all — offering a chooser that cannot open is
 * worse than offering nothing.
 */
export const scannerRowPairs = (id: ScanSourceId): boolean =>
  id === 'web-hid' && hidSupported() && !desktopHidSupported();

/**
 * Whether this row offers the desktop app's pairing — by scan, or from a
 * list. Only in the desktop app, which is the only thing that can do it.
 */
export const scannerRowPairsNatively = (id: ScanSourceId): boolean =>
  id === 'desktop-hid' && desktopHidSupported();

// Re-exported so a screen rendering the list does not also have to import
// each toggle's state from somewhere else.
export {
  cameraEngine,
  keyboardWedgeEnabled,
  mockScannerEnabled,
  pairedScanners,
};

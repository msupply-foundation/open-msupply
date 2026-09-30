// The barcode-scanner inputs, as a list a screen can render.
//
// Both surfaces that show scanner state — the Devices settings section and
// the Test scanner screen — want the same answer: which inputs exist, which
// one is driving, and why the others are not. Deriving it once here keeps
// them from drifting, and keeps the derivation testable.
//
// Every input is listed, including the ones this device cannot use.
// "Honeywell — not present on this device" tells a user more than omitting
// the row, and it makes the shape of the hardware layer legible on the one
// screen allowed to see it.

import { t } from '../../../intl';
import {
  activeSource,
  allSourceIds,
  availableSources,
  scanOwner,
  sourceDisplayName,
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
 * `disabled` is an input the user switches on here (manual input, a
 * keyboard-emulation scanner) that is switched off, and `not-set-up` a USB scanner
 * this platform can reach but nobody has paired yet: in both nothing is
 * missing, the user has just not done something, so "Not available" would
 * misstate why. `unavailable` is kept for what this device genuinely lacks.
 */
export type ScannerSourceState =
  | 'active'
  | 'available'
  | 'unavailable'
  | 'disabled'
  | 'not-set-up';

export type ScannerSourceRow = {
  id: ScanSourceId;
  name: string;
  state: ScannerSourceState;
  /** One short line: what it is, or why it is not usable. */
  detail: string;
};

/*
 * "In use" rather than "Active", and "Listening" rather than "Available":
 * every available source is armed at once (barcodeScanner.ts §
 * startListening), because none of them can tell whether it is the one the
 * user is holding. Only the source that has actually produced a scan is
 * known to be live, and calling the others "Active" claimed something the
 * app does not know — which is precisely how a dead WebHID grant read as
 * the working scanner.
 */
export const scannerStateLabel = (state: ScannerSourceState): string =>
  state === 'active'
    ? t('label.scanner-state-active')
    : state === 'available'
      ? t('label.scanner-state-ready')
      : state === 'disabled'
        ? t('label.scanner-state-disabled')
        : state === 'not-set-up'
          ? t('label.scanner-state-not-set-up')
          : t('label.scanner-state-unavailable');

/**
 * The status colour for a state. Never the only carrier of meaning — every
 * row shows the state as text beside it (ui-standards § colour independence).
 */
export const scannerStateColour = (state: ScannerSourceState): string =>
  state === 'active'
    ? 'var(--success-main)'
    : state === 'available'
      ? 'var(--info-main)'
      : 'var(--text-secondary)';

const detailFor = (id: ScanSourceId, state: ScannerSourceState): string => {
  switch (id) {
    case 'manual':
      return t('messages.scanner-detail-manual-off');
    case 'web-hid': {
      // Three different unavailables, and the difference is the whole point
      // of the row: nothing can reach USB here / nothing paired yet / paired
      // and ready. Collapsing them into "not available" is what made the old
      // section useless.
      // In the desktop app WebHID stands down for the native reader, which
      // is a different reason from a browser that cannot reach USB at all.
      if (desktopHidSupported()) {
        return t('messages.scanner-detail-web-hid-desktop');
      }
      if (!hidSupported()) {
        return t('messages.scanner-detail-web-hid-unsupported');
      }
      const paired = pairedScanners();
      if (paired.length > 0) return paired.join(', ');
      return state === 'not-set-up'
        ? t('messages.scanner-detail-web-hid-unpaired')
        : t('messages.scanner-detail-web-hid');
    }
    case 'desktop-hid': {
      if (!desktopHidSupported()) {
        return t('messages.scanner-detail-desktop-hid-unsupported');
      }
      const { paired, connected } = desktopHidStatus();
      if (!paired) return t('messages.scanner-detail-desktop-hid-unpaired');
      return connected
        ? paired.name
        : t('messages.scanner-detail-desktop-hid-disconnected', {
            name: paired.name,
          });
    }
    case 'honeywell':
      return state === 'unavailable'
        ? t('messages.scanner-detail-not-on-device')
        : t('messages.scanner-detail-honeywell');
    case 'camera':
      return state === 'unavailable'
        ? t('messages.scanner-detail-not-on-device')
        : cameraEngine() === 'google'
          ? t('messages.scanner-detail-camera-google')
          : t('messages.scanner-detail-camera');
    case 'keyboard-wedge':
      return state === 'disabled'
        ? t('messages.scanner-detail-wedge-off')
        : t('messages.scanner-detail-wedge-on');
    default:
      return t('messages.scanner-detail-not-on-device');
  }
};

/**
 * Why an input that is not available is not: switched off, reachable but
 * not yet paired, or genuinely absent on this device.
 */
const notAvailableState = (id: ScanSourceId): ScannerSourceState => {
  if (id === 'manual' || id === 'keyboard-wedge') return 'disabled';
  if (
    id === 'web-hid' &&
    !desktopHidSupported() &&
    hidSupported() &&
    pairedScanners().length === 0
  )
    return 'not-set-up';
  if (
    id === 'desktop-hid' &&
    desktopHidSupported() &&
    !desktopHidStatus().paired
  )
    return 'not-set-up';
  return 'unavailable';
};

/**
 * `active` needs evidence that something is armed right now: a screen holds
 * the scan, and this is the input credited with driving it. Without that
 * check an input read as active on the Settings page itself, where nothing
 * is armed at all (OMS-REG-SET-05.58). A one-scan-per-press camera is never
 * armed, so it is never active between presses.
 */
export const scannerSourceRows = (): ScannerSourceRow[] => {
  const available = new Set(availableSources());
  const driving = scanOwner() !== undefined ? activeSource() : undefined;
  return allSourceIds().map(id => {
    const state: ScannerSourceState = !available.has(id)
      ? notAvailableState(id)
      : id === driving
        ? 'active'
        : 'available';
    return { id, name: sourceDisplayName(id), state, detail: detailFor(id, state) };
  });
};

/**
 * Which inputs carry their own on/off control. Both are assertions the user
 * makes about this device rather than anything detectable: manual input is a
 * testing stand-in, and a keyboard-emulation scanner is indistinguishable
 * from a keyboard.
 */
export const scannerRowToggle = (
  id: ScanSourceId
): 'manual' | 'keyboard-wedge' | 'camera-engine' | undefined =>
  id === 'manual' || id === 'keyboard-wedge'
    ? id
    : // Not on/off — which of two decoders the camera uses.
      id === 'camera'
      ? 'camera-engine'
      : undefined;

/**
 * Whether this row offers pairing. Only the HID one does, and only where the
 * platform can reach USB at all — offering a chooser that cannot open is
 * worse than offering nothing. Not in the desktop app, where browser USB
 * stands down for the app's own.
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

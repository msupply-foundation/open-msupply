import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '../../../intl';
import {
  refreshScanSources,
  startListening,
  stopListening,
} from '../../../platform/barcodeScanner';
import { resetDesktopHidForTest } from '../../../platform/barcodeSources/desktopHid';
import { setMockBarcodeScannerEnabled } from '../../../appData';
import {
  scannerInputName,
  scannerRowPairs,
  scannerRowPairsNatively,
  scannerSourceRows,
  scannerStateLabel,
} from './scannerSourceModel';

// spec/settings/ui-surface.md § Devices; cases OMS-REG-SET-05.57, .58, .64,
// .68, .69.
const scanner = { vendorId: 1, productId: 2, name: 'Zebra DS2208' };

const inDesktopApp = (status: {
  paired: typeof scanner | null;
  connected: boolean;
}) => {
  vi.stubGlobal('window', {
    desktopHidScanner: {
      version: 1,
      status: async () => status,
      stop: async () => undefined,
      onReport: () => undefined,
      onChange: () => undefined,
    },
  });
  vi.stubGlobal('navigator', { hid: { getDevices: async () => [] } });
};

// appData is localStorage-backed and absent under node: stub the global, not
// the module (kdd/capacitor-plugins fork 4).
const stubLocalStorage = () => {
  const store = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
  });
};

const row = (id: string) => scannerSourceRows().find(r => r.id === id);
const ids = () => scannerSourceRows().map(r => r.id);

afterEach(async () => {
  await stopListening();
  try {
    setMockBarcodeScannerEnabled(false);
  } catch {
    /* no localStorage stubbed in this test */
  }
  vi.unstubAllGlobals();
  resetDesktopHidForTest();
  await refreshScanSources();
});

describe('one USB scanner row per platform (SET-05.57)', () => {
  it('in a browser lists the browser USB row only, named "USB scanner"', async () => {
    vi.stubGlobal('window', {});
    await refreshScanSources();
    expect(ids()).toContain('web-hid');
    expect(ids()).not.toContain('desktop-hid');
    expect(row('web-hid')?.name).toBe(t('label.scanner-input-usb'));
  });

  it('in the desktop app lists its own USB row only, with the same name', async () => {
    inDesktopApp({ paired: scanner, connected: true });
    await refreshScanSources();
    expect(ids()).toContain('desktop-hid');
    expect(ids()).not.toContain('web-hid');
    expect(row('desktop-hid')?.name).toBe(t('label.scanner-input-usb'));
    expect(scannerRowPairs('web-hid')).toBe(false);
  });

  it('still lists inputs this device lacks', async () => {
    vi.stubGlobal('window', {});
    await refreshScanSources();
    expect(ids()).toEqual(
      expect.arrayContaining([
        'manual',
        'honeywell',
        'keyboard-wedge',
        'camera',
      ])
    );
  });
});

describe('input names in the user’s words (SET-05.57, .64)', () => {
  it('names every input plainly', () => {
    expect(scannerInputName('honeywell')).toBe(
      t('label.scanner-input-built-in')
    );
    expect(scannerInputName('web-hid')).toBe(t('label.scanner-input-usb'));
    expect(scannerInputName('desktop-hid')).toBe(t('label.scanner-input-usb'));
    expect(scannerInputName('keyboard-wedge')).toBe(
      t('label.scanner-input-keyboard')
    );
    expect(scannerInputName('camera')).toBe(t('label.scanner-input-camera'));
    expect(scannerInputName('manual')).toBe(t('label.barcode-scanner-manual'));
  });
});

describe('In use needs something armed (SET-05.58)', () => {
  it('reads Available — not In use — while no screen is listening', async () => {
    stubLocalStorage();
    setMockBarcodeScannerEnabled(true);
    vi.stubGlobal('window', {});
    await refreshScanSources();
    expect(row('manual')?.state).toBe('available');
    expect(scannerSourceRows().some(r => r.state === 'in-use')).toBe(false);
    expect(scannerStateLabel('available')).toBe(t('label.scanner-state-ready'));
  });

  it('reads In use while a screen is listening on it, and not after it stops', async () => {
    stubLocalStorage();
    setMockBarcodeScannerEnabled(true);
    vi.stubGlobal('window', {});
    await refreshScanSources();
    const handle = await startListening(() => undefined, { label: 'test' });
    expect(handle.ok).toBe(true);
    expect(row('manual')?.state).toBe('in-use');
    expect(scannerStateLabel('in-use')).toBe(t('label.scanner-state-active'));
    if (handle.ok) handle.dispose();
    await stopListening();
    expect(row('manual')?.state).toBe('available');
  });
});

describe('Not connected and Off (SET-05.68, .69)', () => {
  it('switched-off inputs read Off, with the keyboard row saying when to turn it on', async () => {
    vi.stubGlobal('window', {});
    await refreshScanSources();
    expect(row('manual')?.state).toBe('off');
    expect(row('keyboard-wedge')).toMatchObject({
      state: 'off',
      detail: t('messages.scanner-detail-keyboard'),
    });
    expect(scannerStateLabel('off')).toBe(t('label.scanner-state-off'));
  });

  it('absent inputs read Not connected, saying they are not on this device', async () => {
    vi.stubGlobal('window', {});
    await refreshScanSources();
    expect(row('honeywell')).toMatchObject({
      state: 'not-connected',
      detail: t('messages.scanner-detail-not-on-device'),
    });
    expect(scannerStateLabel('not-connected')).toBe(
      t('label.scanner-state-not-connected')
    );
  });

  it('a browser USB row with nothing paired reads Not connected, saying so', async () => {
    vi.stubGlobal('window', {});
    vi.stubGlobal('navigator', { hid: { getDevices: async () => [] } });
    await refreshScanSources();
    expect(row('web-hid')).toMatchObject({
      state: 'not-connected',
      detail: t('messages.scanner-detail-web-hid-unpaired'),
    });
    expect(scannerRowPairs('web-hid')).toBe(true);
  });

  it('a browser that cannot reach USB says so, and offers no pairing', async () => {
    vi.stubGlobal('window', {});
    vi.stubGlobal('navigator', {});
    await refreshScanSources();
    expect(row('web-hid')).toMatchObject({
      state: 'not-connected',
      detail: t('messages.scanner-detail-web-hid-unsupported'),
    });
    expect(scannerRowPairs('web-hid')).toBe(false);
  });
});

// The desktop app's USB scanner row (rules § Devices — barcode scanner).
describe('the desktop app USB scanner row', () => {
  it('unpaired: not connected, with both ways to pair offered', async () => {
    inDesktopApp({ paired: null, connected: false });
    await refreshScanSources();
    expect(row('desktop-hid')).toMatchObject({
      state: 'not-connected',
      detail: t('messages.scanner-detail-desktop-hid-unpaired'),
    });
    expect(scannerRowPairsNatively('desktop-hid')).toBe(true);
  });

  it('paired and plugged in, nothing listening: available, naming the scanner', async () => {
    inDesktopApp({ paired: scanner, connected: true });
    await refreshScanSources();
    expect(row('desktop-hid')).toMatchObject({
      state: 'available',
      detail: 'Zebra DS2208',
    });
  });

  it('paired but unplugged: still listed, with why', async () => {
    inDesktopApp({ paired: scanner, connected: false });
    await refreshScanSources();
    expect(row('desktop-hid')?.detail).toBe(
      t('messages.scanner-detail-desktop-hid-disconnected', {
        name: 'Zebra DS2208',
      })
    );
  });

  it('outside the desktop app offers no native pairing', async () => {
    vi.stubGlobal('window', {});
    await refreshScanSources();
    expect(scannerRowPairsNatively('desktop-hid')).toBe(false);
  });
});

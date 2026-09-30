import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '../../../intl';
import { refreshScanSources } from '../../../platform/barcodeScanner';
import { resetDesktopHidForTest } from '../../../platform/barcodeSources/desktopHid';
import {
  scannerRowPairs,
  scannerRowPairsNatively,
  scannerSourceRows,
  scannerStateLabel,
} from './scannerSourceModel';

// The desktop app's USB scanner row (spec/settings/ui-surface.md § Devices;
// rules § Devices — barcode scanner, AC-BS4).
const scanner = { vendorId: 1, productId: 2, name: 'Zebra DS2208' };

const inDesktopApp = (status: { paired: typeof scanner | null; connected: boolean }) => {
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

const row = (id: string) => scannerSourceRows().find(r => r.id === id);

afterEach(async () => {
  vi.unstubAllGlobals();
  resetDesktopHidForTest();
  await refreshScanSources();
});

describe('the desktop app USB scanner row', () => {
  it('outside the desktop app, says so and offers no pairing', async () => {
    vi.stubGlobal('window', {});
    await refreshScanSources();
    expect(row('desktop-hid')).toMatchObject({
      state: 'unavailable',
      detail: t('messages.scanner-detail-desktop-hid-unsupported'),
    });
    expect(scannerRowPairsNatively('desktop-hid')).toBe(false);
  });

  it('unpaired: not set up, with both ways to pair offered', async () => {
    inDesktopApp({ paired: null, connected: false });
    await refreshScanSources();
    expect(row('desktop-hid')).toMatchObject({
      state: 'not-set-up',
      detail: t('messages.scanner-detail-desktop-hid-unpaired'),
    });
    expect(scannerRowPairsNatively('desktop-hid')).toBe(true);
  });

  it('paired and plugged in: names the scanner', async () => {
    inDesktopApp({ paired: scanner, connected: true });
    await refreshScanSources();
    expect(row('desktop-hid')).toMatchObject({
      state: 'active',
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

  it('stands the browser USB row down, saying why', async () => {
    inDesktopApp({ paired: scanner, connected: true });
    await refreshScanSources();
    expect(row('web-hid')).toMatchObject({
      state: 'unavailable',
      detail: t('messages.scanner-detail-web-hid-desktop'),
    });
    expect(scannerRowPairs('web-hid')).toBe(false);
  });
});

describe('the switched-on-here rows', () => {
  // Switched off is a choice, not something missing (SET-05 .45).
  it('read Disabled, not Not available, while switched off', async () => {
    vi.stubGlobal('window', {});
    await refreshScanSources();
    expect(row('manual')?.state).toBe('disabled');
    expect(row('keyboard-wedge')).toMatchObject({
      state: 'disabled',
      detail: t('messages.scanner-detail-wedge-off'),
    });
    expect(scannerStateLabel('disabled')).toBe(t('label.scanner-state-disabled'));
  });
});

describe('the browser USB scanner row', () => {
  // Reachable but unpaired is a step not yet taken, not something missing.
  it('reads Not set up where the browser can reach USB but nothing is paired', async () => {
    vi.stubGlobal('window', {});
    vi.stubGlobal('navigator', { hid: { getDevices: async () => [] } });
    await refreshScanSources();
    expect(row('web-hid')).toMatchObject({
      state: 'not-set-up',
      detail: t('messages.scanner-detail-web-hid-unpaired'),
    });
    expect(scannerStateLabel('not-set-up')).toBe(t('label.scanner-state-not-set-up'));
  });

  it('reads Not available where the browser cannot reach USB at all', async () => {
    vi.stubGlobal('window', {});
    vi.stubGlobal('navigator', {});
    await refreshScanSources();
    expect(row('web-hid')).toMatchObject({
      state: 'unavailable',
      detail: t('messages.scanner-detail-web-hid-unsupported'),
    });
  });
});

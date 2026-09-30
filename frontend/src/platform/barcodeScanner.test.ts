import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  activeSource,
  refreshScanSources,
  cancelScanOnce,
  scanOnce,
  scanOwner,
  scannerAvailable,
  scannerConnected,
  setSourcesForTest,
  startListening,
  stopListening,
  supportsContinuousScanning,
} from './barcodeScanner';
import {
  cancelManualScan,
  manualPromptMode,
  manualSource,
  submitManualScan,
} from './barcodeSources/manual';
import type { RawScan, ScanSource } from './barcodeSources/source';
import { setMockBarcodeScannerEnabled } from '../appData';

// Case anchors are OMS-REG-BAC-01 (spec/barcode-scanning/cases).

// Every source in these tests reports text; reading any other kind is the
// reading layer's job (src/domain/barcode), not this module's.
const scanText = (scan: RawScan): string =>
  scan.kind === 'text' ? scan.text : `<${scan.kind}>`;

// The mock-scanner toggle lives in appData, which is localStorage-backed and
// absent under node. Stubbing the GLOBAL rather than mocking the module keeps
// the real appData code in the test (kdd/capacitor-plugins fork 4: stub
// globals, never vi.mock our own modules).
const stubLocalStorage = () => {
  const store = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
  });
};

beforeEach(async () => {
  stubLocalStorage();
  setMockBarcodeScannerEnabled(true);
  await refreshScanSources();
});

afterEach(async () => {
  await stopListening();
  setSourcesForTest();
  setMockBarcodeScannerEnabled(false);
  await refreshScanSources();
  vi.unstubAllGlobals();
});

// spec/barcode-scanning/rules.md § Triggering a scan: affordances appear only
// where the device has a scanner at all, and manual input counts as one
// (spec/settings/rules.md § Devices — barcode scanner).
describe('source resolution', () => {
  it('reports a scanner once manual input is enabled', () => {
    expect(scannerAvailable()).toBe(true);
    expect(scannerConnected()).toBe(true);
    expect(activeSource()).toBe('manual');
  });

  it('.55 reports none when nothing is available — the affordance is hidden, not disabled', async () => {
    setMockBarcodeScannerEnabled(false);
    await refreshScanSources();
    expect(scannerAvailable()).toBe(false);
    expect(activeSource()).toBeUndefined();
  });

  it('reports manual input as able to stay armed', () => {
    expect(supportsContinuousScanning()).toBe(true);
  });
});

// rules § Triggering a scan: "One screen owns the scan at a time. Registering
// to receive scans replaces whoever was registered before; a scan arriving
// with nobody registered is dropped silently." / "Leaving a screen stops its
// scanning."
describe('scan routing: one owner at a time', () => {
  it('delivers scans to the registered owner', async () => {
    const seen: string[] = [];
    const handle = await startListening(scan => seen.push(scanText(scan)), { label: 'receiving' });
    expect(handle.ok).toBe(true);
    expect(scanOwner()).toBe('receiving');

    submitManualScan('0123');
    submitManualScan('4567');
    expect(seen).toEqual(['0123', '4567']);
  });

  it('a second registration silently displaces the first', async () => {
    const first: string[] = [];
    const second: string[] = [];
    await startListening(scan => first.push(scanText(scan)), { label: 'receiving' });
    await startListening(scan => second.push(scanText(scan)), { label: 'issuing' });

    submitManualScan('0123');
    expect(first).toEqual([]);
    expect(second).toEqual(['0123']);
    expect(scanOwner()).toBe('issuing');
  });

  // What lets an armed control stop reading as armed once it has lost the
  // scan, without the screen that displaced it having to tell it.
  it("a handle's owns() follows who holds the scan", async () => {
    const first = await startListening(() => {}, { label: 'receiving' });
    expect(first.ok && first.owns()).toBe(true);

    const second = await startListening(() => {}, { label: 'issuing' });
    expect(first.ok && first.owns()).toBe(false);
    expect(second.ok && second.owns()).toBe(true);

    if (second.ok) second.dispose();
    expect(second.ok && second.owns()).toBe(false);
  });

  it('.59 drops a scan silently when nobody is registered', async () => {
    const seen: string[] = [];
    const handle = await startListening(scan => seen.push(scanText(scan)));
    if (handle.ok) handle.dispose();

    expect(() => submitManualScan('0123')).not.toThrow();
    expect(seen).toEqual([]);
    expect(scanOwner()).toBeUndefined();
  });

  // The failure a naive stopListening()-in-cleanup would cause: Solid runs the
  // incoming screen's setup before the outgoing screen's cleanup, so a stale
  // disposer must not disarm the screen that replaced it.
  it('a stale disposer does not release the owner that replaced it', async () => {
    const stale = await startListening(() => {}, { label: 'receiving' });
    const live: string[] = [];
    await startListening(scan => live.push(scanText(scan)), { label: 'issuing' });

    if (stale.ok) stale.dispose();

    expect(scanOwner()).toBe('issuing');
    submitManualScan('0123');
    expect(live).toEqual(['0123']);
  });

  // The trap a reconfigured scanner set: a WebHID grant survives the device
  // being switched into a mode the browser will not open, so the source kept
  // reporting itself available, kept failing to arm, and — because only the
  // preferred source was ever asked — a perfectly good scanner behind it in
  // the order could never take over. The layer looked stuck and unchangeable.
  it('falls through to the next source when the preferred one cannot arm', async () => {
    const seen: string[] = [];
    const broken: ScanSource = {
      id: 'web-hid',
      displayName: () => 'broken',
      continuous: true,
      available: async () => true,
      connected: () => true,
      scanOnce: async () => ({ ok: false, cancelled: false, message: 'no' }),
      listen: async () => ({ ok: false, message: 'Failed to open the device.' }),
      release: async () => {},
    };
    setSourcesForTest([broken, manualSource]);
    await refreshScanSources();

    const handle = await startListening(scan => seen.push(scanText(scan)));
    expect(handle.ok).toBe(true);
    // ...and the screen names whichever one actually answered.
    expect(activeSource()).toBe('manual');

    submitManualScan('0123');
    expect(seen).toEqual(['0123']);
  });

  /*
   * The trap a reconfigured scanner sets, and the reason arming only the
   * preferred source is not enough. A WebHID grant survives the device being
   * switched to keyboard emulation: it still opens, arming still SUCCEEDS,
   * and no report ever comes — while the wedge that would have read it sits
   * behind it in the order. Nothing fails, so nothing falls through, and the
   * live source is shadowed indefinitely.
   */
  it('a source that arms but never reports cannot shadow a live one', async () => {
    const seen: string[] = [];
    let silentReleased = false;
    let emit: ((text: string) => void) | undefined;

    const silent: ScanSource = {
      id: 'web-hid',
      displayName: () => 'silent',
      continuous: true,
      available: async () => true,
      connected: () => true,
      scanOnce: async () => ({ ok: false, cancelled: false, message: 'no' }),
      // Arms perfectly happily, then says nothing, ever.
      listen: async () => ({ ok: true }),
      release: async () => {
        silentReleased = true;
      },
    };
    const live: ScanSource = {
      id: 'keyboard-wedge',
      displayName: () => 'live',
      continuous: true,
      available: async () => true,
      connected: () => true,
      scanOnce: async () => ({ ok: false, cancelled: false, message: 'no' }),
      listen: async handlers => {
        emit = text => handlers.onScan({ kind: 'text', text });
        return { ok: true };
      },
      release: async () => {
        emit = undefined;
      },
    };

    setSourcesForTest([silent, live]);
    await refreshScanSources();

    const handle = await startListening(scan => seen.push(scanText(scan)));
    expect(handle.ok).toBe(true);
    // The silent one is first in order, so it is credited until evidence.
    expect(activeSource()).toBe('web-hid');

    // The live source was armed too, so a scan still lands...
    emit?.('0123');
    expect(seen).toEqual(['0123']);
    // ...and whatever actually scanned is what the screen credits.
    expect(activeSource()).toBe('keyboard-wedge');

    // Everything armed is released, not only the credited one.
    await stopListening();
    expect(silentReleased).toBe(true);
  });

  // Manual input is the one source that suppresses the others: a typed
  // prompt appearing every time a real scanner is armed would be
  // intolerable, and standing in for hardware is its whole purpose.
  it('manual input arms alone', async () => {
    let hardwareArmed = false;
    const hardware: ScanSource = {
      id: 'web-hid',
      displayName: () => 'hardware',
      continuous: true,
      available: async () => true,
      connected: () => true,
      scanOnce: async () => ({ ok: false, cancelled: false, message: 'no' }),
      listen: async () => {
        hardwareArmed = true;
        return { ok: true };
      },
      release: async () => {},
    };
    setSourcesForTest([manualSource, hardware]);
    await refreshScanSources();

    const handle = await startListening(() => {});
    expect(handle.ok).toBe(true);
    expect(hardwareArmed).toBe(false);
  });

  it('reports every failure when no source can arm', async () => {
    const broken: ScanSource = {
      id: 'web-hid',
      displayName: () => 'broken',
      continuous: true,
      available: async () => true,
      connected: () => true,
      scanOnce: async () => ({ ok: false, cancelled: false, message: 'no' }),
      listen: async () => ({ ok: false, message: 'Failed to open the device.' }),
      release: async () => {},
    };
    setSourcesForTest([broken]);
    await refreshScanSources();
    const handle = await startListening(() => {});
    expect(handle.ok).toBe(false);
    if (!handle.ok) expect(handle.message).toContain('Failed to open the device.');
  });

  // spec/barcode-scanning/rules.md § Triggering a scan: where the scanner
  // cannot stay armed, each press asks for exactly one scan. A camera left to
  // arm would open itself every time a screen started listening.
  it('never arms a one-scan-per-press source, but still scans once with it', async () => {
    let cameraArmed = false;
    const camera: ScanSource = {
      id: 'camera',
      displayName: () => 'camera',
      continuous: false,
      available: async () => true,
      connected: () => true,
      scanOnce: async () => ({
        ok: true,
        scan: { kind: 'text', text: 'CAM' },
      }),
      listen: async () => {
        cameraArmed = true;
        return { ok: true };
      },
      release: async () => {},
    };
    setSourcesForTest([camera]);
    await refreshScanSources();

    const handle = await startListening(() => {});
    expect(handle.ok).toBe(false);
    expect(cameraArmed).toBe(false);
    expect(scanOwner()).toBeUndefined();
    expect(supportsContinuousScanning()).toBe(false);

    const outcome = await scanOnce();
    expect(outcome.ok && scanText(outcome.scan)).toBe('CAM');
  });

  it('refuses to arm when no scanner is available', async () => {
    setMockBarcodeScannerEnabled(false);
    await refreshScanSources();
    const handle = await startListening(() => {});
    expect(handle.ok).toBe(false);
  });
});

// ui-surface § Notices raised outside these surfaces: "A scan the user
// cancelled is silent — cancelling is not a failure."
describe('one-shot scans distinguish cancelled from failed', () => {
  it('resolves with the content that was entered', async () => {
    const pending = scanOnce();
    expect(manualPromptMode()).toBe('once');
    submitManualScan('0123');
    expect(await pending).toEqual({
      ok: true,
      scan: { kind: 'text', text: '0123' },
    });
  });

  it('reports a dismissal as cancelled, not as an error', async () => {
    const pending = scanOnce();
    cancelManualScan();
    expect(await pending).toEqual({ ok: false, cancelled: true });
  });

  it('reports no scanner as a failure rather than a cancellation', async () => {
    setMockBarcodeScannerEnabled(false);
    await refreshScanSources();
    const result = await scanOnce();
    expect(result).toMatchObject({ ok: false, cancelled: false });
  });

  // A source that never settles its own one-shot (a streaming HID source
  // with no read coming) must not hold its caller forever.
  it('cancelScanOnce settles a one-shot the source never would, as cancelled', async () => {
    let released = false;
    const stuck: ScanSource = {
      id: 'web-hid',
      displayName: () => 'stuck',
      continuous: false,
      available: async () => true,
      connected: () => true,
      scanOnce: () => new Promise(() => {}),
      listen: async () => ({ ok: false }),
      release: async () => {
        released = true;
      },
    };
    setSourcesForTest([stuck]);
    await refreshScanSources();
    const pending = scanOnce();
    cancelScanOnce();
    expect(await pending).toEqual({ ok: false, cancelled: true });
    expect(released).toBe(true);
    setSourcesForTest();
    await refreshScanSources();
  });

  // release() must settle a waiting caller: an unresolved promise here would
  // hang whichever screen asked for the scan.
  it('resolves a pending scan as cancelled when the scanner is released', async () => {
    const pending = scanOnce();
    await stopListening();
    expect(await pending).toEqual({ ok: false, cancelled: true });
  });
});

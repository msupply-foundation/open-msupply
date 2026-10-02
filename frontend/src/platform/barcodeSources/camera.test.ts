import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  cameraDetections,
  cameraOverlayOpen,
  cameraSource,
  cameraTorchAvailable,
  cancelCameraScan,
  inViewfinder,
  resetCameraForTest,
  setViewfinderRect,
  toRawScan,
  type MlkitBarcode,
} from './camera';
import { getCameraEngine, setCameraEngine } from '../../appData';

// A window carrying a Capacitor bridge reporting the android platform — what
// isAndroid() keys off (mirrors readServerLog's device tests).
const androidWindow = () => ({
  Capacitor: { getPlatform: () => 'android', isNativePlatform: () => true },
  devicePixelRatio: 2,
});

// The engine choice lives in appData, which is localStorage-backed and absent
// under node. Stubbing the GLOBAL keeps the real appData code in the test
// (kdd/capacitor-plugins fork 4), as barcodeScanner.test.ts does.
const stubLocalStorage = () => {
  const store = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
  });
};

// A stand-in for the @capacitor-mlkit "BarcodeScanner" plugin: records what
// was asked of it and lets a test fire the events the camera would.
type Handler = (event: never) => void;
const listeners: Record<string, Handler | undefined> = {};
const removed: string[] = [];
const plugin = {
  isSupported: vi.fn(),
  checkPermissions: vi.fn(),
  requestPermissions: vi.fn(),
  startScan: vi.fn(),
  stopScan: vi.fn(),
  isTorchAvailable: vi.fn(),
  toggleTorch: vi.fn(),
  getMaxZoomRatio: vi.fn(),
  setZoomRatio: vi.fn(),
  scan: vi.fn(),
  isGoogleBarcodeScannerModuleAvailable: vi.fn(),
  installGoogleBarcodeScannerModule: vi.fn(),
  addListener: vi.fn((event: string, handler: Handler) => {
    listeners[event] = handler;
    return Promise.resolve({
      remove: () => {
        removed.push(event);
        return Promise.resolve();
      },
    });
  }),
};
// Handed out the way Capacitor does: a proxy answering EVERY property with a
// native method, so anything the plugin lacks — `then` included — rejects.
// (A plain object once hid a module that returned the proxy from an async
// function and so never settled; see ./honeywell.ts.)
vi.mock('@capacitor/core', () => ({
  registerPlugin: () =>
    new Proxy(plugin, {
      get: (target, key) =>
        key in target
          ? target[key as keyof typeof target]
          : () =>
              Promise.reject(
                new Error(
                  `"BarcodeScanner.${String(key)}()" is not implemented on android`
                )
              ),
    }),
}));

const fire = (event: string, payload: unknown) =>
  (listeners[event] as ((p: unknown) => void) | undefined)?.(payload);
const fireBarcodes = (barcodes: MlkitBarcode[]) =>
  fire('barcodesScanned', { barcodes });

/** Resolves once the camera has been asked to start. */
const cameraStarted = () =>
  vi.waitFor(() => expect(plugin.startScan).toHaveBeenCalled());

const BUNDLED = 'MLKit (bundled)';
const GOOGLE = 'MLKit (Google Code Scanner)';

beforeEach(() => {
  vi.stubGlobal('window', androidWindow());
  stubLocalStorage();
  // No layout in node; the source only needs "after the next paint".
  vi.stubGlobal('requestAnimationFrame', (cb: () => void) => {
    cb();
    return 0;
  });
  plugin.isSupported.mockResolvedValue({ supported: true });
  plugin.checkPermissions.mockResolvedValue({ camera: 'granted' });
  plugin.requestPermissions.mockResolvedValue({ camera: 'granted' });
  plugin.startScan.mockResolvedValue(undefined);
  plugin.stopScan.mockResolvedValue(undefined);
  plugin.isTorchAvailable.mockResolvedValue({ available: true });
  plugin.toggleTorch.mockResolvedValue(undefined);
  plugin.getMaxZoomRatio.mockResolvedValue({ zoomRatio: 8 });
  plugin.setZoomRatio.mockResolvedValue(undefined);
  plugin.isGoogleBarcodeScannerModuleAvailable.mockResolvedValue({
    available: true,
  });
  plugin.installGoogleBarcodeScannerModule.mockResolvedValue(undefined);
});

afterEach(async () => {
  await cameraSource.release();
  resetCameraForTest();
  for (const key of Object.keys(listeners)) delete listeners[key];
  removed.length = 0;
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe('availability', () => {
  it('is absent off Android and never asks the plugin', async () => {
    vi.stubGlobal('window', {});
    expect(await cameraSource.available()).toBe(false);
    expect(plugin.isSupported).not.toHaveBeenCalled();
  });

  it('is present where the plugin reports support', async () => {
    expect(await cameraSource.available()).toBe(true);
    expect(cameraSource.connected()).toBe(true);
  });

  it('is absent, not an error, on a shell without the plugin', async () => {
    plugin.isSupported.mockRejectedValue(
      new Error('"BarcodeScanner" plugin is not implemented on android')
    );
    expect(await cameraSource.available()).toBe(false);
  });

  // spec/barcode-scanning/rules.md § Triggering a scan: where the scanner
  // cannot stay armed, each press asks for exactly one scan.
  it('cannot stay armed', async () => {
    expect(cameraSource.continuous).toBe(false);
    expect((await cameraSource.listen({ onScan: vi.fn() })).ok).toBe(false);
    expect(plugin.startScan).not.toHaveBeenCalled();
  });
});

// SET-05 .51: Google Code Scanner by default — what the old front end uses.
describe('engine choice', () => {
  it('defaults to Google Code Scanner', () => {
    expect(getCameraEngine()).toBe('google');
  });
});

describe('bundled engine', () => {
  beforeEach(() => setCameraEngine('bundled'));

  it('opens the overlay, resolves with the first read, then puts everything back', async () => {
    const outcome = cameraSource.scanOnce();
    await cameraStarted();
    expect(cameraOverlayOpen()).toBe(true);
    await vi.waitFor(() => expect(cameraTorchAvailable()).toBe(true));

    fireBarcodes([{ rawValue: '9300657270520', format: 'EAN_13' }]);
    expect(await outcome).toEqual({
      ok: true,
      scan: {
        kind: 'text',
        text: '9300657270520',
        format: 'EAN_13',
        decoder: BUNDLED,
      },
    });
    expect(cameraOverlayOpen()).toBe(false);
    await vi.waitFor(() => expect(plugin.stopScan).toHaveBeenCalled());
    expect(removed.sort()).toEqual(['barcodesScanned', 'scanError']);
    expect(plugin.scan).not.toHaveBeenCalled();
  });

  // spec/barcode-scanning/rules.md § Triggering a scan: the app never
  // constrains which barcode shapes a user may scan.
  it('asks for every format, at 1080p, with a little zoom', async () => {
    void cameraSource.scanOnce();
    await cameraStarted();
    expect(plugin.startScan).toHaveBeenCalledWith({ resolution: 2 });
    await vi.waitFor(() =>
      expect(plugin.setZoomRatio).toHaveBeenCalledWith({ zoomRatio: 1.5 })
    );
  });

  it('never zooms past what the camera offers', async () => {
    plugin.getMaxZoomRatio.mockResolvedValue({ zoomRatio: 1.2 });
    void cameraSource.scanOnce();
    await vi.waitFor(() =>
      expect(plugin.setZoomRatio).toHaveBeenCalledWith({ zoomRatio: 1.2 })
    );
  });

  it('takes the first read only', async () => {
    const outcome = cameraSource.scanOnce();
    await cameraStarted();
    fireBarcodes([{ rawValue: 'FIRST', format: 'QR_CODE' }]);
    fireBarcodes([{ rawValue: 'SECOND', format: 'QR_CODE' }]);
    expect(await outcome).toMatchObject({ ok: true, scan: { text: 'FIRST' } });
  });

  it('takes the code inside the viewfinder, not the first one MLKit found', async () => {
    setViewfinderRect({ left: 100, top: 100, right: 300, bottom: 300 });
    const outcome = cameraSource.scanOnce();
    await cameraStarted();
    // devicePixelRatio 2: physical (1000, 1000) is CSS (500, 500) — outside.
    const outside: MlkitBarcode = {
      rawValue: 'NEIGHBOUR',
      format: 'EAN_13',
      cornerPoints: [
        [980, 980],
        [1020, 980],
        [1020, 1020],
        [980, 1020],
      ],
    };
    const inside: MlkitBarcode = {
      rawValue: 'AIMED',
      format: 'EAN_13',
      cornerPoints: [
        [380, 380],
        [420, 380],
        [420, 420],
        [380, 420],
      ],
    };
    fireBarcodes([outside]);
    fireBarcodes([outside, inside]);
    expect(await outcome).toMatchObject({ ok: true, scan: { text: 'AIMED' } });
  });

  it('marks every code it sees: inside the box as eligible, outside as ignored, and the taken one as chosen', async () => {
    setViewfinderRect({ left: 100, top: 100, right: 300, bottom: 300 });
    const outcome = cameraSource.scanOnce();
    await cameraStarted();
    // devicePixelRatio 2, so physical pixels halve into CSS pixels.
    const box = (x: number, y: number): [number, number][] => [
      [x - 20, y - 20],
      [x + 20, y - 20],
      [x + 20, y + 20],
      [x - 20, y + 20],
    ];
    const outside = {
      rawValue: 'NEIGHBOUR',
      format: 'DATA_MATRIX',
      cornerPoints: box(1000, 1000),
    };
    fireBarcodes([outside]);
    expect(cameraDetections()).toEqual([
      expect.objectContaining({
        value: 'NEIGHBOUR',
        inside: false,
        chosen: false,
        // The plugin had already matched it in 10 frames before reporting.
        frames: 10,
        points: box(1000, 1000).map(
          ([x, y]) => [x / 2, y / 2] as [number, number]
        ),
      }),
    ]);
    fireBarcodes([outside]);
    expect(cameraDetections()[0]?.frames).toBe(11);

    fireBarcodes([
      outside,
      { rawValue: 'AIMED', format: 'EAN_13', cornerPoints: box(400, 400) },
    ]);
    const marks = cameraDetections();
    expect(marks.find(d => d.value === 'AIMED')).toMatchObject({
      inside: true,
      chosen: true,
    });
    expect(marks.find(d => d.value === 'NEIGHBOUR')).toMatchObject({
      chosen: false,
    });
    // Held on screen for a moment, so the user sees which code was taken…
    expect(cameraOverlayOpen()).toBe(true);
    expect(await outcome).toMatchObject({ ok: true, scan: { text: 'AIMED' } });
    // …then everything goes.
    expect(cameraOverlayOpen()).toBe(false);
    expect(cameraDetections()).toEqual([]);
  });

  it('takes the code nearest the centre when two are in the box', async () => {
    setViewfinderRect({ left: 100, top: 100, right: 300, bottom: 300 });
    const outcome = cameraSource.scanOnce();
    await cameraStarted();
    const at = (x: number, y: number): [number, number][] => [
      [x - 10, y - 10],
      [x + 10, y - 10],
      [x + 10, y + 10],
      [x - 10, y + 10],
    ];
    // Both inside (CSS = physical / 2); MLKit lists the corner one first.
    fireBarcodes([
      { rawValue: 'CORNER', format: 'DATA_MATRIX', cornerPoints: at(240, 240) },
      { rawValue: 'CENTRE', format: 'EAN_13', cornerPoints: at(410, 390) },
    ]);
    const marks = cameraDetections();
    expect(marks.find(d => d.value === 'CENTRE')).toMatchObject({
      inside: true,
      chosen: true,
    });
    expect(marks.find(d => d.value === 'CORNER')).toMatchObject({
      inside: true,
      chosen: false,
    });
    expect(await outcome).toMatchObject({ ok: true, scan: { text: 'CENTRE' } });
  });

  it('drops the marker of a code that has left the frame', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'setTimeout', 'Date'] });
    try {
      setViewfinderRect({ left: 100, top: 100, right: 300, bottom: 300 });
      void cameraSource.scanOnce();
      await vi.waitFor(() => expect(plugin.startScan).toHaveBeenCalled());
      fireBarcodes([
        {
          rawValue: 'PASSING',
          format: 'EAN_13',
          cornerPoints: [
            [0, 0],
            [10, 0],
            [10, 10],
            [0, 10],
          ],
        },
      ]);
      expect(cameraDetections()).toHaveLength(1);
      await vi.advanceTimersByTimeAsync(1000);
      expect(cameraDetections()).toEqual([]);
    } finally {
      vi.useRealTimers();
    }
  });

  // spec/barcode-scanning/ui-surface.md § Notices: a scan the user cancelled
  // is silent — cancelling is not a failure.
  it('resolves as cancelled, and stops the camera, when the user cancels', async () => {
    const outcome = cameraSource.scanOnce();
    await cameraStarted();
    cancelCameraScan();
    expect(await outcome).toEqual({ ok: false, cancelled: true });
    expect(cameraOverlayOpen()).toBe(false);
    await vi.waitFor(() => expect(plugin.stopScan).toHaveBeenCalled());
  });

  // spec/barcode-scanning/rules.md § Triggering a scan: leaving a screen
  // stops its scanning.
  it('is cancelled by release', async () => {
    const outcome = cameraSource.scanOnce();
    await cameraStarted();
    await cameraSource.release();
    expect(await outcome).toEqual({ ok: false, cancelled: true });
  });

  it('reaches the caller when cancelled while the camera is still starting, then stops it', async () => {
    let finishStarting: () => void = () => undefined;
    plugin.startScan.mockReturnValue(
      new Promise<void>(resolve => (finishStarting = resolve))
    );
    const outcome = cameraSource.scanOnce();
    await cameraStarted();
    cancelCameraScan();
    expect(await outcome).toEqual({ ok: false, cancelled: true });
    plugin.stopScan.mockClear();
    finishStarting();
    await vi.waitFor(() => expect(plugin.stopScan).toHaveBeenCalled());
    expect(cameraOverlayOpen()).toBe(false);
  });

  it('fails, and puts everything back, when the camera will not start', async () => {
    plugin.startScan.mockRejectedValue(new Error('camera in use'));
    expect(await cameraSource.scanOnce()).toEqual({
      ok: false,
      cancelled: false,
      message: 'camera in use',
    });
    expect(cameraOverlayOpen()).toBe(false);
  });

  it('fails on a scan error', async () => {
    const outcome = cameraSource.scanOnce();
    await cameraStarted();
    fire('scanError', { message: 'analyser failed' });
    expect(await outcome).toEqual({
      ok: false,
      cancelled: false,
      message: 'analyser failed',
    });
  });

  it('is superseded by a second press', async () => {
    const first = cameraSource.scanOnce();
    await cameraStarted();
    const second = cameraSource.scanOnce();
    expect(await first).toEqual({ ok: false, cancelled: true });
    await vi.waitFor(() => expect(plugin.startScan).toHaveBeenCalledTimes(2));
    fireBarcodes([{ rawValue: 'Z', format: 'CODE_128' }]);
    expect((await second).ok).toBe(true);
  });
});

describe('Google Code Scanner engine', () => {
  beforeEach(() => setCameraEngine('google'));

  it("scans with Google's UI, and never opens the app's overlay", async () => {
    plugin.scan.mockResolvedValue({
      barcodes: [{ rawValue: '9300657270520', format: 'EAN_13' }],
    });
    expect(await cameraSource.scanOnce()).toEqual({
      ok: true,
      scan: {
        kind: 'text',
        text: '9300657270520',
        format: 'EAN_13',
        decoder: GOOGLE,
      },
    });
    expect(plugin.startScan).not.toHaveBeenCalled();
    expect(cameraOverlayOpen()).toBe(false);
  });

  it('is cancelled, not failed, when the user backs out', async () => {
    plugin.scan.mockRejectedValue(new Error('scan canceled.'));
    expect(await cameraSource.scanOnce()).toEqual({
      ok: false,
      cancelled: true,
    });
  });

  it('downloads the module first where it is missing', async () => {
    plugin.isGoogleBarcodeScannerModuleAvailable.mockResolvedValue({
      available: false,
    });
    plugin.installGoogleBarcodeScannerModule.mockImplementation(async () => {
      fire('googleBarcodeScannerModuleInstallProgress', { state: 4 });
    });
    plugin.scan.mockResolvedValue({
      barcodes: [{ rawValue: 'X', format: 'QR_CODE' }],
    });
    expect((await cameraSource.scanOnce()).ok).toBe(true);
    expect(removed).toContain('googleBarcodeScannerModuleInstallProgress');
  });

  it('fails with a reason when the module cannot be installed', async () => {
    plugin.isGoogleBarcodeScannerModuleAvailable.mockResolvedValue({
      available: false,
    });
    plugin.installGoogleBarcodeScannerModule.mockImplementation(async () => {
      fire('googleBarcodeScannerModuleInstallProgress', { state: 5 });
    });
    expect(await cameraSource.scanOnce()).toMatchObject({
      ok: false,
      cancelled: false,
    });
    expect(plugin.scan).not.toHaveBeenCalled();
  });
});

describe('camera permission', () => {
  beforeEach(() => setCameraEngine('bundled'));

  it('asks when Android will still ask, and scans once granted', async () => {
    plugin.checkPermissions.mockResolvedValue({ camera: 'prompt' });
    void cameraSource.scanOnce();
    await cameraStarted();
    expect(plugin.requestPermissions).toHaveBeenCalled();
  });

  it('fails with a way forward, and never opens the camera, when refused', async () => {
    plugin.checkPermissions.mockResolvedValue({ camera: 'prompt' });
    plugin.requestPermissions.mockResolvedValue({ camera: 'denied' });
    const outcome = await cameraSource.scanOnce();
    expect(outcome).toMatchObject({ ok: false, cancelled: false });
    expect(plugin.startScan).not.toHaveBeenCalled();
    expect(cameraOverlayOpen()).toBe(false);
  });

  it('does not re-prompt once permanently denied', async () => {
    plugin.checkPermissions.mockResolvedValue({ camera: 'denied' });
    await cameraSource.scanOnce();
    expect(plugin.requestPermissions).not.toHaveBeenCalled();
  });
});

// MLKit marks GS1 inside the text; making that read the same as other
// scanners is the reading layer's job (src/domain/barcode/readScan.test.ts),
// so the camera hands the text up untouched.
describe('toRawScan', () => {
  const GS = '\u001d';

  it('hands the text up verbatim, with its format', () => {
    expect(
      toRawScan({ rawValue: GS + '0109506000', format: 'DATA_MATRIX' }, 'bundled')
    ).toEqual({
      kind: 'text',
      text: GS + '0109506000',
      format: 'DATA_MATRIX',
      decoder: BUNDLED,
    });
    expect(
      toRawScan({ rawValue: ']C10150382903018883', format: 'CODE_128' }, 'google')
    ).toMatchObject({ text: ']C10150382903018883' });
  });

  it('omits an empty format', () => {
    expect(toRawScan({ rawValue: '1', format: '' }, 'bundled')).toEqual({
      kind: 'text',
      text: '1',
      decoder: BUNDLED,
    });
  });
});

describe('inViewfinder', () => {
  const rect = { left: 100, top: 100, right: 300, bottom: 300 };
  const at = (x: number, y: number): MlkitBarcode => ({
    rawValue: 'x',
    format: 'EAN_13',
    cornerPoints: [
      [x - 1, y - 1],
      [x + 1, y - 1],
      [x + 1, y + 1],
      [x - 1, y + 1],
    ],
  });

  it('accepts a code centred inside, in CSS pixels', () => {
    expect(inViewfinder(at(400, 400), rect, 2)).toBe(true);
  });

  it('rejects a code well outside', () => {
    expect(inViewfinder(at(1000, 1000), rect, 2)).toBe(false);
  });

  it('allows some slack at the edge', () => {
    // CSS (310, 200): 10px outside, inside the 15% (30px) slack.
    expect(inViewfinder(at(620, 400), rect, 2)).toBe(true);
  });

  it('accepts anything when it cannot tell', () => {
    expect(inViewfinder({ rawValue: 'x', format: 'EAN_13' }, rect, 2)).toBe(
      true
    );
    expect(inViewfinder(at(1000, 1000), undefined, 2)).toBe(true);
  });
});

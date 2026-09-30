import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  honeywellSource,
  resetHoneywellForTest,
  toRawScan,
  type HoneywellScanEvent,
} from './honeywell';

// A window carrying a Capacitor bridge reporting the android platform — what
// isAndroid() keys off (mirrors readServerLog's device tests).
const androidWindow = () => ({
  Capacitor: { getPlatform: () => 'android', isNativePlatform: () => true },
});

// A stand-in for the shell's HoneywellScanner plugin: records what was asked
// of it and lets a test fire the events the SDK would.
const listeners: {
  scan?: (scan: HoneywellScanEvent) => void;
  failure?: () => void;
} = {};
const plugin = {
  status: vi.fn(),
  arm: vi.fn(),
  trigger: vi.fn(),
  addListener: vi.fn((event: 'scan' | 'failure', handler: never) => {
    listeners[event] = handler;
    return Promise.resolve({ remove: () => Promise.resolve() });
  }),
};
// Handed out the way Capacitor does: a proxy that answers EVERY property with
// a native method, so anything the plugin lacks — `then` included — is a call
// that rejects "not implemented". A plain object here once hid a module that
// returned the proxy from an async function and so never settled.
vi.mock('@capacitor/core', () => ({
  registerPlugin: () =>
    new Proxy(plugin, {
      get: (target, key) =>
        key in target
          ? target[key as keyof typeof target]
          : () =>
              Promise.reject(
                new Error(
                  `"HoneywellScanner.${String(key)}()" is not implemented on android`
                )
              ),
    }),
}));

const fireScan = (scan: HoneywellScanEvent) => listeners.scan?.(scan);
const fireFailure = () => listeners.failure?.();

beforeEach(() => {
  vi.stubGlobal('window', androidWindow());
  plugin.status.mockResolvedValue({
    apiVersion: 1,
    available: true,
    claimed: true,
  });
  plugin.arm.mockResolvedValue(undefined);
  plugin.trigger.mockResolvedValue(undefined);
});

afterEach(async () => {
  await honeywellSource.release();
  resetHoneywellForTest();
  delete listeners.scan;
  delete listeners.failure;
  vi.unstubAllGlobals();
  vi.clearAllMocks();
  vi.useRealTimers();
});

describe('availability', () => {
  it('is absent off Android and never asks the plugin', async () => {
    vi.stubGlobal('window', {});
    expect(await honeywellSource.available()).toBe(false);
    expect(plugin.status).not.toHaveBeenCalled();
  });

  it('is present when the shell reports the scanner ready', async () => {
    expect(await honeywellSource.available()).toBe(true);
    expect(honeywellSource.connected()).toBe(true);
  });

  it('is absent on a device without the scanner', async () => {
    plugin.status.mockResolvedValue({
      apiVersion: 1,
      available: false,
      claimed: false,
    });
    expect(await honeywellSource.available()).toBe(false);
    expect(honeywellSource.connected()).toBe(false);
  });

  // An APK built before status() existed: the plugin is registered, but the
  // proxy rejects the method.
  it('is absent, not an error, on an APK that predates status()', async () => {
    plugin.status.mockRejectedValue(
      new Error('"HoneywellScanner.status()" is not implemented on android')
    );
    expect(await honeywellSource.available()).toBe(false);
  });
});

describe('listening', () => {
  it('hands each read to the armed handler, with its symbology', async () => {
    const onScan = vi.fn();
    expect(await honeywellSource.listen({ onScan })).toEqual({ ok: true });
    fireScan({ data: '0109506000134352', aimId: ']C1', codeId: 'I' });
    expect(onScan).toHaveBeenCalledWith({
      kind: 'text',
      text: '0109506000134352',
      aimId: ']C1',
    });
  });

  it('reports arming failure when the scanner cannot be claimed', async () => {
    plugin.arm.mockRejectedValue(new Error('Scanner unavailable'));
    const result = await honeywellSource.listen({ onScan: vi.fn() });
    expect(result).toEqual({ ok: false, message: 'Scanner unavailable' });
    expect(honeywellSource.connected()).toBe(false);
  });

  // spec/barcode-scanning/rules.md § Triggering a scan: a scan arriving with
  // nobody registered is dropped silently.
  it('drops reads once released', async () => {
    const onScan = vi.fn();
    await honeywellSource.listen({ onScan });
    await honeywellSource.release();
    fireScan({ data: '123' });
    expect(onScan).not.toHaveBeenCalled();
  });

  it('does not report a no-read as a failed reading', async () => {
    const onError = vi.fn();
    await honeywellSource.listen({ onScan: vi.fn(), onError });
    fireFailure();
    expect(onError).not.toHaveBeenCalled();
  });

  it('subscribes to the plugin once, however often it is armed', async () => {
    await honeywellSource.listen({ onScan: vi.fn() });
    await honeywellSource.release();
    await honeywellSource.listen({ onScan: vi.fn() });
    expect(plugin.addListener).toHaveBeenCalledTimes(2); // scan + failure
  });
});

describe('scanOnce', () => {
  it('presses the trigger and resolves with the first read', async () => {
    const outcome = honeywellSource.scanOnce();
    await vi.waitFor(() => expect(plugin.trigger).toHaveBeenCalled());
    expect(plugin.trigger).toHaveBeenCalledWith({ on: true, timeoutMs: 5000 });
    fireScan({ data: 'ABC-123', aimId: ']A0' });
    expect(await outcome).toEqual({
      ok: true,
      scan: { kind: 'text', text: 'ABC-123', aimId: ']A0' },
    });
  });

  it('takes the read ahead of an armed screen', async () => {
    const onScan = vi.fn();
    await honeywellSource.listen({ onScan });
    const outcome = honeywellSource.scanOnce();
    await vi.waitFor(() => expect(plugin.trigger).toHaveBeenCalled());
    fireScan({ data: 'X' });
    expect((await outcome).ok).toBe(true);
    expect(onScan).not.toHaveBeenCalled();
    // …and the screen gets the next one.
    fireScan({ data: 'Y' });
    expect(onScan).toHaveBeenCalledWith({ kind: 'text', text: 'Y' });
  });

  it('fails, not cancels, when the beam timed out with nothing read', async () => {
    const outcome = honeywellSource.scanOnce();
    await vi.waitFor(() => expect(plugin.trigger).toHaveBeenCalled());
    fireFailure();
    expect(await outcome).toMatchObject({ ok: false, cancelled: false });
  });

  it('gives up on its own if the shell never answers', async () => {
    vi.useFakeTimers();
    const outcome = honeywellSource.scanOnce();
    await vi.waitFor(() => expect(plugin.trigger).toHaveBeenCalled());
    await vi.advanceTimersByTimeAsync(6000);
    expect(await outcome).toMatchObject({ ok: false, cancelled: false });
  });

  it('is cancelled by release, and lets go of the trigger', async () => {
    const outcome = honeywellSource.scanOnce();
    await vi.waitFor(() => expect(plugin.trigger).toHaveBeenCalled());
    await honeywellSource.release();
    expect(await outcome).toEqual({ ok: false, cancelled: true });
    expect(plugin.trigger).toHaveBeenLastCalledWith({ on: false });
  });

  it('is superseded by a second press', async () => {
    const first = honeywellSource.scanOnce();
    await vi.waitFor(() => expect(plugin.trigger).toHaveBeenCalledTimes(1));
    const second = honeywellSource.scanOnce();
    expect(await first).toEqual({ ok: false, cancelled: true });
    await vi.waitFor(() => expect(plugin.trigger).toHaveBeenCalledTimes(2));
    fireScan({ data: 'Z' });
    expect((await second).ok).toBe(true);
  });

  it('fails without pressing when the scanner cannot be claimed', async () => {
    plugin.arm.mockRejectedValue(new Error('Scanner unavailable'));
    expect(await honeywellSource.scanOnce()).toEqual({
      ok: false,
      cancelled: false,
      message: 'Scanner unavailable',
    });
    expect(plugin.trigger).not.toHaveBeenCalled();
  });
});

describe('toRawScan', () => {
  it('omits an empty symbology identifier', () => {
    expect(toRawScan({ data: '1', aimId: '' })).toEqual({
      kind: 'text',
      text: '1',
    });
  });
});

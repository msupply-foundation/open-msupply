import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  desktopHidSource,
  desktopHidStatus,
  desktopHidSupported,
  pairDesktopHidByScan,
  resetDesktopHidForTest,
  watchDesktopHid,
} from './desktopHid';
import { webHidSupported } from './webHid';

// A stand-in for the old Electron shell's preload bridge
// (client/packages/electron/src/preload.ts § desktopHidScanner): records what
// was asked of it, and lets a test push reports and change events through.
const scanner = { vendorId: 1, productId: 2, name: 'Zebra DS2208' };
const makeBridge = () => {
  let report: ((bytes: Uint8Array) => void) | undefined;
  let change: (() => void) | undefined;
  const bridge = {
    version: 1,
    status: vi.fn().mockResolvedValue({ paired: scanner, connected: true }),
    candidates: vi.fn().mockResolvedValue([]),
    pair: vi.fn().mockResolvedValue({ ok: true, scanner }),
    pairDevice: vi.fn(),
    cancelPair: vi.fn().mockResolvedValue(undefined),
    forget: vi.fn().mockResolvedValue(undefined),
    start: vi.fn().mockResolvedValue({ ok: true }),
    stop: vi.fn().mockResolvedValue(undefined),
    onReport: vi.fn((cb: (bytes: Uint8Array) => void) => (report = cb)),
    onChange: vi.fn((cb: () => void) => (change = cb)),
  };
  return {
    bridge,
    report: (bytes: number[]) => report?.(Uint8Array.from(bytes)),
    change: () => change?.(),
  };
};

let shell: ReturnType<typeof makeBridge>;

beforeEach(() => {
  shell = makeBridge();
  vi.stubGlobal('window', { desktopHidScanner: shell.bridge });
  // Electron exposes navigator.hid too — WebHID must still stand down.
  vi.stubGlobal('navigator', { hid: { getDevices: async () => [] } });
});

afterEach(async () => {
  await desktopHidSource.release();
  resetDesktopHidForTest();
  vi.unstubAllGlobals();
});

describe('desktop HID source', () => {
  it('exists only where the shell exposes a bridge it speaks', async () => {
    expect(desktopHidSupported()).toBe(true);

    vi.stubGlobal('window', {});
    expect(desktopHidSupported()).toBe(false);
    expect(await desktopHidSource.available()).toBe(false);

    vi.stubGlobal('window', { desktopHidScanner: { ...shell.bridge, version: 2 } });
    expect(desktopHidSupported()).toBe(false);
  });

  it('is available once paired, even unplugged — shown disabled, not hidden', async () => {
    shell.bridge.status.mockResolvedValue({ paired: scanner, connected: false });
    expect(await desktopHidSource.available()).toBe(true);
    expect(desktopHidSource.connected()).toBe(false);
  });

  it('is not available with nothing paired', async () => {
    shell.bridge.status.mockResolvedValue({ paired: null, connected: false });
    expect(await desktopHidSource.available()).toBe(false);
  });

  it('hands reports up undecoded while armed, and drops them after release', async () => {
    const onScan = vi.fn();
    expect(await desktopHidSource.listen({ onScan })).toEqual({ ok: true });

    shell.report([5, 0, 0x5d, 0x43, 0x30]);
    expect(onScan).toHaveBeenCalledWith({
      kind: 'bytes',
      bytes: Uint8Array.from([5, 0, 0x5d, 0x43, 0x30]),
    });

    await desktopHidSource.release();
    expect(shell.bridge.stop).toHaveBeenCalled();
    shell.report([1, 2, 3]);
    expect(onScan).toHaveBeenCalledTimes(1);
  });

  it('reports a start the shell refused, and re-reads presence', async () => {
    shell.bridge.start.mockResolvedValue({
      ok: false,
      message: 'paired scanner is not connected',
    });
    shell.bridge.status.mockResolvedValue({ paired: scanner, connected: false });

    const result = await desktopHidSource.listen({ onScan: vi.fn() });
    expect(result).toEqual({
      ok: false,
      message: 'paired scanner is not connected',
    });
    expect(desktopHidSource.connected()).toBe(false);
    shell.report([0x41]);
  });

  it('re-reads status when the shell says something changed', async () => {
    const onChange = vi.fn();
    watchDesktopHid(onChange);
    shell.bridge.status.mockResolvedValue({ paired: scanner, connected: false });

    shell.change();
    await vi.waitFor(() => expect(onChange).toHaveBeenCalled());
    expect(desktopHidStatus().connected).toBe(false);
  });

  it('pairing refreshes the status the Devices row reads', async () => {
    shell.bridge.status.mockResolvedValue({ paired: scanner, connected: true });
    expect(await pairDesktopHidByScan()).toEqual({ ok: true, scanner });
    expect(desktopHidStatus().paired?.name).toBe('Zebra DS2208');
  });

  it('stands WebHID down in the desktop app', () => {
    expect(webHidSupported()).toBe(false);
    vi.stubGlobal('window', {});
    expect(webHidSupported()).toBe(true);
  });
});

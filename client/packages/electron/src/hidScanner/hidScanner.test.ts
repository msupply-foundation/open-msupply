import { EventEmitter } from 'events';
import type { Device } from 'node-hid';
import { HidHandle, HidScanner, PairedHidScanner } from './hidScanner';

// A stand-in for node-hid's HIDAsync: devices are plain descriptors, and
// opening one hands back an emitter the test can push reports and errors
// through. Like HIDAsync, closing removes the listeners.
class FakeHandle extends EventEmitter {
  closed = false;
  async close() {
    if (this.closed) throw new Error('device is already closed');
    this.closed = true;
    this.removeAllListeners();
  }
}

// Opening and closing are asynchronous: let them settle.
const flush = async () => {
  for (let i = 0; i < 100; i++) await Promise.resolve();
};

const device = (overrides: Partial<Device> = {}): Device => ({
  vendorId: 0x05e0,
  productId: 0x1300,
  path: 'scanner',
  manufacturer: 'Zebra',
  product: 'DS2208',
  release: 1,
  interface: 0,
  usagePage: 0x8c,
  usage: 0x02,
  ...overrides,
});

const keyboard = device({
  vendorId: 1,
  productId: 1,
  path: 'keyboard',
  product: 'Keyboard',
  manufacturer: '',
  usagePage: 0x01,
  usage: 0x06,
});
const mouse = device({
  vendorId: 2,
  productId: 2,
  path: 'mouse',
  usagePage: 0x01,
  usage: 0x02,
});
const dongle = device({
  vendorId: 3,
  productId: 3,
  path: 'dongle',
  product: 'Dongle',
  manufacturer: '',
  usagePage: 0xff00,
  usage: 1,
});

const REPORT = [5, 0, 0x5d, 0x43, 0x30, 0x31, 0x32, 0x33, 0x34, 0x35];
const code = (text: string) => Array.from(text, c => c.charCodeAt(0));
// The pairing barcode as the captured scanners frame it (length, 0, AIM id,
// label, zero padding)...
const PAIRING_REPORT = [
  12, 0, ...code(']C0'), ...code('open mSupply'), ...new Array(44).fill(0), 0x18, 0,
];
// ...and as the reference's scanner did (19, 16, 3, 0, label, 0, 24, 11).
const PAIRING_REPORT_OTHER_FRAMING = [
  19, 16, 3, 0, ...code('open mSupply'), 0, 24, 11,
];

const setup = (attached: Device[] = [device(), keyboard, mouse, dongle]) => {
  let devices = attached;
  let stored: PairedHidScanner | null = null;
  const handles = new Map<string, FakeHandle>();
  const openCounts = new Map<string, number>();
  const refuse = new Set<string>();
  const reports: Uint8Array[] = [];
  const changed = jest.fn();

  const scanner = new HidScanner(
    {
      devices: () => devices,
      open: async path => {
        if (refuse.has(path)) throw new Error('cannot open device');
        const handle = new FakeHandle();
        handles.set(path, handle);
        openCounts.set(path, (openCounts.get(path) ?? 0) + 1);
        return handle as unknown as HidHandle;
      },
    },
    { get: () => stored, set: s => (stored = s) },
    { report: bytes => reports.push(bytes), changed },
    { pairTimeoutMs: 1000 }
  );

  return {
    scanner,
    handles,
    opens: (path: string) => openCounts.get(path) ?? 0,
    refuse,
    reports,
    changed,
    stored: () => stored,
    setDevices: (next: Device[]) => (devices = next),
  };
};


describe('HidScanner', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  /**
   * Start pairing and let its devices open, ready to be scanned. Wrapped, or
   * awaiting this would wait for pairing to finish.
   */
  const startPairing = async (t: ReturnType<typeof setup>) => {
    const pairing = t.scanner.pair();
    await flush();
    return { pairing };
  };

  describe('pairing by scan', () => {
    it('pairs the device that scans the pairing barcode, and closes the rest', async () => {
      const t = setup();
      const { pairing } = await startPairing(t);
      t.handles.get('scanner')?.emit('data', Buffer.from(PAIRING_REPORT));

      const result = await pairing;
      expect(result).toEqual({
        ok: true,
        scanner: expect.objectContaining({
          vendorId: 0x05e0,
          productId: 0x1300,
          name: 'Zebra DS2208',
        }),
      });
      expect(t.stored()?.vendorId).toBe(0x05e0);
      await flush();
      expect([...t.handles.values()].every(h => h.closed)).toBe(true);
      expect(t.changed).toHaveBeenCalled();
    });

    it('pairs a scanner whatever its report framing', async () => {
      const t = setup();
      const { pairing } = await startPairing(t);
      t.handles
        .get('scanner')
        ?.emit('data', Buffer.from(PAIRING_REPORT_OTHER_FRAMING));
      expect(await pairing).toMatchObject({
        ok: true,
        scanner: { name: 'Zebra DS2208' },
      });
    });

    it('opens only scanner interfaces, and at most three', async () => {
      const scanners = [1, 2, 3, 4].map(n =>
        device({ vendorId: 0x100 + n, path: `scanner-${n}` })
      );
      const t = setup([dongle, ...scanners]);
      void (await startPairing(t));
      expect(t.handles.has('dongle')).toBe(false);
      expect([...t.handles.keys()]).toEqual(['scanner-1', 'scanner-2', 'scanner-3']);
      t.scanner.cancelPair();
    });

    // The bug that made a known code necessary: on a Mac, Apple's own
    // interfaces report constantly, and paired before anything was scanned.
    it('ignores devices reporting on their own, and any other barcode', async () => {
      const t = setup();
      const { pairing } = await startPairing(t);
      t.handles.get('scanner')?.emit('data', Buffer.from([0x41, 0x42, 0x43, 0x44]));
      t.handles.get('scanner')?.emit('data', Buffer.from(REPORT));
      expect(t.stored()).toBeNull();

      t.handles.get('scanner')?.emit('data', Buffer.from(PAIRING_REPORT));
      expect(await pairing).toMatchObject({
        ok: true,
        scanner: { name: 'Zebra DS2208' },
      });
    });

    it('never opens a keyboard or a mouse', async () => {
      const t = setup();
      void (await startPairing(t));
      expect(t.handles.has('keyboard')).toBe(false);
      expect(t.handles.has('mouse')).toBe(false);
      expect(t.handles.has('scanner')).toBe(true);
      t.scanner.cancelPair();
    });

    it('times out when nothing scans', async () => {
      const t = setup();
      const { pairing } = await startPairing(t);
      jest.advanceTimersByTime(1000);
      expect(await pairing).toEqual({ ok: false, reason: 'timeout' });
      expect(t.stored()).toBeNull();
      await flush();
      expect([...t.handles.values()].every(h => h.closed)).toBe(true);
    });

    it('can be cancelled', async () => {
      const t = setup();
      const { pairing } = await startPairing(t);
      t.scanner.cancelPair();
      expect(await pairing).toEqual({ ok: false, reason: 'cancelled' });
      expect(t.stored()).toBeNull();
    });

    it('says so when no scanner interface is attached', async () => {
      const t = setup([dongle, keyboard]);
      expect(await t.scanner.pair()).toEqual({
        ok: false,
        reason: 'no-devices',
      });
    });

    it('says so when nothing can be opened', async () => {
      const t = setup([device(), keyboard]);
      t.refuse.add('scanner');
      expect(await t.scanner.pair()).toEqual({
        ok: false,
        reason: 'no-devices',
      });
    });

    it('closes the armed scanner before opening devices to pair', async () => {
      const t = setup();
      await t.scanner.pairDevice(t.scanner.candidates()[0]?.key ?? '');
      await t.scanner.start();
      const armed = t.handles.get('scanner');
      void (await startPairing(t));
      expect(armed?.closed).toBe(true);
      t.scanner.cancelPair();
    });
  });

  describe('pairing from a list', () => {
    it('lists everything but keyboards and mice, scanners first', () => {
      const t = setup([dongle, keyboard, device(), mouse]);
      const names = t.scanner.candidates().map(c => c.name);
      expect(names).toEqual(['Zebra DS2208', 'Dongle']);
      expect(t.scanner.candidates()[0]?.scannerUsage).toBe(true);
    });

    it('lists one entry per physical device, by its scanner interface', () => {
      const t = setup([
        device({ path: 'vendor-if', interface: 1, usagePage: 0xff00, usage: 1 }),
        device(),
        device({ path: 'scanner-again' }),
      ]);
      const candidates = t.scanner.candidates();
      expect(candidates).toHaveLength(1);
      expect(candidates[0]?.scannerUsage).toBe(true);
    });

    // A Mac's trackpad and a wireless mouse list vendor-defined interfaces
    // beside their input one — seen on a real machine as eight "Apple
    // Internal Keyboard / Trackpad" rows and two per mouse.
    it('drops every interface of a keyboard or mouse', async () => {
      const trackpad = { vendorId: 0x05ac, productId: 0x0342, product: 'Trackpad' };
      const t = setup([
        device({ ...trackpad, path: 'tp-kbd', usagePage: 0x01, usage: 0x06 }),
        device({ ...trackpad, path: 'tp-vendor', interface: 2, usagePage: 0xff00, usage: 3 }),
        device(),
      ]);
      expect(t.scanner.candidates().map(c => c.name)).toEqual(['Zebra DS2208']);
      void (await startPairing(t));
      expect(t.handles.has('tp-vendor')).toBe(false);
      t.scanner.cancelPair();
    });

    it('keeps a scanner that also exposes a keyboard interface', () => {
      const t = setup([
        device({ path: 'scanner-kbd', interface: 1, usagePage: 0x01, usage: 0x06 }),
        device(),
      ]);
      expect(t.scanner.candidates()).toHaveLength(1);
      expect(t.scanner.candidates()[0]?.scannerUsage).toBe(true);
    });

    it('pairs the picked device without waiting for a scan', async () => {
      const t = setup();
      const [picked] = t.scanner.candidates();
      expect(await t.scanner.pairDevice(picked?.key ?? '')).toMatchObject({
        ok: true,
      });
      expect(t.stored()?.name).toBe('Zebra DS2208');
      expect(t.changed).toHaveBeenCalled();
    });

    it('refuses a device that has gone', async () => {
      const t = setup();
      expect(await t.scanner.pairDevice('nope')).toEqual({
        ok: false,
        reason: 'not-found',
      });
    });
  });

  describe('scanning', () => {
    const paired = async () => {
      const t = setup();
      const { pairing } = await startPairing(t);
      t.handles.get('scanner')?.emit('data', Buffer.from(PAIRING_REPORT));
      await pairing;
      await flush();
      t.changed.mockClear();
      return t;
    };

    it('forwards reports verbatim once started', async () => {
      const t = await paired();
      expect(await t.scanner.start()).toEqual({ ok: true });
      t.handles.get('scanner')?.emit('data', Buffer.from(REPORT));
      expect(t.reports).toEqual([Uint8Array.from(REPORT)]);
    });

    it('forwards each report once, however often it is started', async () => {
      const t = await paired();
      await t.scanner.start();
      await t.scanner.start();
      t.handles.get('scanner')?.emit('data', Buffer.from(REPORT));
      expect(t.reports).toHaveLength(1);
    });

    it('stops forwarding on stop, but keeps the device open', async () => {
      const t = await paired();
      await t.scanner.start();
      const handle = t.handles.get('scanner');
      await t.scanner.stop();
      expect(handle?.closed).toBe(false);
      handle?.emit('data', Buffer.from(REPORT));
      expect(t.reports).toHaveLength(0);
      expect(t.scanner.status().connected).toBe(true);
    });

    // Closed between screens, the device handed everything scanned meanwhile
    // to the next screen that opened it.
    it('drops a scan made while stopped, rather than delivering it on the next start', async () => {
      const t = await paired();
      await t.scanner.start();
      await t.scanner.stop();
      t.handles.get('scanner')?.emit('data', Buffer.from(REPORT));
      await t.scanner.start();
      expect(t.reports).toHaveLength(0);
      t.handles.get('scanner')?.emit('data', Buffer.from(REPORT));
      expect(t.reports).toHaveLength(1);
    });

    it('reuses the open device on a later start, rather than reopening it', async () => {
      const t = await paired();
      await t.scanner.start();
      const handle = t.handles.get('scanner');
      await t.scanner.stop();
      await t.scanner.start();
      expect(t.opens('scanner')).toBe(2); // pairing, then the first start
      expect(t.handles.get('scanner')).toBe(handle);
    });

    // A screen's start() and the previous screen's stop() arrive as separate
    // IPC calls, and opening takes a while: neither may undo the other.
    it('runs a stop and a start that overlap in the order they were asked', async () => {
      const t = await paired();
      const starting = t.scanner.start();
      const stopping = t.scanner.stop();
      await Promise.all([starting, stopping]);
      t.handles.get('scanner')?.emit('data', Buffer.from(REPORT));
      expect(t.reports).toHaveLength(0);

      const stoppingAgain = t.scanner.stop();
      const startingAgain = t.scanner.start();
      await Promise.all([stoppingAgain, startingAgain]);
      t.handles.get('scanner')?.emit('data', Buffer.from(REPORT));
      expect(t.reports).toHaveLength(1);
      expect(t.opens('scanner')).toBe(2);
    });

    it('finds the scanner again on another port, closing the old handle', async () => {
      const t = await paired();
      await t.scanner.start();
      const old = t.handles.get('scanner');
      // Hold on to its listener, as a report in flight while closing would.
      const listener = old?.listeners('data')[0] as (data: unknown) => void;
      t.setDevices([device({ path: 'scanner-moved' }), keyboard]);
      expect(await t.scanner.start()).toEqual({ ok: true });
      expect(t.handles.has('scanner-moved')).toBe(true);
      expect(old?.closed).toBe(true);
      listener(Buffer.from(REPORT));
      expect(t.reports).toHaveLength(0);
    });

    it('opens the device again after an unplug', async () => {
      const t = await paired();
      await t.scanner.start();
      const unplugged = t.handles.get('scanner');
      unplugged?.emit('error', new Error('could not read'));
      await flush();
      expect(unplugged?.closed).toBe(true);
      expect(await t.scanner.start()).toEqual({ ok: true });
      expect(t.handles.get('scanner')).not.toBe(unplugged);
      t.handles.get('scanner')?.emit('data', Buffer.from(REPORT));
      expect(t.reports).toHaveLength(1);
    });

    it('closes the device on forget, re-pairing, and dispose', async () => {
      const acts: ((t: Awaited<ReturnType<typeof paired>>) => Promise<unknown>)[] = [
        t => t.scanner.forget(),
        async t => {
          const { pairing } = await startPairing(t);
          t.scanner.cancelPair();
          return pairing;
        },
        t => t.scanner.pairDevice(t.scanner.candidates()[0]?.key ?? ''),
        t => t.scanner.dispose(),
      ];
      for (const act of acts) {
        const t = await paired();
        await t.scanner.start();
        const handle = t.handles.get('scanner');
        await act(t);
        expect(handle?.closed).toBe(true);
      }
    });


    it('fails to start when nothing is paired', async () => {
      const t = setup();
      expect(await t.scanner.start()).toMatchObject({ ok: false });
    });

    it('fails to start when the paired scanner is unplugged', async () => {
      const t = await paired();
      t.setDevices([keyboard]);
      expect(await t.scanner.start()).toMatchObject({ ok: false });
      expect(t.scanner.status().connected).toBe(false);
    });

    it('fails to start when the scanner cannot be opened', async () => {
      const t = await paired();
      t.refuse.add('scanner');
      expect(await t.scanner.start()).toEqual({
        ok: false,
        message: 'cannot open device',
      });
    });

    it('reports an unplug while armed', async () => {
      const t = await paired();
      await t.scanner.start();
      t.setDevices([keyboard]);
      t.handles.get('scanner')?.emit('error', new Error('could not read'));
      expect(t.changed).toHaveBeenCalled();
      expect(t.scanner.status().connected).toBe(false);
    });
  });

  describe('status', () => {
    it('is asked fresh, not cached', async () => {
      const t = setup();
      const { pairing } = await startPairing(t);
      t.handles.get('scanner')?.emit('data', Buffer.from(PAIRING_REPORT));
      await pairing;
      expect(t.scanner.status().connected).toBe(true);
      t.setDevices([]);
      expect(t.scanner.status().connected).toBe(false);
      t.setDevices([device()]);
      expect(t.scanner.status().connected).toBe(true);
    });

    it('forget drops the pairing', async () => {
      const t = setup();
      await t.scanner.pairDevice(t.scanner.candidates()[0]?.key ?? '');
      await t.scanner.forget();
      expect(t.scanner.status()).toEqual({ paired: null, connected: false });
    });
  });
});

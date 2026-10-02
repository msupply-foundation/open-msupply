import { EventEmitter } from 'events';
import type { Device, HID } from 'node-hid';
import { HidScanner, PairedHidScanner } from './hidScanner';

// A stand-in for node-hid: devices are plain descriptors, and opening one
// hands back an emitter the test can push reports and errors through.
class FakeHandle extends EventEmitter {
  closed = false;
  close() {
    this.closed = true;
  }
}

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
  const refuse = new Set<string>();
  const reports: Uint8Array[] = [];
  const changed = jest.fn();

  const scanner = new HidScanner(
    {
      devices: () => devices,
      open: path => {
        if (refuse.has(path)) throw new Error('cannot open device');
        const handle = new FakeHandle();
        handles.set(path, handle);
        return handle as unknown as HID;
      },
    },
    { get: () => stored, set: s => (stored = s) },
    { report: bytes => reports.push(bytes), changed },
    { pairTimeoutMs: 1000 }
  );

  return {
    scanner,
    handles,
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

  describe('pairing by scan', () => {
    it('pairs the device that scans the pairing barcode, and closes the rest', async () => {
      const t = setup();
      const pairing = t.scanner.pair();
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
      expect([...t.handles.values()].every(h => h.closed)).toBe(true);
      expect(t.changed).toHaveBeenCalled();
    });

    it('pairs a scanner whatever its report framing', async () => {
      const t = setup();
      const pairing = t.scanner.pair();
      t.handles
        .get('scanner')
        ?.emit('data', Buffer.from(PAIRING_REPORT_OTHER_FRAMING));
      expect(await pairing).toMatchObject({
        ok: true,
        scanner: { name: 'Zebra DS2208' },
      });
    });

    // Each open device holds one of libuv's four pool threads until it
    // reports; sixteen opened on a Mac left the scanner's read unscheduled.
    it('opens only scanner interfaces, and at most three', () => {
      const scanners = [1, 2, 3, 4].map(n =>
        device({ vendorId: 0x100 + n, path: `scanner-${n}` })
      );
      const t = setup([dongle, ...scanners]);
      void t.scanner.pair();
      expect(t.handles.has('dongle')).toBe(false);
      expect([...t.handles.keys()]).toEqual(['scanner-1', 'scanner-2', 'scanner-3']);
      t.scanner.cancelPair();
    });

    // The bug that made a known code necessary: on a Mac, Apple's own
    // interfaces report constantly, and paired before anything was scanned.
    it('ignores devices reporting on their own, and any other barcode', async () => {
      const t = setup();
      const pairing = t.scanner.pair();
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
      void t.scanner.pair();
      expect(t.handles.has('keyboard')).toBe(false);
      expect(t.handles.has('mouse')).toBe(false);
      expect(t.handles.has('scanner')).toBe(true);
      t.scanner.cancelPair();
    });

    it('times out when nothing scans', async () => {
      const t = setup();
      const pairing = t.scanner.pair();
      jest.advanceTimersByTime(1000);
      expect(await pairing).toEqual({ ok: false, reason: 'timeout' });
      expect(t.stored()).toBeNull();
      expect([...t.handles.values()].every(h => h.closed)).toBe(true);
    });

    it('can be cancelled', async () => {
      const t = setup();
      const pairing = t.scanner.pair();
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
    it('drops every interface of a keyboard or mouse', () => {
      const trackpad = { vendorId: 0x05ac, productId: 0x0342, product: 'Trackpad' };
      const t = setup([
        device({ ...trackpad, path: 'tp-kbd', usagePage: 0x01, usage: 0x06 }),
        device({ ...trackpad, path: 'tp-vendor', interface: 2, usagePage: 0xff00, usage: 3 }),
        device(),
      ]);
      expect(t.scanner.candidates().map(c => c.name)).toEqual(['Zebra DS2208']);
      void t.scanner.pair();
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

    it('pairs the picked device without waiting for a scan', () => {
      const t = setup();
      const [picked] = t.scanner.candidates();
      expect(t.scanner.pairDevice(picked?.key ?? '')).toMatchObject({
        ok: true,
      });
      expect(t.stored()?.name).toBe('Zebra DS2208');
      expect(t.changed).toHaveBeenCalled();
    });

    it('refuses a device that has gone', () => {
      const t = setup();
      expect(t.scanner.pairDevice('nope')).toEqual({
        ok: false,
        reason: 'not-found',
      });
    });
  });

  describe('scanning', () => {
    const paired = async () => {
      const t = setup();
      const pairing = t.scanner.pair();
      t.handles.get('scanner')?.emit('data', Buffer.from(PAIRING_REPORT));
      await pairing;
      t.changed.mockClear();
      return t;
    };

    it('forwards reports verbatim once started', async () => {
      const t = await paired();
      expect(t.scanner.start()).toEqual({ ok: true });
      t.handles.get('scanner')?.emit('data', Buffer.from(REPORT));
      expect(t.reports).toEqual([Uint8Array.from(REPORT)]);
    });

    it('reopens the paired device on a later start, without doubling up', async () => {
      const t = await paired();
      t.scanner.start();
      t.scanner.start();
      t.handles.get('scanner')?.emit('data', Buffer.from(REPORT));
      expect(t.reports).toHaveLength(1);
    });

    it('closes the device on stop', async () => {
      const t = await paired();
      t.scanner.start();
      const handle = t.handles.get('scanner');
      t.scanner.stop();
      expect(handle?.closed).toBe(true);
      handle?.emit('data', Buffer.from(REPORT));
      expect(t.reports).toHaveLength(0);
    });

    it('finds the scanner again on another port', async () => {
      const t = await paired();
      t.setDevices([device({ path: 'scanner-moved' }), keyboard]);
      expect(t.scanner.start()).toEqual({ ok: true });
      expect(t.handles.has('scanner-moved')).toBe(true);
    });

    it('fails to start when nothing is paired', () => {
      const t = setup();
      expect(t.scanner.start()).toMatchObject({ ok: false });
    });

    it('fails to start when the paired scanner is unplugged', async () => {
      const t = await paired();
      t.setDevices([keyboard]);
      expect(t.scanner.start()).toMatchObject({ ok: false });
      expect(t.scanner.status().connected).toBe(false);
    });

    it('reports an unplug while armed', async () => {
      const t = await paired();
      t.scanner.start();
      t.setDevices([keyboard]);
      t.handles.get('scanner')?.emit('error', new Error('could not read'));
      expect(t.changed).toHaveBeenCalled();
      expect(t.scanner.status().connected).toBe(false);
    });
  });

  describe('status', () => {
    it('is asked fresh, not cached', async () => {
      const t = setup();
      const pairing = t.scanner.pair();
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
      t.scanner.pairDevice(t.scanner.candidates()[0]?.key ?? '');
      t.scanner.forget();
      expect(t.scanner.status()).toEqual({ paired: null, connected: false });
    });
  });
});

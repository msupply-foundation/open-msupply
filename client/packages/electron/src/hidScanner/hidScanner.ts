// A USB barcode scanner in HID (report) mode, read natively through node-hid,
// for the new front end (frontend/src/platform/barcodeSources/desktopHid.ts).
//
// Separate from the `Scanner` class in ../electron.ts, which serves the old
// front end and is left exactly as it is. That one cannot serve the new front
// end as-is:
//
//  - It pairs by matching the first 19 bytes of a report against one
//    scanner's framing of the "open mSupply" pairing barcode, so a scanner
//    that frames its reports any other way can never be paired. Here the
//    same barcode pairs whatever the framing: its text is looked for
//    anywhere in the report.
//  - It never reopens the paired device after a restart (findDevice runs in
//    the constructor before the stored device is read back), so the first arm
//    of every session throws.
//  - Every start() adds another 'data' listener without removing the last.
//  - It opens every HID device while pairing, keyboards and mice included,
//    and holds them for five seconds.
//
// What this hands over is the report, undecoded. Which bytes are the label is
// the reading layer's call (frontend/src/domain/barcode/hidReport.ts), exactly
// as for WebHID.
//
// Presence is asked, never polled. node-hid 2.x has no hotplug events, and
// enumerating is synchronous, so a timer would block the main process on a
// schedule to answer a question the page rarely asks. Instead status() and
// start() enumerate when called, and an unplug while armed arrives as the
// open handle's 'error'. A scanner re-plugged under an armed screen is
// therefore not picked up until the screen arms again — accepted, rather
// than paying for a poll.

import type { Device, HID } from 'node-hid';

/** The paired scanner, as remembered across restarts. */
export type PairedHidScanner = {
  vendorId: number;
  productId: number;
  // A scanner can expose several interfaces under one vendor/product id —
  // these pick out the one that sent the pairing scan.
  interface?: number;
  usagePage?: number;
  usage?: number;
  name: string;
};

export type HidScannerStatus = {
  paired: PairedHidScanner | null;
  /** The paired scanner is plugged in right now. */
  connected: boolean;
};

export type PairResult =
  | { ok: true; scanner: PairedHidScanner }
  | { ok: false; reason: 'timeout' | 'cancelled' | 'no-devices' | 'not-found' };

/**
 * A device that could be the scanner, for pairing by picking from a list —
 * the way in for a scanner that will not send a report until it is opened
 * some particular way, or when scanning to pair picks the wrong device.
 */
export type HidScannerCandidate = PairedHidScanner & {
  /** Stable for this listing only: pass it back to pairDevice(). */
  key: string;
  /** Advertises the bar-code scanner usage page — very likely the scanner. */
  scannerUsage: boolean;
};

export type StartResult = { ok: true } | { ok: false; message: string };

/** The slice of node-hid this uses, so tests can stand in for it. */
export type HidLibrary = {
  devices: () => Device[];
  open: (path: string) => HID;
};

export type HidScannerStore = {
  get: () => PairedHidScanner | null;
  set: (scanner: PairedHidScanner | null) => void;
};

/** What the scanner reports to the renderer. */
export type HidScannerEvents = {
  report: (bytes: Uint8Array) => void;
  /** Paired device or presence changed — ask for status again. */
  changed: () => void;
};

const PAIR_TIMEOUT_MS = 30_000;

/**
 * How many interfaces pairing opens at once — at most.
 *
 * node-hid 2.x reads each open device on a worker from libuv's thread pool
 * (4 threads unless UV_THREADPOOL_SIZE says otherwise), and a worker holds
 * its thread until that device reports. Pairing once opened sixteen devices
 * on a Mac: four quiet ones took every thread, the scanner's read was never
 * scheduled, and a beeping scanner paired nothing — while file writes and
 * everything else on the pool stalled too. Three leaves a thread free.
 */
const MAX_PAIRING_OPEN = 3;

/**
 * What the pairing barcode encodes — the barcode the old front end shows
 * (client/packages/host/src/Admin/omsupply-barcode.gif), and the new one
 * too (frontend/src/sections/settings/devices/omsupply-barcode.gif).
 *
 * A known code, rather than whichever device reports first, because plenty
 * of HID devices report on their own: on a Mac the trackpad and Apple's
 * vendor-defined interfaces stream reports constantly, and "first to
 * report" paired one of those before anything was scanned.
 */
const PAIRING_CODE = Array.from('open mSupply', c => c.charCodeAt(0));

/** Is the pairing code anywhere in this report? Framing is ignored. */
const carriesPairingCode = (bytes: Uint8Array): boolean => {
  for (let i = 0; i + PAIRING_CODE.length <= bytes.length; i++) {
    if (PAIRING_CODE.every((b, j) => bytes[i + j] === b)) return true;
  }
  return false;
};

/** The HID usage page for bar-code scanners (USB HID Point of Sale). */
const BARCODE_SCANNER_USAGE_PAGE = 0x8c;

// HID usage pages/usages (USB HID Usage Tables § Generic Desktop).
const GENERIC_DESKTOP = 0x01;
const MOUSE = 0x02;
const KEYBOARD = 0x06;
const KEYPAD = 0x07;

/**
 * Devices that are certainly not a scanner in report mode, and must not be
 * opened while pairing.
 *
 * On Windows — the only platform the desktop app is deployed on — this is a
 * precaution: hidapi opens devices shared, and the OS refuses to open a
 * keyboard or mouse at all. On macOS node-hid 2.x SEIZES whatever it opens
 * (hidapi's exclusive mode, which 2.x cannot turn off; node-hid 3.x's
 * `nonExclusive` option can), so a trackpad opened while pairing stops
 * working until pairing ends. That matters only for development on a Mac,
 * and is why every interface of a keyboard or mouse is left alone, not just
 * its input one. A scanner in keyboard
 * mode is exactly such a device, and is read as keystrokes instead
 * (frontend/src/platform/barcodeSources/keyboardWedge.ts).
 *
 * Where the platform does not report usages (Linux hidraw) nothing can be
 * excluded this way, and pairing relies on the OS refusing to open input
 * devices without permission — which it does by default.
 */
const isInputDevice = (device: Device): boolean =>
  device.usagePage === GENERIC_DESKTOP &&
  (device.usage === MOUSE ||
    device.usage === KEYBOARD ||
    device.usage === KEYPAD);

/**
 * Which physical device an interface belongs to. Vendor and product id,
 * except where the device reports none: on a Mac a dozen unrelated built-in
 * devices all say 0:0, and grouping them as one lumped the headset and the
 * Bluetooth module in with the internal keyboard. Those fall back to the OS
 * path, which macOS shares across one device's collections.
 */
const physicalId = (device: Device): string =>
  device.vendorId === 0 && device.productId === 0
    ? `path:${device.path}`
    : `${device.vendorId}:${device.productId}`;

const isScannerInterface = (device: Device): boolean =>
  device.usagePage === BARCODE_SCANNER_USAGE_PAGE;

/**
 * The interfaces that could be the scanner, with every interface of a
 * keyboard or mouse dropped — not just its keyboard/mouse interface. A Mac's
 * trackpad and a wireless mouse expose vendor-defined interfaces alongside
 * the input one, and those listed (and opened) as if they were devices of
 * their own. A device that ALSO has a bar-code scanner interface is kept:
 * some scanners expose a keyboard interface next to their report one.
 */
const possibleScannerInterfaces = (devices: Device[]): Device[] => {
  const physical = new Map<string, Device[]>();
  for (const device of devices) {
    const id = physicalId(device);
    physical.set(id, [...(physical.get(id) ?? []), device]);
  }
  return [...physical.values()].flatMap(interfaces =>
    interfaces.some(isInputDevice) && !interfaces.some(isScannerInterface)
      ? []
      : interfaces.filter(device => !isInputDevice(device))
  );
};

const nameOf = (device: Device): string =>
  [device.manufacturer, device.product].filter(Boolean).join(' ') ||
  `${device.vendorId.toString(16)}:${device.productId.toString(16)}`;

const describe = (device: Device): PairedHidScanner => ({
  vendorId: device.vendorId,
  productId: device.productId,
  interface: device.interface,
  usagePage: device.usagePage,
  usage: device.usage,
  name: nameOf(device),
});

const keyOf = (device: Device): string =>
  [
    device.vendorId,
    device.productId,
    device.interface,
    device.usagePage,
    device.usage,
  ].join(':');

const matches = (device: Device, scanner: PairedHidScanner): boolean =>
  device.vendorId === scanner.vendorId &&
  device.productId === scanner.productId &&
  (scanner.interface === undefined || device.interface === scanner.interface) &&
  (scanner.usagePage === undefined || device.usagePage === scanner.usagePage) &&
  (scanner.usage === undefined || device.usage === scanner.usage);

/**
 * A report worth treating as a scan: at least one printable byte. A report of
 * nothing but control bytes is the scanner saying something other than "here
 * is a barcode" — the same rule the WebHID source applies.
 */
const carriesData = (bytes: Uint8Array): boolean => bytes.some(b => b >= 0x20);

// isView rather than instanceof: node-hid hands over a Node Buffer, which is
// a Uint8Array of the main realm only — instanceof fails across realms.
const toBytes = (data: unknown): Uint8Array | undefined => {
  if (ArrayBuffer.isView(data)) {
    return Uint8Array.from(
      new Uint8Array(data.buffer, data.byteOffset, data.byteLength)
    );
  }
  if (Array.isArray(data)) return Uint8Array.from(data);
  return undefined;
};

const closeQuietly = (device: HID | undefined) => {
  try {
    device?.removeAllListeners();
    device?.close();
  } catch {
    // Already closed, or unplugged underneath us.
  }
};

export class HidScanner {
  private armed: HID | undefined;
  private pairing: { cancel: () => void } | undefined;

  constructor(
    private readonly hid: HidLibrary,
    private readonly store: HidScannerStore,
    private readonly events: HidScannerEvents,
    private readonly timing = { pairTimeoutMs: PAIR_TIMEOUT_MS }
  ) {}

  /**
   * Asked fresh every time: an armed handle is proof enough, otherwise look.
   * While pairing every candidate is held open, which does not hide it from
   * enumeration.
   */
  status(): HidScannerStatus {
    const paired = this.store.get();
    return {
      paired,
      connected:
        paired !== null &&
        (this.armed !== undefined || this.findPaired() !== undefined),
    };
  }

  /**
   * Every attached device that could be the scanner, likeliest first — ONE
   * entry per physical device, not per interface (a Mac's internal keyboard
   * and trackpad alone list eight). Each is represented by its bar-code
   * scanner interface where it has one, otherwise its first. The same
   * keyboard/mouse exclusion as pairing by scan.
   */
  candidates(): HidScannerCandidate[] {
    const physical = new Map<string, Device>();
    for (const device of possibleScannerInterfaces(this.devices())) {
      const id = physicalId(device);
      const current = physical.get(id);
      if (!current || (isScannerInterface(device) && !isScannerInterface(current))) {
        physical.set(id, device);
      }
    }
    return [...physical.values()]
      .map(device => ({
        ...describe(device),
        key: keyOf(device),
        scannerUsage: isScannerInterface(device),
      }))
      .sort((a, b) => Number(b.scannerUsage) - Number(a.scannerUsage));
  }

  /** Pair a device picked from candidates(), without waiting for a scan. */
  pairDevice(key: string): PairResult {
    this.cancelPair();
    this.stop();
    const device = possibleScannerInterfaces(this.devices()).find(
      d => keyOf(d) === key
    );
    if (!device) return { ok: false, reason: 'not-found' };
    const scanner = describe(device);
    this.store.set(scanner);
    this.events.changed();
    return { ok: true, scanner };
  }

  /**
   * Wait for the pairing barcode to be scanned, and pair whichever device
   * sent it.
   *
   * Only interfaces advertising the bar-code scanner usage page (HID POS)
   * are opened — the one mode whose reports the reading layer decodes
   * (frontend/src/domain/barcode/hidReport.ts) — and no more than
   * MAX_PAIRING_OPEN of them. A scanner reporting on any other page is
   * paired from the list instead. Of those opened, the one whose report
   * carries the pairing code is remembered and the rest are closed.
   */
  pair(): Promise<PairResult> {
    this.cancelPair();
    this.stop();

    const candidates = possibleScannerInterfaces(this.devices())
      .filter(device => device.path !== undefined && isScannerInterface(device))
      .slice(0, MAX_PAIRING_OPEN);
    const opened: { device: Device; handle: HID }[] = [];
    for (const device of candidates) {
      try {
        opened.push({ device, handle: this.hid.open(device.path as string) });
      } catch {
        // The OS would not hand it over — a device in use elsewhere, or one
        // this user may not open. Not a scanner we can use either way.
      }
    }
    if (opened.length === 0) {
      return Promise.resolve({ ok: false, reason: 'no-devices' });
    }

    return new Promise<PairResult>(resolve => {
      const finish = (result: PairResult) => {
        clearTimeout(timeout);
        this.pairing = undefined;
        opened.forEach(({ handle }) => closeQuietly(handle));
        resolve(result);
      };
      const timeout = setTimeout(
        () => finish({ ok: false, reason: 'timeout' }),
        this.timing.pairTimeoutMs
      );
      this.pairing = { cancel: () => finish({ ok: false, reason: 'cancelled' }) };

      for (const { device, handle } of opened) {
        handle.on('data', (data: unknown) => {
          const bytes = toBytes(data);
          if (!bytes || !carriesPairingCode(bytes) || !this.pairing) return;
          const scanner = describe(device);
          this.store.set(scanner);
          finish({ ok: true, scanner });
          this.events.changed();
        });
        // A device that errors while pairing (unplugged, or a read the OS
        // refuses) is simply not the scanner.
        handle.on('error', () => {
          closeQuietly(handle);
        });
      }
    });
  }

  cancelPair(): void {
    this.pairing?.cancel();
  }

  forget(): void {
    this.stop();
    this.store.set(null);
    this.events.changed();
  }

  /** Open the paired scanner and forward its reports until stop(). */
  start(): StartResult {
    this.stop();
    const paired = this.store.get();
    if (!paired) return { ok: false, message: 'no scanner paired' };
    const device = this.findPaired();
    if (!device?.path) {
      return { ok: false, message: 'paired scanner is not connected' };
    }

    let handle: HID;
    try {
      handle = this.hid.open(device.path);
    } catch (e) {
      return { ok: false, message: e instanceof Error ? e.message : String(e) };
    }

    handle.on('data', (data: unknown) => {
      const bytes = toBytes(data);
      if (bytes && carriesData(bytes)) this.events.report(bytes);
    });
    // node-hid raises 'error' when the device goes away mid-read. Without a
    // listener it becomes an uncaught exception, which ../electron.ts has to
    // swallow by message.
    handle.on('error', () => {
      if (this.armed !== handle) return;
      closeQuietly(handle);
      this.armed = undefined;
      this.events.changed();
    });
    this.armed = handle;
    return { ok: true };
  }

  /** Close the scanner, handing it back to the OS. Safe when not started. */
  stop(): void {
    closeQuietly(this.armed);
    this.armed = undefined;
  }

  dispose(): void {
    this.cancelPair();
    this.stop();
  }

  private devices(): Device[] {
    try {
      return this.hid.devices();
    } catch {
      return [];
    }
  }

  private findPaired(): Device | undefined {
    const paired = this.store.get();
    if (!paired) return undefined;
    return this.devices().find(device => matches(device, paired));
  }
}

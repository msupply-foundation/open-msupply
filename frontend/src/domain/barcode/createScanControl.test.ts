import {
  afterEach,
  beforeAll,
  afterAll,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { createRoot, createSignal } from 'solid-js';
import {
  refreshScanSources,
  scanOwner,
  setSourcesForTest,
  startListening,
  stopListening,
} from '@/platform/barcodeScanner';
import type {
  ScanHandlers,
  ScanOutcome,
  ScanSource,
} from '@/platform/barcodeSources/source';
import { setDictionaries, setLocale } from '@/intl/intl';
import commonEn from '@/intl/locales/en/common.json';
import { registeredActions } from '@/ui/utils/keyActions';
import {
  createScanControl,
  shownScanNotice,
  type ScanControlOptions,
  type ScanNoticeShown,
} from './createScanControl';
import type { ReadScan } from './readScan';

// The scan affordance's behaviour (spec/barcode-scanning/rules.md §
// Triggering a scan; ui-surface.md § R1 and § Notices), driven over fake
// sources through the real hardware layer. Test names lead with the
// OMS-REG-BAC-01 behaviours they cover (spec/barcode-scanning/cases).

// --- fake sources ------------------------------------------------------------

let handlers: ScanHandlers | undefined;
let listenResult: { ok: boolean; message?: string } = { ok: true };
let connected = true;

const continuous: ScanSource = {
  id: 'web-hid',
  displayName: () => 'continuous',
  continuous: true,
  available: async () => true,
  connected: () => connected,
  scanOnce: async () => ({ ok: false, cancelled: false, message: 'no' }),
  listen: async h => {
    if (listenResult.ok) handlers = h;
    return listenResult;
  },
  release: async () => {
    handlers = undefined;
  },
};

let nextOutcome: ScanOutcome = { ok: true, scan: { kind: 'text', text: 'X' } };
const oneShot: ScanSource = {
  id: 'camera',
  displayName: () => 'one-shot',
  continuous: false,
  available: async () => true,
  connected: () => connected,
  scanOnce: async () => nextOutcome,
  listen: async () => ({ ok: false, message: 'cannot stay armed' }),
  release: async () => {},
};

const emit = (text: string) => handlers?.onScan({ kind: 'text', text });

const useSources = async (sources: ScanSource[]) => {
  setSourcesForTest(sources);
  await refreshScanSources();
};

// Arming and scanning are async; let their promises settle.
const settle = () => new Promise(resolve => setTimeout(resolve, 0));

// --- harness -----------------------------------------------------------------

let disposeRoot: (() => void) | undefined;

const mount = (options: Partial<ScanControlOptions> = {}) => {
  const scans: ReadScan[] = [];
  const control = createRoot(dispose => {
    disposeRoot = dispose;
    return createScanControl({
      owner: 'test',
      onScan: scan => scans.push(scan),
      ...options,
    });
  });
  return { control, scans };
};

// .133: nothing about scanning is a keyboard action any more.
const scanActions = () =>
  registeredActions().filter(action => {
    const name =
      typeof action.name === 'function' ? action.name() : action.name;
    return /scan/i.test(name ?? '');
  });

beforeAll(() => {
  setDictionaries({ en: commonEn });
  setLocale('en');
});
afterAll(() => setDictionaries({}));

afterEach(async () => {
  disposeRoot?.();
  disposeRoot = undefined;
  await stopListening();
  await useSources([]);
  setSourcesForTest();
  handlers = undefined;
  listenResult = { ok: true };
  connected = true;
  nextOutcome = { ok: true, scan: { kind: 'text', text: 'X' } };
  vi.restoreAllMocks();
});

// --- tests -------------------------------------------------------------------

describe('where the device has no scanner', () => {
  it('.55 is unavailable — the affordance is hidden — and nothing listens', async () => {
    await useSources([]);
    const { control } = mount();
    await settle();
    expect(control.available()).toBe(false);
    expect(control.listening()).toBe(false);
    expect(control.inert()).toBe(true);
  });
});

describe('a hardware scanner (one that can stay armed)', () => {
  it('.130 listens from arrival, with nothing to press, and hands every scan up already read', async () => {
    await useSources([continuous]);
    const { control, scans } = mount();
    await settle();

    expect(control.needsPress()).toBe(false);
    expect(control.listening()).toBe(true);
    expect(scanOwner()).toBe('test');

    emit('05012345678900');
    emit(']d20105012345678900');
    expect(scans.map(scan => scan.kind)).toEqual(['raw', 'gs1']);
  });

  it('.130 a press does nothing — the scanner is not armed or disarmed from the app', async () => {
    await useSources([continuous]);
    const { control } = mount();
    await settle();
    await control.press();
    expect(control.listening()).toBe(true);
  });

  it('.130 field mode listens too, so a scan anywhere on the screen fills the field', async () => {
    await useSources([continuous]);
    const { control, scans } = mount({ mode: 'field' });
    await settle();
    expect(control.listening()).toBe(true);
    emit('ABC');
    expect(scans).toEqual([{ kind: 'raw', content: 'ABC' }]);
  });

  it('.130 starts listening once sources resolve after the screen opened', async () => {
    await useSources([]);
    const { control } = mount();
    await settle();
    expect(control.listening()).toBe(false);
    await useSources([continuous]);
    await settle();
    expect(control.listening()).toBe(true);
  });

  it('.131 a scanner configured but not connected does not listen, and says so', async () => {
    connected = false;
    await useSources([continuous]);
    const { control } = mount();
    await settle();
    expect(control.available()).toBe(true);
    expect(control.disconnected()).toBe(true);
    expect(control.listening()).toBe(false);
  });

  it('asks again on arrival where the scanner reads as not connected', async () => {
    connected = false;
    await useSources([continuous]);
    const available = vi.spyOn(continuous, 'available');
    mount();
    await settle();
    expect(available).toHaveBeenCalledOnce();
  });

  it('trusts a connected scanner without asking again', async () => {
    await useSources([continuous]);
    const available = vi.spyOn(continuous, 'available');
    mount();
    await settle();
    expect(available).not.toHaveBeenCalled();
  });

  it('.134 stops listening while the screen cannot use a scan, and listens again after', async () => {
    await useSources([continuous]);
    const [disabled, setDisabled] = createSignal(false);
    const { control, scans } = mount({ disabled });
    await settle();
    expect(control.listening()).toBe(true);

    setDisabled(true);
    expect(control.listening()).toBe(false);
    emit('dropped');
    expect(scans).toEqual([]);

    setDisabled(false);
    await settle();
    expect(control.listening()).toBe(true);
  });

  it('stops reading as listening once another screen takes the scan, and takes it back once released', async () => {
    await useSources([continuous]);
    const { control } = mount();
    await settle();

    const other = await startListening(() => {}, { label: 'elsewhere' });
    expect(control.listening()).toBe(false);
    expect(scanOwner()).toBe('elsewhere');

    if (other.ok) other.dispose();
    await settle();
    expect(control.listening()).toBe(true);
    expect(scanOwner()).toBe('test');
  });

  it('.58 leaving the screen stops its scanning', async () => {
    await useSources([continuous]);
    mount();
    await settle();
    expect(scanOwner()).toBe('test');

    disposeRoot?.();
    disposeRoot = undefined;
    await settle();
    expect(scanOwner()).toBeUndefined();
  });

  it('reports a failure to start listening in the status, and does not retry in a loop', async () => {
    listenResult = { ok: false, message: 'Failed to open the device.' };
    await useSources([continuous]);
    const listen = vi.spyOn(continuous, 'listen');
    const { control } = mount();
    await settle();
    await settle();
    expect(control.listening()).toBe(false);
    expect(control.startError()).toBe(
      'Unable to start scanning: web-hid: Failed to open the device.'
    );
    expect(control.notice()).toBeUndefined();
    expect(listen).toHaveBeenCalledTimes(1);
  });

  it('reports a reading that failed while listening, and clears it on the next good scan', async () => {
    await useSources([continuous]);
    const { control, scans } = mount();
    await settle();

    handlers?.onError?.({ message: 'undecodable key' });
    expect(control.notice()).toBe('Unable to read a barcode');

    emit('0123');
    expect(control.notice()).toBeUndefined();
    expect(scans).toHaveLength(1);
  });

  it('never asks a hardware scanner for a one-shot scan', async () => {
    await useSources([continuous]);
    const once = vi.spyOn(continuous, 'scanOnce');
    const { control } = mount({ mode: 'field' });
    await settle();
    await control.press();
    expect(once).not.toHaveBeenCalled();
  });
});

describe('a camera (one scan per press)', () => {
  it('.132 never listens, and each press asks for exactly one scan', async () => {
    await useSources([oneShot]);
    const { control, scans } = mount();
    await settle();
    expect(control.needsPress()).toBe(true);
    expect(control.listening()).toBe(false);
    expect(scanOwner()).toBeUndefined();

    nextOutcome = { ok: true, scan: { kind: 'text', text: 'ABC' } };
    await control.press();
    expect(scans).toEqual([{ kind: 'raw', content: 'ABC' }]);
  });

  it('.138 the field affordance is the same one scan per press', async () => {
    await useSources([oneShot]);
    const { control, scans } = mount({ mode: 'field' });
    await control.press();
    expect(scans).toHaveLength(1);
  });

  it('is silent when the user cancels', async () => {
    await useSources([oneShot]);
    const { control, scans } = mount();
    nextOutcome = { ok: false, cancelled: true };
    await control.press();
    expect(scans).toEqual([]);
    expect(control.notice()).toBeUndefined();
  });

  it('reports a failed scan inline', async () => {
    await useSources([oneShot]);
    const { control } = mount();
    nextOutcome = { ok: false, cancelled: false, message: 'camera busy' };
    await control.press();
    expect(control.notice()).toBe('Unable to scan barcode: camera busy');
  });

  it('is inert while the screen cannot use a scan', async () => {
    await useSources([oneShot]);
    const once = vi.spyOn(oneShot, 'scanOnce');
    const { control } = mount({ disabled: () => true });
    expect(control.inert()).toBe(true);
    await control.press();
    expect(once).not.toHaveBeenCalled();
  });

  it('a scan still open when the screen goes away is cancelled, not left waiting', async () => {
    let release: (() => void) | undefined;
    const slow: ScanSource = {
      ...oneShot,
      scanOnce: () => new Promise<ScanOutcome>(() => {}),
      release: async () => release?.(),
    };
    const released = new Promise<void>(resolve => (release = resolve));
    await useSources([slow]);
    const { control } = mount();
    const pending = control.press();
    expect(control.busy()).toBe(true);
    disposeRoot?.();
    disposeRoot = undefined;
    await pending;
    await released;
  });
});

describe('the keyboard', () => {
  it('.133 registers no scanning shortcut or palette action', async () => {
    await useSources([continuous]);
    mount();
    await settle();
    expect(scanActions()).toEqual([]);
  });
});

describe('the notice a scanning screen shows', () => {
  it("puts the control's failure, as an error, ahead of the screen's own", () => {
    const [failure, setFailure] = createSignal<string>();
    const [own, setOwn] = createSignal<ScanNoticeShown>();
    const shown = shownScanNotice({ notice: failure }, own);
    expect(shown()).toBeUndefined();

    setOwn({ severity: 'warning', text: 'code not learned' });
    expect(shown()).toEqual({ severity: 'warning', text: 'code not learned' });

    setFailure('Unable to read barcode');
    expect(shown()).toEqual({
      severity: 'error',
      text: 'Unable to read barcode',
    });

    setFailure(undefined);
    expect(shown()).toEqual({ severity: 'warning', text: 'code not learned' });
  });
});

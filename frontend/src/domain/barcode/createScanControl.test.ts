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
import { CTRL_S } from '@/ui/utils/shortcuts';
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

const scanAction = () =>
  registeredActions().find(action => action.shortcut === CTRL_S);

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
  it('.55 is unavailable — the affordance is hidden — and Ctrl+S is inert', async () => {
    await useSources([]);
    const { control } = mount();
    expect(control.available()).toBe(false);
    expect(control.inert()).toBe(true);
    expect(scanAction()?.disabled?.()).toBe(true);
  });
});

describe('a scanner that is present but not connected', () => {
  it('.56 is shown disabled with a reason, and never arms', async () => {
    connected = false;
    await useSources([continuous]);
    const { control } = mount();
    await settle();
    expect(control.available()).toBe(true);
    expect(control.disconnected()).toBe(true);
    expect(control.inert()).toBe(true);
    expect(control.listening()).toBe(false);
  });
});

describe('page mode, scanner can stay armed', () => {
  it('.57 arms on arrival and hands every scan up already read', async () => {
    await useSources([continuous]);
    const { control, scans } = mount();
    await settle();

    expect(control.listening()).toBe(true);
    expect(control.label()).toBe('Ready to scan…');
    expect(scanOwner()).toBe('test');

    emit('05012345678900');
    emit(']d20105012345678900');
    expect(scans.map(scan => scan.kind)).toEqual(['raw', 'gs1']);
  });

  it('.57 a press disarms, and the next arms again', async () => {
    await useSources([continuous]);
    const { control, scans } = mount();
    await settle();

    await control.press();
    expect(control.listening()).toBe(false);
    expect(control.label()).toBe('Scan');
    emit('dropped');
    expect(scans).toEqual([]);

    await control.press();
    expect(control.listening()).toBe(true);
  });

  it('does not arm on arrival where the screen opts out (the equipment register)', async () => {
    await useSources([continuous]);
    const { control } = mount({ armOnArrival: false });
    await settle();
    expect(control.listening()).toBe(false);
    await control.press();
    expect(control.listening()).toBe(true);
  });

  it('Ctrl+S is the same press, named by the current label', async () => {
    await useSources([continuous]);
    const { control } = mount();
    await settle();

    const action = scanAction();
    expect(action?.disabled?.()).toBe(false);
    expect(typeof action?.name === 'function' && action.name()).toBe(
      'Ready to scan…'
    );
    action?.run();
    await settle();
    expect(control.listening()).toBe(false);
  });

  it('stops reading as armed once another screen takes the scan', async () => {
    await useSources([continuous]);
    const { control } = mount();
    await settle();

    await startListening(() => {}, { label: 'elsewhere' });
    expect(control.listening()).toBe(false);
    expect(control.label()).toBe('Scan');
  });

  it('disarms when the screen stops being editable, and stays inert', async () => {
    await useSources([continuous]);
    const [disabled, setDisabled] = createSignal(false);
    const { control } = mount({ disabled });
    await settle();
    expect(control.listening()).toBe(true);

    setDisabled(true);
    expect(control.listening()).toBe(false);
    expect(control.inert()).toBe(true);
    expect(scanAction()?.disabled?.()).toBe(true);
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
    expect(scanAction()).toBeUndefined();
  });

  it('reports a failure to arm inline', async () => {
    listenResult = { ok: false, message: 'Failed to open the device.' };
    await useSources([continuous]);
    const { control } = mount();
    await settle();
    expect(control.listening()).toBe(false);
    expect(control.notice()).toBe(
      'Unable to start scanning: web-hid: Failed to open the device.'
    );
  });

  it('reports a reading that failed while armed, and clears it on the next good scan', async () => {
    await useSources([continuous]);
    const { control, scans } = mount();
    await settle();

    handlers?.onError?.({ message: 'undecodable key' });
    expect(control.notice()).toBe('Unable to read a barcode');

    emit('0123');
    expect(control.notice()).toBeUndefined();
    expect(scans).toHaveLength(1);
  });
});

describe('page mode, one scan per press', () => {
  it('never arms, and each press asks for exactly one scan', async () => {
    await useSources([oneShot]);
    const { control, scans } = mount();
    await settle();
    expect(control.listening()).toBe(false);

    nextOutcome = { ok: true, scan: { kind: 'text', text: 'ABC' } };
    await control.press();
    expect(scans).toEqual([{ kind: 'raw', content: 'ABC' }]);
    expect(control.listening()).toBe(false);
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
});

describe('field mode', () => {
  it('never arms, even where the scanner could stay armed', async () => {
    await useSources([continuous, oneShot]);
    const { control } = mount({ mode: 'field' });
    await settle();
    expect(control.listening()).toBe(false);
    expect(scanOwner()).toBeUndefined();
  });

  it('is disabled while another screen holds the armed scanner', async () => {
    await useSources([continuous]);
    const { control } = mount({ mode: 'field' });
    await startListening(() => {}, { label: 'elsewhere' });
    expect(control.armedElsewhere()).toBe(true);
    expect(control.inert()).toBe(true);
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

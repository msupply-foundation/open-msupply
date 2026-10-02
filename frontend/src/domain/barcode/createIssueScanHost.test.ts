import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { createRoot, createSignal } from 'solid-js';
import { setDictionaries, setLocale } from '@/intl/intl';
import commonEn from '@/intl/locales/en/common.json';
import type { IssueScan } from './issueScan';
import type { ReadScan } from './readScan';

// The screen side of issuing by scanning (spec/barcode-scanning/rules.md §
// Issuing by scanning), shared by the outbound shipment and the
// dispensing record. The scan control and the lookup are stubbed: what is
// under test is where a scan goes. Test names lead with the OMS-REG-BAC-01
// behaviours they cover.

let onScan: ((scan: ReadScan) => void) | undefined;
vi.mock('./createScanControl', () => ({
  createScanControl: (options: { onScan: (scan: ReadScan) => void }) => {
    onScan = options.onScan;
    return { notice: () => undefined };
  },
  shownScanNotice:
    (
      _control: unknown,
      screen: () => { severity: string; text: string } | undefined
    ) =>
    () =>
      screen(),
}));

type Pending = {
  resolve: (scan: IssueScan | undefined) => void;
  options: unknown;
};
const pending: Pending[] = [];
vi.mock('./issueScan', () => ({
  resolveIssueScan: (_storeId: string, _scan: ReadScan, options: unknown) =>
    new Promise<IssueScan | undefined>(resolve =>
      pending.push({ resolve, options })
    ),
}));

const { createIssueScanHost } = await import('./createIssueScanHost');

const READ: ReadScan = { kind: 'raw', text: 'X', raw: 'X' } as never;
const ITEM_SCAN: IssueScan = {
  code: '4006381333931',
  known: false,
  item: { id: 'i1', code: 'PARA', name: 'Paracetamol' },
};
const settle = () => new Promise(resolve => setTimeout(resolve, 0));

let dispose: (() => void) | undefined;
const mount = (masterListId?: string) => {
  const [editorOpen, setEditorOpen] = createSignal(false);
  const [disabled, setDisabled] = createSignal(false);
  const opened: IssueScan[] = [];
  const host = createRoot(d => {
    dispose = d;
    return createIssueScanHost({
      owner: 'test',
      storeId: () => 'store',
      disabled,
      editorOpen,
      openEditor: scan => {
        opened.push(scan);
        setEditorOpen(true);
      },
      masterListId: () => masterListId,
    });
  });
  return { host, opened, setEditorOpen, setDisabled };
};

beforeAll(() => {
  setDictionaries({ en: commonEn });
  setLocale('en');
});
afterAll(() => setDictionaries({}));
afterEach(() => {
  dispose?.();
  pending.length = 0;
  onScan = undefined;
});

describe('createIssueScanHost', () => {
  it('.42 a scan with the editor closed opens it on the resolved scan', async () => {
    const { opened } = mount();
    onScan?.(READ);
    pending[0].resolve(ITEM_SCAN);
    await settle();
    expect(opened).toEqual([ITEM_SCAN]);
  });

  it('.169 the lookup is scoped like the editor search', () => {
    mount('program-1');
    onScan?.(READ);
    expect(pending[0].options).toMatchObject({ masterListId: 'program-1' });
  });

  it('.200 a scan while an earlier one is being looked up is dropped and said', async () => {
    const { host, opened } = mount();
    onScan?.(READ);
    onScan?.(READ);
    expect(pending).toHaveLength(1);
    expect(host.discarded()).toBe(false);
    expect(host.noticeShown()?.text).toBe(
      commonEn['messages.scan-still-working']
    );
    pending[0].resolve(ITEM_SCAN);
    await settle();
    expect(opened).toHaveLength(1);
  });

  it('.213 a scan into an editor that already has an item is discarded, and told inside it', () => {
    const { host, setEditorOpen } = mount();
    setEditorOpen(true);
    onScan?.(READ);
    expect(pending).toHaveLength(0);
    expect(host.discarded()).toBe(true);
    // Inside the editor, not the toolbar, while it is open.
    expect(host.noticeShown()).toBeUndefined();
    host.editorClosed();
    expect(host.discarded()).toBe(false);
  });

  it('.192 a batch label into an editor open on an item narrows it, with no lookup', () => {
    const { host, setEditorOpen } = mount();
    setEditorOpen(true);
    const batches: string[] = [];
    host.setBatchLabelReceiver(batch => batches.push(batch));
    onScan?.({
      kind: 'gs1',
      content: '',
      elements: [
        { ai: '17', data: '280630' },
        { ai: '10', data: 'LOT9' },
      ],
    });
    expect(batches).toEqual(['LOT9']);
    expect(pending).toHaveLength(0);
    expect(host.discarded()).toBe(false);
  });

  it('.213 a scan with a code into an editor open on an item is still discarded', () => {
    const { host, setEditorOpen } = mount();
    setEditorOpen(true);
    const batches: string[] = [];
    host.setBatchLabelReceiver(batch => batches.push(batch));
    onScan?.({
      kind: 'gs1',
      content: '',
      elements: [
        { ai: '01', data: '05012345678900' },
        { ai: '10', data: 'LOT9' },
      ],
    });
    expect(batches).toEqual([]);
    expect(host.discarded()).toBe(true);
  });

  it('.167 a scan while the editor waits for an item is handed to it', async () => {
    const { host, opened, setEditorOpen } = mount();
    setEditorOpen(true);
    const received: IssueScan[] = [];
    host.setReceiver(scan => received.push(scan));
    onScan?.(READ);
    pending[0].resolve(ITEM_SCAN);
    await settle();
    expect(received).toEqual([ITEM_SCAN]);
    expect(opened).toEqual([]);
    expect(host.discarded()).toBe(false);
  });

  it('.167 an editor that took an item while the lookup ran discards the scan', async () => {
    const { host, setEditorOpen } = mount();
    setEditorOpen(true);
    const received: IssueScan[] = [];
    host.setReceiver(scan => received.push(scan));
    onScan?.(READ);
    host.setReceiver(undefined);
    pending[0].resolve(ITEM_SCAN);
    await settle();
    expect(received).toEqual([]);
    expect(host.discarded()).toBe(true);
  });

  it('a waiting editor clears an earlier discard', () => {
    const { host, setEditorOpen } = mount();
    setEditorOpen(true);
    onScan?.(READ);
    expect(host.discarded()).toBe(true);
    host.setReceiver(() => {});
    expect(host.discarded()).toBe(false);
  });

  it('a failed lookup opens nothing', async () => {
    const { opened } = mount();
    onScan?.(READ);
    pending[0].resolve(undefined);
    await settle();
    expect(opened).toEqual([]);
  });

  it('a screen that became unusable while the lookup ran opens nothing', async () => {
    const { opened, setDisabled } = mount();
    onScan?.(READ);
    setDisabled(true);
    pending[0].resolve(ITEM_SCAN);
    await settle();
    expect(opened).toEqual([]);
  });
});

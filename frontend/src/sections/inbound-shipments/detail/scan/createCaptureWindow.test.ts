import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { createRoot } from 'solid-js';
import type { GraphqlResult } from '@/api/graphql';
import { readText } from '@/domain/barcode';
import { setDictionaries, setLocale } from '@/intl/intl';
import commonEn from '@/intl/locales/en/common.json';

// The capture window's sequencing (spec/barcode-scanning/rules.md § Learning
// a code while receiving) over a stubbed transport: which requests a scan
// fires, in which order, and what a refused or failed save leaves behind.

type Call = { operation: string; variables: unknown };
const calls: Call[] = [];
let answers: Record<string, GraphqlResult<unknown>> = {};

vi.mock('@/api/graphql', async importOriginal => {
  const actual = await importOriginal<typeof import('@/api/graphql')>();
  return {
    ...actual,
    graphqlFetch: (document: { query: string }, variables: unknown) => {
      const operation =
        /(query|mutation)\s+(\w+)/.exec(document.query)?.[2] ?? 'anonymous';
      calls.push({ operation, variables });
      // A save goes on to propose the barcode; that answer rarely matters.
      const answer =
        answers[operation] ??
        (operation === 'proposeBarcode'
          ? { kind: 'success', data: { proposeBarcode: {} } }
          : undefined);
      if (!answer) throw new Error(`no stubbed answer for ${operation}`);
      return Promise.resolve(answer);
    },
  };
});

const { createCaptureWindow } = await import('./createCaptureWindow');

const GS = '\u001d';
const GTIN = '05012345678900';
const OTHER = '05012345678917';
const scanOf = (text: string) => {
  const read = readText(text);
  if (read.kind === 'unreadable') throw new Error('unreadable');
  return read;
};
const LABEL = scanOf(`01${GTIN}10AB12${GS}17271231`);
const NEXT = scanOf(`01${OTHER}10CD34`);

const known = {
  kind: 'success',
  data: {
    barcodeMatches: [
      {
        __typename: 'BarcodeMatchNode',
        id: 'b1',
        value: `gtin:${GTIN.padStart(14, '0')}`,
        barcode: GTIN,
        itemId: 'item-1',
        packSize: null,
        status: 'PROPOSED',
      },
    ],
  },
} as const;

const unknown = {
  kind: 'success',
  data: { barcodeMatches: [] },
} as const;

const item = {
  kind: 'success',
  data: {
    items: {
      __typename: 'ItemConnector',
      totalCount: 1,
      nodes: [
        {
          id: 'item-1',
          code: 'PARA',
          name: 'Paracetamol',
          unitName: 'Tab',
          isVaccine: false,
          doses: 1,
          defaultPackSize: 1,
          itemStoreProperties: { defaultSellPricePerPack: 0 },
          availableBatches: { nodes: [] },
        },
      ],
    },
  },
} as const;

const noLines = {
  kind: 'success',
  data: {
    invoiceLines: {
      __typename: 'InvoiceLineConnector',
      totalCount: 0,
      nodes: [],
    },
  },
} as const;

const batchSaved = {
  kind: 'success',
  data: {
    batchInboundShipment: {
      __typename: 'BatchInboundShipmentResponse',
      insertInboundShipmentLines: [
        { id: 'x', response: { __typename: 'InvoiceLineNode', id: 'x' } },
      ],
    },
  },
} as const;

const setup = (blocked = false) =>
  createRoot(dispose => {
    const onSaved = vi.fn();
    const onNotice = vi.fn();
    const capture = createCaptureWindow({
      storeId: () => 'store',
      invoiceId: () => 'inv',
      isExternal: () => false,
      blocked: () => blocked,
      onSaved,
      onNotice,
    });
    return { capture, onSaved, onNotice, dispose };
  });

const operations = () => calls.map(c => c.operation);

beforeAll(() => {
  setDictionaries({ en: commonEn });
  setLocale('en');
  // Focus requests land on the next frame; there is no DOM to land on here.
  vi.stubGlobal('requestAnimationFrame', () => 0);
  vi.stubGlobal('cancelAnimationFrame', () => undefined);
});
afterAll(() => {
  setDictionaries({});
  vi.unstubAllGlobals();
});

beforeEach(() => {
  calls.length = 0;
  answers = {};
});

describe('createCaptureWindow', () => {
  it('.31 a known code opens the window on its item, locked', async () => {
    answers = {
      barcodeMatches: known,
      itemsWithStock: item,
      inboundShipmentLines: noLines,
    };
    const { capture, dispose } = setup();
    await capture.receive(LABEL);
    expect(capture.open()).toBe(true);
    expect(capture.draft()?.item?.id).toBe('item-1');
    expect(capture.draft()?.itemLocked).toBe(true);
    expect(operations()).toEqual([
      'barcodeMatches',
      'itemsWithStock',
      'inboundShipmentLines',
    ]);
    dispose();
  });

  it('.37 .25 scanning on saves the line with its barcode, then loads the next', async () => {
    answers = { barcodeMatches: unknown };
    const { capture, onSaved, dispose } = setup();
    await capture.receive(LABEL);
    answers = {
      barcodeMatches: unknown,
      itemsWithStock: item,
      inboundShipmentLines: noLines,
      batchInboundShipment: batchSaved,
    };
    capture.pickItem({
      id: 'item-1',
      code: 'PARA',
      name: 'Paracetamol',
      unitName: 'Tab',
      availableUnits: 0,
      isVaccine: false,
      doses: 1,
      isService: false,
      defaultPackSize: 1,
      defaultSellPricePerPack: 0,
      volumePerPack: 0,
    });
    capture.update({ quantity: 3 });
    calls.length = 0;
    await capture.receive(NEXT);
    // The barcode goes with the new line, then is proposed for its item.
    expect(operations().slice(0, 3)).toEqual([
      'batchInboundShipment',
      'proposeBarcode',
      'barcodeMatches',
    ]);
    expect(calls[0]?.variables).toMatchObject({
      input: {
        insertInboundShipmentLines: [{ itemId: 'item-1', barcode: GTIN }],
      },
    });
    expect(calls[1]?.variables).toMatchObject({
      input: { barcode: GTIN, itemId: 'item-1' },
    });
    expect(onSaved).toHaveBeenCalledOnce();
    expect(capture.draft()?.batch).toBe('CD34');
    expect(capture.savedNotice()).toBe('Line saved');
    dispose();
  });

  it('.198 scanning on with the quantity still zero saves a placeholder line', async () => {
    answers = {
      barcodeMatches: known,
      itemsWithStock: item,
      inboundShipmentLines: noLines,
      batchInboundShipment: batchSaved,
    };
    const { capture, onSaved, dispose } = setup();
    await capture.receive(LABEL);
    calls.length = 0;
    await capture.receive(NEXT);
    expect(calls[0]?.operation).toBe('batchInboundShipment');
    expect(calls[0]?.variables).toMatchObject({
      input: { insertInboundShipmentLines: [{ numberOfPacks: 0 }] },
    });
    expect(onSaved).toHaveBeenCalledOnce();
    expect(capture.draft()?.batch).toBe('CD34');
    dispose();
  });

  it('.38 scanning on with no item chosen is refused', async () => {
    answers = { barcodeMatches: unknown };
    const { capture, dispose } = setup();
    await capture.receive(LABEL);
    capture.update({ quantity: 2 });
    await capture.receive(NEXT);
    expect(capture.refusal()).toMatch(/No item selected/);
    expect(capture.draft()?.batch).toBe('AB12');
    dispose();
  });

  it('.201 a failed automatic save is reported, the entry kept, and the incoming scan dropped', async () => {
    answers = {
      barcodeMatches: known,
      itemsWithStock: item,
      inboundShipmentLines: noLines,
    };
    const { capture, onSaved, dispose } = setup();
    await capture.receive(LABEL);
    capture.update({ quantity: 2 });
    answers.batchInboundShipment = {
      kind: 'success',
      data: {
        batchInboundShipment: {
          __typename: 'BatchInboundShipmentResponse',
          insertInboundShipmentLines: [
            {
              id: 'x',
              response: {
                __typename: 'InsertInboundShipmentLineError',
                error: {
                  __typename: 'CannotEditInvoice',
                  description: 'Cannot edit invoice',
                },
              },
            },
          ],
        },
      },
    };
    await capture.receive(NEXT);
    expect(capture.refusal()).toBe(
      'Unable to auto save line, please try again. Cannot edit invoice'
    );
    expect(capture.draft()?.batch).toBe('AB12');
    expect(onSaved).not.toHaveBeenCalled();
    dispose();
  });

  it('.41 a scan while another editing window is open is dropped with a notice', async () => {
    const { capture, onNotice, dispose } = setup(true);
    await capture.receive(LABEL);
    expect(calls).toEqual([]);
    expect(capture.open()).toBe(false);
    expect(onNotice).toHaveBeenCalledWith({
      severity: 'warning',
      text: 'Close the line editor to scan.',
    });
    // Said in the editing window too, until it closes.
    expect(capture.discarded()).toBe(true);
    capture.editorClosed();
    expect(capture.discarded()).toBe(false);
    dispose();
  });

  it('.200 a scan arriving mid-lookup is dropped with a notice', async () => {
    answers = {
      barcodeMatches: known,
      itemsWithStock: item,
      inboundShipmentLines: noLines,
      batchInboundShipment: batchSaved,
    };
    const { capture, onSaved, onNotice, dispose } = setup();
    // The second scan lands while the first is still being looked up.
    const first = capture.receive(LABEL);
    const second = capture.receive(NEXT);
    await Promise.all([first, second]);
    expect(onNotice).toHaveBeenCalledWith({
      severity: 'warning',
      text: 'Still working on the last scan. Scan that box again.',
    });
    expect(capture.draft()?.batch).toBe('AB12');
    expect(onSaved).not.toHaveBeenCalled();
    dispose();
  });

  it('.200 a scan arriving mid-save is dropped, said in the window', async () => {
    answers = {
      barcodeMatches: known,
      itemsWithStock: item,
      inboundShipmentLines: noLines,
      batchInboundShipment: batchSaved,
    };
    const { capture, dispose } = setup();
    await capture.receive(LABEL);
    const saving = capture.receive(NEXT);
    await capture.receive(LABEL);
    expect(capture.dropped()).toBe(true);
    await saving;
    expect(capture.draft()?.batch).toBe('CD34');
    // Saving the entry before and loading the next one don't take the
    // notice with them: the dropped box still needs scanning again.
    expect(capture.dropped()).toBe(true);
    // The next scan taken is the user acting on it.
    await capture.receive(LABEL);
    expect(capture.dropped()).toBe(false);
    dispose();
  });

  it('.200 a scan dropped while OK saves is said on the screen once the window closes', async () => {
    answers = {
      barcodeMatches: known,
      itemsWithStock: item,
      inboundShipmentLines: noLines,
      batchInboundShipment: batchSaved,
    };
    const { capture, onNotice, dispose } = setup();
    await capture.receive(LABEL);
    const ok = capture.confirm();
    await capture.receive(NEXT);
    await ok;
    expect(capture.open()).toBe(false);
    expect(onNotice).toHaveBeenCalledWith({
      severity: 'warning',
      text: 'Still working on the last scan. Scan that box again.',
    });
    dispose();
  });

  it('.200 a scan arriving while OK saves is dropped, and the line saved once', async () => {
    answers = {
      barcodeMatches: known,
      itemsWithStock: item,
      inboundShipmentLines: noLines,
      batchInboundShipment: batchSaved,
    };
    const { capture, onSaved, dispose } = setup();
    await capture.receive(LABEL);
    calls.length = 0;
    const ok = capture.confirm();
    await capture.receive(NEXT);
    await ok;
    expect(operations().filter(op => op === 'batchInboundShipment')).toEqual([
      'batchInboundShipment',
    ]);
    expect(onSaved).toHaveBeenCalledOnce();
    expect(capture.open()).toBe(false);
    dispose();
  });

  it(".176 OK before the item's lines arrive still adds to the matching line", async () => {
    let release!: () => void;
    const lines = new Promise(resolve => {
      release = () =>
        resolve({
          kind: 'success',
          data: {
            invoiceLines: {
              __typename: 'InvoiceLineConnector',
              totalCount: 1,
              nodes: [
                {
                  id: 'line-1',
                  batch: 'AB12',
                  packSize: 1,
                  numberOfPacks: 5,
                  barcode: GTIN,
                  expiryDate: '2027-12-31',
                  manufactureDate: null,
                },
              ],
            },
          },
        });
    });
    answers = {
      barcodeMatches: known,
      itemsWithStock: item,
      // A pending answer: the lines are still on their way when OK lands.
      inboundShipmentLines: lines as unknown as GraphqlResult<unknown>,
      batchInboundShipment: batchSaved,
    };
    const { capture, dispose } = setup();
    await capture.receive(LABEL);
    capture.update({ quantity: 2 });
    const ok = capture.confirm();
    release();
    await ok;
    const save = calls.find(c => c.operation === 'batchInboundShipment');
    expect(save?.variables).toMatchObject({
      input: {
        updateInboundShipmentLines: [{ id: 'line-1', numberOfPacks: 7 }],
      },
    });
    dispose();
  });

  it('.67 a label without an item number opens without a lookup', async () => {
    const { capture, dispose } = setup();
    await capture.receive(scanOf(`${GS}10AB12${GS}17271231`));
    expect(calls).toEqual([]);
    expect(capture.open()).toBe(true);
    expect(capture.draft()?.batch).toBe('AB12');
    dispose();
  });

  it('.38 confirming an entry with no item keeps the window open', async () => {
    answers = { barcodeMatches: unknown };
    const { capture, dispose } = setup();
    await capture.receive(LABEL);
    await capture.confirm();
    expect(capture.open()).toBe(true);
    dispose();
  });

  it('.186 .206 a batch label fills the entry on screen without saving', async () => {
    answers = {
      barcodeMatches: known,
      itemsWithStock: item,
      inboundShipmentLines: noLines,
    };
    const { capture, onSaved, dispose } = setup();
    await capture.receive(scanOf(`01${GTIN}`));
    capture.update({ quantity: 4 });
    calls.length = 0;
    await capture.receive(scanOf(`10LOT9${GS}17280630`));
    expect(calls).toEqual([]);
    expect(onSaved).not.toHaveBeenCalled();
    expect(capture.refusal()).toBeUndefined();
    expect(capture.draft()).toMatchObject({
      item: { id: 'item-1' },
      itemLocked: true,
      batch: 'LOT9',
      expiryDate: '2028-06-30',
      quantity: 4,
      barcode: GTIN,
    });
    dispose();
  });

  it('.186 a batch label fills the entry after a refused scan-on', async () => {
    answers = { barcodeMatches: unknown };
    const { capture, dispose } = setup();
    await capture.receive(scanOf(`01${GTIN}`));
    await capture.receive(NEXT);
    expect(capture.refusal()).toMatch(/No item selected/);
    await capture.receive(scanOf(`17280630${GS}10LOT9`));
    expect(capture.draft()?.batch).toBe('LOT9');
    dispose();
  });

  it('.188 .189 a batch label opens the window, and a product scanned next fills in its item', async () => {
    answers = { barcodeMatches: known };
    const { capture, dispose } = setup();
    await capture.receive(scanOf(`17280630${GS}10LOT9${GS}305`));
    expect(calls).toEqual([]);
    expect(capture.draft()).toMatchObject({
      item: undefined,
      batch: 'LOT9',
      quantity: 5,
    });
    answers = {
      barcodeMatches: known,
      itemsWithStock: item,
      inboundShipmentLines: noLines,
    };
    await capture.receive(scanOf(`01${GTIN}`));
    expect(operations()).not.toContain('batchInboundShipment');
    expect(capture.refusal()).toBeUndefined();
    expect(capture.draft()).toMatchObject({
      item: { id: 'item-1' },
      itemLocked: true,
      batch: 'LOT9',
      expiryDate: '2028-06-30',
      quantity: 5,
      barcode: GTIN,
    });
    dispose();
  });

  it('.202 a plain code that matches nothing is a notice on the screen, not a window', async () => {
    answers = { barcodeMatches: unknown };
    const { capture, onNotice, dispose } = setup();
    await capture.receive(scanOf('SHIP-0042'));
    expect(operations()).toEqual(['barcodeMatches']);
    expect(capture.open()).toBe(false);
    expect(onNotice).toHaveBeenCalledWith({
      severity: 'info',
      text: 'Barcode not recognised. Scan again, or use Add item to add it by hand.',
    });
    dispose();
  });

  it('.202 a known code scanned after the notice opens its entry', async () => {
    answers = { barcodeMatches: unknown };
    const { capture, onSaved, dispose } = setup();
    await capture.receive(scanOf('SHIP-0042'));
    answers = {
      barcodeMatches: known,
      itemsWithStock: item,
      inboundShipmentLines: noLines,
    };
    await capture.receive(LABEL);
    expect(operations()).not.toContain('batchInboundShipment');
    expect(onSaved).not.toHaveBeenCalled();
    expect(capture.savedNotice()).toBeUndefined();
    expect(capture.unrecognised()).toBeUndefined();
    expect(capture.draft()?.item?.id).toBe('item-1');
    dispose();
  });

  it('.195 an unrecognised scan leaves the entry on screen unsaved', async () => {
    answers = {
      barcodeMatches: known,
      itemsWithStock: item,
      inboundShipmentLines: noLines,
    };
    const { capture, onSaved, dispose } = setup();
    await capture.receive(LABEL);
    capture.update({ quantity: 3 });
    answers = { barcodeMatches: unknown };
    calls.length = 0;
    await capture.receive(scanOf('SHIP-0042'));
    expect(operations()).toEqual(['barcodeMatches']);
    expect(onSaved).not.toHaveBeenCalled();
    expect(capture.refusal()).toBeUndefined();
    expect(capture.unrecognised()).toBe('SHIP-0042');
    expect(capture.draft()).toMatchObject({
      item: { id: 'item-1' },
      batch: 'AB12',
      quantity: 3,
    });
    dispose();
  });

  it('a plain code the lookup knows saves the entry on screen and opens, looked up once', async () => {
    answers = {
      barcodeMatches: known,
      itemsWithStock: item,
      inboundShipmentLines: noLines,
      batchInboundShipment: batchSaved,
    };
    const { capture, onSaved, dispose } = setup();
    await capture.receive(LABEL);
    capture.update({ quantity: 3 });
    calls.length = 0;
    await capture.receive(scanOf('SHIP-0042'));
    // The entry's barcode is only proposed, so saving proposes it for this
    // store too.
    expect(operations()).toEqual([
      'barcodeMatches',
      'batchInboundShipment',
      'proposeBarcode',
      'itemsWithStock',
      'inboundShipmentLines',
    ]);
    expect(onSaved).toHaveBeenCalledOnce();
    expect(capture.draft()?.item?.id).toBe('item-1');
    dispose();
  });

  it(".186 a USB scanner's batch label (captured) fills the entry on screen", async () => {
    answers = {
      barcodeMatches: known,
      itemsWithStock: item,
      inboundShipmentLines: noLines,
    };
    const { capture, onSaved, dispose } = setup();
    await capture.receive(scanOf(`01${GTIN}`));
    calls.length = 0;
    // As a USB scanner in the browser reported it: symbology ]C1, one GS.
    const read = readText(`172601311023041711${GS}30064`, ']C1');
    if (read.kind === 'unreadable') throw new Error('unreadable');
    await capture.receive(read);
    expect(calls).toEqual([]);
    expect(onSaved).not.toHaveBeenCalled();
    expect(capture.refusal()).toBeUndefined();
    expect(capture.draft()).toMatchObject({
      item: { id: 'item-1' },
      batch: '23041711',
      expiryDate: '2026-01-31',
      quantity: 64,
    });
    dispose();
  });

  it('.195 a shipping label alone (SSCC) leaves the entry unsaved and says so', async () => {
    answers = {
      barcodeMatches: known,
      itemsWithStock: item,
      inboundShipmentLines: noLines,
    };
    const { capture, onSaved, dispose } = setup();
    await capture.receive(LABEL);
    capture.update({ quantity: 3 });
    calls.length = 0;
    await capture.receive(scanOf('00493362502211704878'));
    // No code, so nothing to look up.
    expect(calls).toEqual([]);
    expect(onSaved).not.toHaveBeenCalled();
    expect(capture.unrecognised()).toBe('00493362502211704878');
    expect(capture.draft()).toMatchObject({ batch: 'AB12', quantity: 3 });
    dispose();
  });

  it('.202 a shipping label alone opens no window', async () => {
    const { capture, onNotice, dispose } = setup();
    await capture.receive(scanOf('00493362502211704878'));
    expect(capture.open()).toBe(false);
    expect(onNotice).toHaveBeenCalledOnce();
    dispose();
  });
});

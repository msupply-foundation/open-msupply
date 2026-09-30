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
      const answer = answers[operation];
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
    barcodeByGtin: {
      __typename: 'BarcodeNode',
      id: 'b1',
      gtin: GTIN,
      itemId: 'item-1',
      packSize: null,
    },
  },
} as const;

const unknown = {
  kind: 'success',
  data: {
    barcodeByGtin: {
      __typename: 'NodeError',
      error: {
        __typename: 'RecordNotFound',
        description: 'Record does not exist',
      },
    },
  },
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

const barcodeSaved = {
  kind: 'success',
  data: {
    insertBarcode: {
      __typename: 'BarcodeNode',
      id: 'b2',
      gtin: GTIN,
      itemId: 'item-1',
      packSize: 1,
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
      costLocked: () => false,
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
  it('.30 .31 a known code opens the window on its item, locked', async () => {
    answers = {
      barcodeByGtin: known,
      itemsWithStock: item,
      inboundShipmentLines: noLines,
    };
    const { capture, dispose } = setup();
    await capture.receive(LABEL);
    expect(capture.open()).toBe(true);
    expect(capture.draft()?.item?.id).toBe('item-1');
    expect(capture.draft()?.itemLocked).toBe(true);
    expect(operations()).toEqual([
      'barcodeByGtin',
      'itemsWithStock',
      'inboundShipmentLines',
    ]);
    dispose();
  });

  it('.37 .25 scanning on saves the line, then learns the code, then loads the next', async () => {
    answers = { barcodeByGtin: unknown };
    const { capture, onSaved, dispose } = setup();
    await capture.receive(LABEL);
    answers = {
      barcodeByGtin: unknown,
      itemsWithStock: item,
      inboundShipmentLines: noLines,
      batchInboundShipment: batchSaved,
      insertBarcode: barcodeSaved,
    };
    capture.pickItem({
      id: 'item-1',
      code: 'PARA',
      name: 'Paracetamol',
      unitName: 'Tab',
      availableUnits: 0,
      isVaccine: false,
      doses: 1,
      defaultPackSize: 1,
      defaultSellPricePerPack: 0,
    });
    capture.update({ quantity: 3 });
    calls.length = 0;
    await capture.receive(NEXT);
    // The line before the book (rules: "Saving writes the line first").
    expect(operations().slice(0, 3)).toEqual([
      'batchInboundShipment',
      'insertBarcode',
      'barcodeByGtin',
    ]);
    expect(calls[1]?.variables).toMatchObject({
      input: { gtin: GTIN, itemId: 'item-1', packSize: 1 },
    });
    expect(onSaved).toHaveBeenCalledOnce();
    expect(capture.draft()?.batch).toBe('CD34');
    expect(capture.savedNotice()).toBe('Saved 🥳');
    dispose();
  });

  it('.39 scanning on with the quantity still zero is refused and keeps the entry', async () => {
    answers = {
      barcodeByGtin: known,
      itemsWithStock: item,
      inboundShipmentLines: noLines,
    };
    const { capture, dispose } = setup();
    await capture.receive(LABEL);
    calls.length = 0;
    await capture.receive(NEXT);
    expect(calls).toEqual([]);
    expect(capture.refusal()).toBe(
      'Quantity must be greater than 0 before scanning a new product.'
    );
    expect(capture.draft()?.batch).toBe('AB12');
    dispose();
  });

  it('.38 scanning on with no item chosen is refused', async () => {
    answers = { barcodeByGtin: unknown };
    const { capture, dispose } = setup();
    await capture.receive(LABEL);
    capture.update({ quantity: 2 });
    await capture.receive(NEXT);
    expect(capture.refusal()).toMatch(/No item selected/);
    expect(capture.draft()?.batch).toBe('AB12');
    dispose();
  });

  it('a failed automatic save is reported and the incoming scan dropped', async () => {
    answers = {
      barcodeByGtin: known,
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

  it('a failure to learn the code does not lose the saved line', async () => {
    answers = { barcodeByGtin: unknown };
    const { capture, onSaved, onNotice, dispose } = setup();
    await capture.receive(LABEL);
    answers = {
      itemsWithStock: item,
      inboundShipmentLines: noLines,
      batchInboundShipment: batchSaved,
      insertBarcode: {
        kind: 'graphqlError',
        message: 'Bad user input',
        errors: [
          { message: 'Bad user input', extensions: { details: 'InvalidItem' } },
        ],
      },
    };
    capture.pickItem({
      id: 'item-1',
      code: 'PARA',
      name: 'Paracetamol',
      unitName: 'Tab',
      availableUnits: 0,
      isVaccine: false,
      doses: 1,
      defaultPackSize: 1,
      defaultSellPricePerPack: 0,
    });
    capture.update({ quantity: 1 });
    await capture.confirm();
    expect(onSaved).toHaveBeenCalledOnce();
    expect(onNotice).toHaveBeenCalledOnce();
    expect(capture.open()).toBe(false);
    dispose();
  });

  it('.41 a scan while another editing window is open is dropped with a notice', async () => {
    const { capture, onNotice, dispose } = setup(true);
    await capture.receive(LABEL);
    expect(calls).toEqual([]);
    expect(capture.open()).toBe(false);
    expect(onNotice).toHaveBeenCalledWith(
      'Unable to scan, please close the item edit window modal to continue'
    );
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

  it('.40 confirming a refused entry keeps the window open', async () => {
    answers = {
      barcodeByGtin: known,
      itemsWithStock: item,
      inboundShipmentLines: noLines,
    };
    const { capture, dispose } = setup();
    await capture.receive(LABEL);
    await capture.confirm();
    expect(capture.open()).toBe(true);
    dispose();
  });
});

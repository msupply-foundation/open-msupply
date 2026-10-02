import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import type { GraphqlResult } from '@/api/graphql';
import { readText } from '@/domain/barcode';
import { setDictionaries, setLocale } from '@/intl/intl';
import commonEn from '@/intl/locales/en/common.json';

// Issuing by scanning (spec/barcode-scanning/rules.md § Learning a code while
// issuing) over a stubbed transport.

type Call = { operation: string; variables: unknown };
const calls: Call[] = [];
let answers: Record<string, GraphqlResult<unknown>> = {};

vi.mock('@/api/graphql', async importOriginal => {
  const actual = await importOriginal<typeof import('@/api/graphql')>();
  return {
    ...actual,
    graphqlFetch: (
      document: { query: string },
      variables: unknown,
      options?: { mapSuccessToError?: (data: unknown) => string | undefined }
    ) => {
      const operation =
        /(query|mutation)\s+(\w+)/.exec(document.query)?.[2] ?? 'anonymous';
      calls.push({ operation, variables });
      const answer = answers[operation];
      if (!answer) throw new Error(`no stubbed answer for ${operation}`);
      if (
        answer.kind === 'success' &&
        options?.mapSuccessToError?.(answer.data) !== undefined
      )
        return Promise.resolve({ kind: 'unexpectedError' });
      return Promise.resolve(answer);
    },
  };
});

const {
  barcodeToLearn,
  learnIssueScan,
  learnedPackSize,
  resolveIssueScan,
  scannedBatchExclusions,
  issueScanTarget,
} = await import('./issueScan');

const GS = '\u001d';
const GTIN = '05012345678900';
const LABEL = `]d201${GTIN}${GS}10AB12${GS}17271231`;

const known = {
  kind: 'success',
  data: {
    barcodeByGtin: {
      __typename: 'BarcodeNode',
      id: 'b1',
      gtin: GTIN,
      itemId: 'item-1',
      packSize: 10,
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

beforeAll(() => {
  setDictionaries({ en: commonEn });
  setLocale('en');
});
afterAll(() => {
  setDictionaries({});
});

beforeEach(() => {
  calls.length = 0;
  answers = {};
});

describe('resolveIssueScan', () => {
  it('.42 a known code resolves its item, with the label batch', async () => {
    answers = { barcodeByGtin: known, itemsWithStock: item };
    const result = await resolveIssueScan('store', readText(LABEL));
    expect(result).toEqual({
      code: GTIN,
      known: true,
      batch: 'AB12',
      item: {
        id: 'item-1',
        code: 'PARA',
        name: 'Paracetamol',
        unitName: 'Tab',
        isVaccine: false,
        doses: 1,
        availableUnits: 0,
        defaultPackSize: 1,
        defaultSellPricePerPack: 0,
      },
    });
  });

  it('.43 an unknown code resolves no item but keeps the code to learn', async () => {
    answers = { barcodeByGtin: unknown };
    const result = await resolveIssueScan('store', readText(LABEL));
    expect(result).toEqual({ code: GTIN, known: false, batch: 'AB12' });
    expect(calls.map(c => c.operation)).toEqual(['barcodeByGtin']);
  });

  it('learns raw content too — issuing does not require an item number', async () => {
    answers = { barcodeByGtin: unknown };
    const result = await resolveIssueScan('store', readText('WAREHOUSE-7'));
    expect(result).toEqual({ code: 'WAREHOUSE-7', known: false });
  });

  it('.67 a label without an item number is never looked up', async () => {
    const result = await resolveIssueScan(
      'store',
      readText(`]d210AB12${GS}17271231`)
    );
    expect(result).toEqual({ known: false, batch: 'AB12' });
    expect(calls).toEqual([]);
  });

  it('.75 a known code whose item the store cannot see opens with no item, still known', async () => {
    answers = {
      barcodeByGtin: known,
      itemsWithStock: {
        kind: 'success',
        data: {
          items: { __typename: 'ItemConnector', totalCount: 0, nodes: [] },
        },
      },
    };
    const result = await resolveIssueScan('store', readText(GTIN));
    expect(result).toEqual({ code: GTIN, known: true, item: undefined });
  });

  it('a failed item fetch after a known code resolves nothing', async () => {
    answers = {
      barcodeByGtin: known,
      itemsWithStock: { kind: 'unexpectedError' },
    };
    expect(await resolveIssueScan('store', readText(GTIN))).toBeUndefined();
  });

  it('a failed lookup resolves nothing', async () => {
    answers = { barcodeByGtin: { kind: 'unexpectedError' } };
    expect(await resolveIssueScan('store', readText(GTIN))).toBeUndefined();
  });
});

describe('issueScanTarget', () => {
  const at = (
    resolving: boolean,
    editorOpen: boolean,
    editorWaiting: boolean
  ) => issueScanTarget({ resolving, editorOpen, editorWaiting });

  it('opens the editor with none open', () => {
    expect(at(false, false, false)).toBe('open');
  });

  it('.167 hands the scan to an editor waiting for an item', () => {
    expect(at(false, true, true)).toBe('editor');
  });

  it('drops a scan into an editor that already has an item', () => {
    expect(at(false, true, false)).toBe('drop');
  });

  it('drops a scan while an earlier one is still resolving', () => {
    expect(at(true, false, false)).toBe('drop');
    expect(at(true, true, true)).toBe('drop');
  });
});

describe('scannedBatchExclusions', () => {
  const lines = [
    { id: 'a', batch: 'AB12', numberOfPacks: 0 },
    { id: 'b', batch: 'CD34', numberOfPacks: 0 },
    { id: 'c', batch: null, numberOfPacks: 0 },
  ];

  it('.44 a held batch rules out every other batch', () => {
    expect(scannedBatchExclusions(lines, 'AB12')).toEqual(new Set(['b', 'c']));
  });

  it('.45 a batch the item does not hold leaves every batch available', () => {
    expect(scannedBatchExclusions(lines, 'ZZ99')).toEqual(new Set());
  });

  it('no batch on the label narrows nothing', () => {
    expect(scannedBatchExclusions(lines, undefined)).toEqual(new Set());
  });

  it('never rules out a batch the shipment already issues from', () => {
    const issued = [
      { id: 'a', batch: 'AB12', numberOfPacks: 0 },
      { id: 'b', batch: 'CD34', numberOfPacks: 3 },
      { id: 'c', batch: 'EF56', numberOfPacks: 0 },
    ];
    expect(scannedBatchExclusions(issued, 'AB12')).toEqual(new Set(['c']));
  });
});

describe('learnedPackSize', () => {
  it('is the pack size of the first batch that issued something', () => {
    expect(
      learnedPackSize([
        { numberOfPacks: 0, packSize: 1 },
        { numberOfPacks: 2, packSize: 10 },
        { numberOfPacks: 1, packSize: 20 },
      ])
    ).toBe(10);
  });

  it('is omitted where the save issued nothing', () => {
    expect(
      learnedPackSize([{ numberOfPacks: 0, packSize: 10 }])
    ).toBeUndefined();
  });
});

describe('barcodeToLearn', () => {
  const saved = [
    { numberOfPacks: 0, packSize: 1 },
    { numberOfPacks: 2, packSize: 10 },
  ];

  it('.46 learns an unknown code against the saved item', () => {
    expect(
      barcodeToLearn({ code: GTIN, known: false }, 'item-1', saved)
    ).toEqual({ gtin: GTIN, itemId: 'item-1', packSize: 10 });
  });

  it('.47 does not re-save a known code', () => {
    expect(
      barcodeToLearn({ code: GTIN, known: true }, 'item-1', saved)
    ).toBeUndefined();
  });

  it('learns nothing from a scan with no code, or no scan', () => {
    expect(barcodeToLearn({ known: false }, 'item-1', saved)).toBeUndefined();
    expect(barcodeToLearn(undefined, 'item-1', saved)).toBeUndefined();
  });

  it('omits the pack size where the save issued nothing', () => {
    expect(
      barcodeToLearn({ code: GTIN, known: false }, 'item-1', [
        { numberOfPacks: 0, packSize: 10 },
      ])
    ).toEqual({ gtin: GTIN, itemId: 'item-1', packSize: undefined });
  });
});

describe('learnIssueScan', () => {
  const saved = [{ numberOfPacks: 2, packSize: 10 }];

  it('.46 learns an unknown code once the line has saved', async () => {
    answers = {
      insertBarcode: {
        kind: 'success',
        data: {
          insertBarcode: {
            __typename: 'BarcodeNode',
            id: 'b2',
            gtin: GTIN,
            itemId: 'item-1',
            packSize: 10,
          },
        },
      },
    };
    expect(
      await learnIssueScan(
        'store',
        { code: GTIN, known: false },
        'item-1',
        saved
      )
    ).toBeUndefined();
    expect(calls).toEqual([
      {
        operation: 'insertBarcode',
        variables: {
          storeId: 'store',
          input: { gtin: GTIN, itemId: 'item-1', packSize: 10 },
        },
      },
    ]);
  });

  it('.47 sends nothing for a code the book already knows', async () => {
    expect(
      await learnIssueScan(
        'store',
        { code: GTIN, known: true },
        'item-1',
        saved
      )
    ).toBeUndefined();
    expect(calls).toEqual([]);
  });

  it('.48 a failure to learn the code is reported and touches nothing but the book', async () => {
    answers = {
      insertBarcode: {
        kind: 'graphqlError',
        message: 'Bad user input',
        errors: [
          { message: 'Bad user input', extensions: { details: 'InvalidItem' } },
        ],
      },
    };
    const notice = await learnIssueScan(
      'store',
      { code: GTIN, known: false },
      'item-1',
      saved
    );
    expect(notice).toMatch(/^Unable to save the barcode for this item: /);
    // The saved line is never revisited: the only request is the book write.
    expect(calls.map(c => c.operation)).toEqual(['insertBarcode']);
  });
});

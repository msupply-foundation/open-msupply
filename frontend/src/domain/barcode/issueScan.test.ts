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

// Issuing by scanning (spec/barcode-scanning/rules.md § Issuing by scanning)
// over a stubbed transport.

type Call = { operation: string; variables: unknown };
const calls: Call[] = [];
// An array answers successive calls of the same operation in order.
let answers: Record<string, GraphqlResult<unknown> | GraphqlResult<unknown>[]> =
  {};

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
      const stubbed = answers[operation];
      const answer = Array.isArray(stubbed) ? stubbed.shift() : stubbed;
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

const { resolveIssueScan, scanExclusions } = await import('./issueScan');

const GS = '\u001d';
const GTIN = '05012345678900';
const LABEL = `]d201${GTIN}${GS}10AB12${GS}17271231`;

const mapping = (
  id: string,
  itemId: string,
  status: 'PROPOSED' | 'CONFIRMED' = 'PROPOSED'
) => ({
  __typename: 'BarcodeMatchNode' as const,
  id,
  value: `gtin:${GTIN.padStart(14, '0')}`,
  barcode: GTIN,
  itemId,
  packSize: 10,
  status,
});

const mappings = (...nodes: ReturnType<typeof mapping>[]) =>
  ({ kind: 'success', data: { barcodeMatches: nodes } }) as const;

const known = mappings(mapping('b1', 'item-1'));
const unknown = mappings();

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
    answers = { barcodeMatches: known, itemsWithStock: item };
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
    answers = { barcodeMatches: unknown };
    const result = await resolveIssueScan('store', readText(LABEL));
    expect(result).toEqual({ code: GTIN, known: false, batch: 'AB12' });
    expect(calls.map(c => c.operation)).toEqual(['barcodeMatches']);
  });

  it('.140 a plain code that is not a retail barcode is looked up, but not kept to learn', async () => {
    answers = { barcodeMatches: unknown };
    const result = await resolveIssueScan('store', readText('WAREHOUSE-7'));
    expect(calls).toHaveLength(1);
    expect(JSON.stringify(calls[0]?.variables)).toContain('WAREHOUSE-7');
    expect(result).toEqual({ known: false });
    expect(result?.code).toBeUndefined();
  });

  it('.139 an unknown retail barcode is kept to learn — it is an item number', async () => {
    answers = { barcodeMatches: unknown };
    const result = await resolveIssueScan('store', readText('4006381333931'));
    expect(result).toEqual({ code: '4006381333931', known: false });
  });

  it('a known plain barcode resolves its item and is sent as scanned', async () => {
    answers = {
      barcodeMatches: mappings({
        ...mapping('b1', 'item-1'),
        value: 'plain:WAREHOUSE-7',
        barcode: 'WAREHOUSE-7',
      }),
      itemsWithStock: item,
    };
    const result = await resolveIssueScan('store', readText('WAREHOUSE-7'));
    expect(result?.item?.id).toBe('item-1');
    expect(result?.code).toBe('WAREHOUSE-7');
  });

  it('.67 a label without an item number is never looked up', async () => {
    const result = await resolveIssueScan(
      'store',
      readText(`]d210AB12${GS}17271231`)
    );
    // Nor is its batch held for an item picked later
    expect(result).toEqual({ known: false });
    expect(calls).toEqual([]);
  });

  it('.43 a mapped barcode whose item cannot be found opens with no item', async () => {
    answers = {
      barcodeMatches: known,
      itemsWithStock: {
        kind: 'success',
        data: {
          items: { __typename: 'ItemConnector', totalCount: 0, nodes: [] },
        },
      },
    };
    const result = await resolveIssueScan('store', readText(GTIN));
    expect(result).toEqual({
      code: GTIN,
      known: true,
      item: undefined,
    });
  });

  const noItems = {
    kind: 'success',
    data: {
      items: { __typename: 'ItemConnector', totalCount: 0, nodes: [] },
    },
  } as const;

  it('.169 a known code is resolved within the scope the editor searches (a program)', async () => {
    answers = { barcodeMatches: known, itemsWithStock: [noItems, item] };
    const result = await resolveIssueScan('store', readText(GTIN), {
      masterListId: 'program-1',
    });
    const itemCalls = calls.filter(c => c.operation === 'itemsWithStock');
    expect(itemCalls[0]?.variables).toMatchObject({
      filter: {
        id: { equalTo: 'item-1' },
        masterListId: { equalTo: 'program-1' },
      },
    });
    // Asked again without the scope, to name the item it means.
    expect(JSON.stringify(itemCalls[1]?.variables)).not.toContain(
      'masterListId'
    );
    // Outside the program: no item to lock to, still known, and it says
    // which item the barcode is for.
    expect(result).toEqual({
      code: GTIN,
      known: true,
      item: undefined,
      outsideScope: { code: 'PARA', name: 'Paracetamol' },
    });
  });

  it('.169 an item neither in the program nor in the store opens as no match', async () => {
    answers = { barcodeMatches: known, itemsWithStock: [noItems, noItems] };
    const result = await resolveIssueScan('store', readText(GTIN), {
      masterListId: 'program-1',
    });
    expect(result).toEqual({
      code: GTIN,
      known: true,
      item: undefined,
    });
  });

  it('a failed unscoped re-ask still opens, as no match', async () => {
    answers = {
      barcodeMatches: known,
      itemsWithStock: [noItems, { kind: 'unexpectedError' }],
    };
    const result = await resolveIssueScan('store', readText(GTIN), {
      masterListId: 'program-1',
    });
    expect(result).toEqual({
      code: GTIN,
      known: true,
      item: undefined,
    });
  });

  it('an unscoped lookup sends no master list filter', async () => {
    answers = { barcodeMatches: known, itemsWithStock: item };
    await resolveIssueScan('store', readText(GTIN));
    const itemCall = calls.find(c => c.operation === 'itemsWithStock');
    expect(JSON.stringify(itemCall?.variables)).not.toContain('masterListId');
  });

  it('a failed item fetch after a known code resolves nothing', async () => {
    answers = {
      barcodeMatches: known,
      itemsWithStock: { kind: 'unexpectedError' },
    };
    expect(await resolveIssueScan('store', readText(GTIN))).toBeUndefined();
  });

  it('a failed lookup resolves nothing', async () => {
    answers = { barcodeMatches: { kind: 'unexpectedError' } };
    expect(await resolveIssueScan('store', readText(GTIN))).toBeUndefined();
  });

  it('.203 a barcode matching several items asks, even with one confirmed', async () => {
    answers = {
      barcodeMatches: mappings(
        mapping('b2', 'item-1', 'CONFIRMED'),
        mapping('b1', 'item-2')
      ),
    };
    const choose = vi.fn().mockResolvedValue({ kind: 'cancelled' });
    await resolveIssueScan('store', readText(GTIN), {
      chooser: { choose, Chooser: () => null },
    });
    expect(choose).toHaveBeenCalled();
  });

  it('.203 a barcode mapped to several items asks which one', async () => {
    answers = {
      barcodeMatches: mappings(
        mapping('b1', 'item-1'),
        mapping('b2', 'item-2')
      ),
    };
    const choose = vi.fn().mockResolvedValue({
      kind: 'chosen',
      barcode: mapping('b2', 'item-2'),
      item: { id: 'item-2', code: 'IBU', name: 'Ibuprofen' },
    });
    const result = await resolveIssueScan('store', readText(GTIN), {
      masterListId: 'program-1',
      chooser: { choose, Chooser: () => null },
    });
    expect(choose).toHaveBeenCalledWith(
      'store',
      [mapping('b1', 'item-1'), mapping('b2', 'item-2')],
      { masterListId: 'program-1' }
    );
    expect(result).toEqual({
      code: GTIN,
      known: true,
      item: { id: 'item-2', code: 'IBU', name: 'Ibuprofen' },
    });
  });

  it('.204 closing the chooser opens nothing', async () => {
    answers = {
      barcodeMatches: mappings(
        mapping('b1', 'item-1'),
        mapping('b2', 'item-2')
      ),
    };
    const choose = vi.fn().mockResolvedValue({ kind: 'cancelled' });
    const result = await resolveIssueScan('store', readText(GTIN), {
      chooser: { choose, Chooser: () => null },
    });
    expect(result).toBeUndefined();
  });
});

describe('scanExclusions — the label batch', () => {
  const lines = [
    { id: 'a', batch: 'AB12', numberOfPacks: 0 },
    { id: 'b', batch: 'CD34', numberOfPacks: 0 },
    { id: 'c', batch: null, numberOfPacks: 0 },
  ];

  it('.44 a held batch rules out every other batch', () => {
    expect(scanExclusions(lines, { batch: 'AB12' })).toEqual(
      new Set(['b', 'c'])
    );
  });

  it('.212 a batch the item does not hold rules out everything', () => {
    expect(scanExclusions(lines, { batch: 'ZZ99' })).toEqual(
      new Set(['a', 'b', 'c'])
    );
  });

  it('no batch on the label narrows nothing', () => {
    expect(scanExclusions(lines, {})).toEqual(new Set());
  });

  it('never rules out a batch the shipment already issues from', () => {
    const issued = [
      { id: 'a', batch: 'AB12', numberOfPacks: 0 },
      { id: 'b', batch: 'CD34', numberOfPacks: 3 },
      { id: 'c', batch: 'EF56', numberOfPacks: 0 },
    ];
    expect(scanExclusions(issued, { batch: 'AB12' })).toEqual(new Set(['c']));
  });
});

describe('scanExclusions', () => {
  const OTHER = '05012345678917';
  const lines = [
    { id: 'mine', batch: 'AB12', barcode: GTIN, numberOfPacks: 0 },
    { id: 'theirs', batch: 'AB12', barcode: OTHER, numberOfPacks: 0 },
    { id: 'unlabelled', batch: 'AB12', barcode: null, numberOfPacks: 0 },
    { id: 'old', batch: 'CD34', barcode: GTIN, numberOfPacks: 0 },
  ];

  it('.190 rules out stock from another box; stock with no barcode stays', () => {
    expect(scanExclusions(lines, { code: GTIN })).toEqual(new Set(['theirs']));
  });

  it('.190 a 13-digit scan matches the 14-digit barcode on the stock', () => {
    expect(scanExclusions(lines, { code: GTIN.slice(1) })).toEqual(
      new Set(['theirs'])
    );
  });

  it('.190 applies with the batch narrowing', () => {
    expect(scanExclusions(lines, { batch: 'AB12', code: GTIN })).toEqual(
      new Set(['old', 'theirs'])
    );
  });

  it('.212 a barcode that matches no stock rules out everything', () => {
    const others = [
      { id: 'a', batch: 'AB12', barcode: OTHER, numberOfPacks: 0 },
      { id: 'b', batch: 'CD34', barcode: OTHER, numberOfPacks: 0 },
    ];
    expect(scanExclusions(others, { batch: 'AB12', code: GTIN })).toEqual(
      new Set(['a', 'b'])
    );
  });

  it('.190 never rules out stock the shipment already issues from', () => {
    const issued = [
      { id: 'a', batch: 'AB12', barcode: GTIN, numberOfPacks: 0 },
      { id: 'b', batch: 'AB12', barcode: OTHER, numberOfPacks: 2 },
    ];
    expect(scanExclusions(issued, { code: GTIN })).toEqual(new Set());
  });
});

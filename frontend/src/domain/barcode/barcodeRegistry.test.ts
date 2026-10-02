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
import { setDictionaries, setLocale } from '@/intl/intl';
import commonEn from '@/intl/locales/en/common.json';

// Barcode lookups, proposals and central's changes over a stubbed transport,
// one test per wire outcome spec/barcode-scanning/contract.md names — including its traps: the
// empty string that would resolve, and the rejections that are top-level
// GraphQL errors. Test names lead with the OMS-REG-BAC-01 behaviours they
// cover (spec/barcode-scanning/cases).

type Call = { operation: string; variables: unknown; options: unknown };
const calls: Call[] = [];
let answer: GraphqlResult<unknown> | undefined;

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
      calls.push({ operation, variables, options });
      if (!answer) throw new Error(`no stubbed answer for ${operation}`);
      // What the real transport does with the hook: a payload it promotes
      // becomes an unexpected error.
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
  addBarcode,
  confirmProposal,
  lookUpBarcode,
  moveBarcode,
  proposeBarcode,
  removeBarcode,
  resolveMappings,
  withdrawProposal,
} = await import('./barcodeRegistry');

const match = (
  id: string,
  itemId: string,
  status: 'PROPOSED' | 'CONFIRMED' = 'PROPOSED'
) => ({
  __typename: 'BarcodeMatchNode' as const,
  id,
  status,
  value: 'gtin:05012345678900',
  barcode: '5012345678900',
  itemId,
  packSize: 10,
});
const barcode = match('b1', 'item-1');

const lookupAnswer = (nodes: unknown[]): GraphqlResult<unknown> => ({
  kind: 'success',
  data: { barcodeMatches: nodes },
});

beforeAll(() => {
  setDictionaries({ en: commonEn });
  setLocale('en');
});
afterAll(() => setDictionaries({}));

beforeEach(() => {
  calls.length = 0;
  answer = undefined;
});

describe('resolveMappings — rules § Looking a barcode up', () => {
  it('.22 no match is an unknown barcode', () => {
    expect(resolveMappings([])).toEqual({ kind: 'unknown' });
  });

  it('.21 one match is used', () => {
    expect(resolveMappings([barcode])).toEqual({ kind: 'known', barcode });
  });

  it('.203 several matches: the user chooses, even with one confirmed', () => {
    const confirmed = match('b2', 'item-2', 'CONFIRMED');
    expect(resolveMappings([confirmed, barcode])).toEqual({
      kind: 'choose',
      barcodes: [confirmed, barcode],
    });
  });
});

describe('lookUpBarcode — rules § Looking a barcode up', () => {
  it('.21 asks for the matches of the barcode as read', async () => {
    answer = lookupAnswer([barcode]);
    const result = await lookUpBarcode('store-1', '5012345678900');
    expect(result).toEqual({ kind: 'known', barcode });
    // Sent as read: the server pads a product number to its standard form.
    expect(calls[0]?.variables).toEqual({
      storeId: 'store-1',
      barcode: '5012345678900',
    });
  });

  it('.22 answers unknown for no matches — a miss, not a failure', async () => {
    answer = lookupAnswer([]);
    expect(await lookUpBarcode('store-1', 'ABC')).toEqual({ kind: 'unknown' });
  });

  it('answers failed when the request fails', async () => {
    answer = { kind: 'unexpectedError' };
    expect(await lookUpBarcode('store-1', 'ABC')).toEqual({ kind: 'failed' });
  });

  it.each([undefined, ''])(
    '.68 sends nothing for a scan with no code (%j)',
    async code => {
      expect(await lookUpBarcode('store-1', code)).toEqual({ kind: 'no-code' });
      expect(calls).toEqual([]);
    }
  );
});

describe('proposeBarcode — rules § Learning a barcode', () => {
  const input = { barcode: '5012345678900', itemId: 'item-1', packSize: 10 };

  it('.178 proposes the barcode for the item, as read', async () => {
    answer = { kind: 'success', data: { proposeBarcode: barcode } };
    expect(await proposeBarcode('store-1', input)).toEqual({ kind: 'saved' });
    expect(calls[0]).toMatchObject({
      operation: 'proposeBarcode',
      variables: { storeId: 'store-1', input },
    });
  });

  it('sends nothing for an empty barcode', async () => {
    expect(await proposeBarcode('store-1', { ...input, barcode: ' ' })).toEqual(
      { kind: 'no-code' }
    );
    expect(calls).toEqual([]);
  });

  it('leaves out an unknown pack size', async () => {
    answer = { kind: 'success', data: { proposeBarcode: barcode } };
    await proposeBarcode('store-1', { ...input, packSize: 0 });
    expect(calls[0]?.variables).toEqual({
      storeId: 'store-1',
      input: { barcode: input.barcode, itemId: input.itemId },
    });
  });

  // InvalidItem arrives as a top-level GraphQL error. It is taken locally,
  // never routed to the global modals.
  it('reports a top-level rejection as the unable-to-save notice', async () => {
    answer = {
      kind: 'graphqlError',
      message: 'Bad user input',
      errors: [
        { message: 'Bad user input', extensions: { details: 'InvalidItem' } },
      ],
    };
    const result = await proposeBarcode('store-1', input);
    expect(result).toEqual({
      kind: 'error',
      message:
        'Unable to save the barcode for this item: Bad user input: InvalidItem',
    });
    expect(calls[0]?.options).toMatchObject({ returnGraphqlErrors: true });
  });
});

describe('central — rules § Maintaining barcodes', () => {
  const saved = (operation: string) => ({
    kind: 'success' as const,
    data: { centralServer: { barcode: { [operation]: { id: 'b1' } } } },
  });

  it('.178 adds a confirmed barcode', async () => {
    answer = saved('insertBarcode');
    const input = { barcode: '5012345678900', itemId: 'item-1' };
    expect(await addBarcode('store-1', input)).toEqual({ kind: 'saved' });
    expect(calls[0]).toMatchObject({
      operation: 'insertBarcode',
      variables: { storeId: 'store-1', input },
    });
  });

  it('refuses an empty barcode rather than sending it', async () => {
    expect(
      await addBarcode('store-1', { barcode: '', itemId: 'item-1' })
    ).toEqual({ kind: 'no-code' });
    expect(calls).toEqual([]);
  });

  it('.174 confirms a proposal', async () => {
    answer = saved('confirmBarcodeProposal');
    expect(await confirmProposal('store-1', 'p1')).toEqual({ kind: 'saved' });
    expect(calls[0]).toMatchObject({
      operation: 'confirmBarcodeProposal',
      variables: { storeId: 'store-1', id: 'p1' },
    });
  });

  it('.228 moves a barcode to another item', async () => {
    answer = saved('updateBarcode');
    expect(await moveBarcode('store-1', 'b1', 'item-2')).toEqual({
      kind: 'saved',
    });
    expect(calls[0]?.variables).toEqual({
      storeId: 'store-1',
      input: { id: 'b1', itemId: 'item-2' },
    });
  });

  it('withdraws a proposal made on this site', async () => {
    answer = {
      kind: 'success',
      data: { deleteBarcodeProposal: { id: 'p1' } },
    };
    expect(await withdrawProposal('store-1', 'p1')).toEqual({
      kind: 'saved',
    });
    expect(calls[0]).toMatchObject({
      operation: 'deleteBarcodeProposal',
      variables: { storeId: 'store-1', id: 'p1' },
    });
  });

  it('.180 removes a barcode', async () => {
    answer = saved('deleteBarcode');
    expect(await removeBarcode('store-1', 'b1')).toEqual({ kind: 'saved' });
    expect(calls[0]?.operation).toBe('deleteBarcode');
  });

  it('reports a refusal', async () => {
    answer = {
      kind: 'graphqlError',
      message: 'Bad user input',
      errors: [{ message: 'Bad user input' }],
    };
    const result = await removeBarcode('store-1', 'b1');
    expect(result.kind).toBe('error');
  });
});

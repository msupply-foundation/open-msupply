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

// The registry's two calls over a stubbed transport, one test per wire
// outcome spec/barcode-scanning/contract.md names — including its traps: a
// miss shaped like an error, the empty string that resolves, and a save
// whose only rejection is a top-level GraphQL error. Test names lead with the
// OMS-REG-BAC-01 behaviours they cover (spec/barcode-scanning/cases).

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

const { lookUpBarcode, saveBarcode } = await import('./barcodeRegistry');

const barcode = {
  __typename: 'BarcodeNode',
  id: 'b1',
  gtin: '05012345678900',
  itemId: 'item-1',
  packSize: 10,
};

const lookupAnswer = (response: unknown): GraphqlResult<unknown> => ({
  kind: 'success',
  data: { barcodeByGtin: response },
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

describe('lookUpBarcode — rules § Looking a code up', () => {
  it('.21 answers known with the row the code names', async () => {
    answer = lookupAnswer(barcode);
    const result = await lookUpBarcode('store-1', '05012345678900');
    expect(result).toEqual({ kind: 'known', barcode });
    expect(calls[0]?.variables).toEqual({
      storeId: 'store-1',
      gtin: '05012345678900',
    });
  });

  it('.22 answers unknown for the RecordNotFound branch — a miss, not a failure', async () => {
    answer = lookupAnswer({
      __typename: 'NodeError',
      error: {
        __typename: 'RecordNotFound',
        description: 'Record does not exist',
      },
    });
    expect(await lookUpBarcode('store-1', 'ABC')).toEqual({ kind: 'unknown' });
  });

  it('treats any other NodeError as a failure', async () => {
    answer = lookupAnswer({
      __typename: 'NodeError',
      error: { __typename: 'DatabaseError', description: 'db down' },
    });
    expect(await lookUpBarcode('store-1', 'ABC')).toEqual({ kind: 'failed' });
  });

  it('answers failed when the request fails', async () => {
    answer = { kind: 'unexpectedError' };
    expect(await lookUpBarcode('store-1', 'ABC')).toEqual({ kind: 'failed' });
  });

  // OMS-REG-BAC-01.68 and the empty-string wire trap: the server would match
  // an empty-coded row, so nothing is sent at all.
  it.each([undefined, ''])(
    'sends nothing for a scan with no code (%j)',
    async code => {
      expect(await lookUpBarcode('store-1', code)).toEqual({ kind: 'no-code' });
      expect(calls).toEqual([]);
    }
  );

  it('.23 sends the code exactly as given — the match is exact', async () => {
    answer = lookupAnswer(barcode);
    await lookUpBarcode('store-1', ' 5012345678900 ');
    expect(calls[0]?.variables).toMatchObject({ gtin: ' 5012345678900 ' });
  });
});

describe("saveBarcode — rules § The book's key and what a save does", () => {
  const input = { gtin: '05012345678900', itemId: 'item-1', packSize: 10 };

  it('answers saved with the row as the server now holds it', async () => {
    answer = { kind: 'success', data: { insertBarcode: barcode } };
    expect(await saveBarcode('store-1', input)).toEqual({
      kind: 'saved',
      barcode,
    });
    expect(calls[0]?.variables).toEqual({ storeId: 'store-1', input });
  });

  // The union declares no errors, so InvalidItem — and a missing
  // MutateItems permission — arrive as top-level GraphQL errors. They are
  // taken locally, never routed to the global modals.
  it('reports a top-level rejection as the unable-to-save notice', async () => {
    answer = {
      kind: 'graphqlError',
      message: 'Bad user input',
      errors: [
        { message: 'Bad user input', extensions: { details: 'InvalidItem' } },
      ],
    };
    const result = await saveBarcode('store-1', input);
    expect(result).toEqual({
      kind: 'error',
      message:
        'Unable to save the barcode for this item: Bad user input: InvalidItem',
    });
    expect(calls[0]?.options).toMatchObject({ returnGraphqlErrors: true });
  });

  it('refuses an empty code rather than storing it as a real row', async () => {
    expect(await saveBarcode('store-1', { ...input, gtin: '' })).toEqual({
      kind: 'no-code',
    });
    expect(calls).toEqual([]);
  });
});

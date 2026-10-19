/*
 * The header save's error routing (spec/internal-orders contract › header
 * fields, › target months of stock): a typed rejection is returned for inline
 * display on the field it belongs to — the store-fixed target
 * (OMS-REG-REPL-17.18) on the target select, a supplier rejection on the
 * supplier lookup.
 */
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { graphqlFetch } from '@/api/graphql';
import { setDictionaries, setLocale } from '@/intl/intl';
import commonEn from '@/intl/locales/en/common.json';
import { saveInternalOrderFields } from './internalOrderUpdate';

vi.mock('@/api/graphql', () => ({
  graphqlFetch: vi.fn(),
  msSinceLastGqlCall: vi.fn(() => 0),
  isForbidden: vi.fn(() => false),
  missingPermissions: vi.fn(() => []),
  reportPermissionDenied: vi.fn(),
}));
const fetchMock = vi.mocked(graphqlFetch);

beforeAll(() => {
  setDictionaries({ en: commonEn });
  setLocale('en');
});
afterAll(() => setDictionaries({}));
beforeEach(() => fetchMock.mockReset());

// Minimal wire payload; the cast is the test's trusted seam (the real shape is
// codegen-validated end to end).
const rejected = (error: { __typename: string; description: string }) =>
  ({
    kind: 'success',
    data: {
      updateRequestRequisition: {
        __typename: 'UpdateRequestRequisitionError',
        error,
      },
    },
  }) as never;

describe('saveInternalOrderFields', () => {
  it('OMS-REG-REPL-17.18 — a store-fixed target comes back on the target field', async () => {
    fetchMock.mockResolvedValue(
      rejected({
        __typename: 'CannotChangeTargetMonthsOfStock',
        description: 'cannot change',
      })
    );
    expect(
      await saveInternalOrderFields('store-a', {
        id: 'req-1',
        maxMonthsOfStock: 2,
      })
    ).toEqual({
      kind: 'error',
      field: 'target',
      message: commonEn['error.cannot-change-target-months'],
    });
  });

  it('a supplier rejection comes back on the supplier field', async () => {
    fetchMock.mockResolvedValue(
      rejected({
        __typename: 'OtherPartyNotASupplier',
        description: 'not a supplier',
      })
    );
    expect(
      await saveInternalOrderFields('store-a', {
        id: 'req-1',
        otherPartyId: 'name-x',
      })
    ).toEqual({
      kind: 'error',
      field: 'supplier',
      message: commonEn['error.other-party-not-a-supplier'],
    });
  });

  it('a failed request is failed', async () => {
    fetchMock.mockResolvedValue({ kind: 'error' } as never);
    expect(
      await saveInternalOrderFields('store-a', {
        id: 'req-1',
        maxMonthsOfStock: 2,
      })
    ).toEqual({ kind: 'failed' });
  });
});

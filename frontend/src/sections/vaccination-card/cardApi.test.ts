import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { GraphqlResult } from '@/api/graphql';

// The save's outcomes as the editor reads them (spec/vaccination-card rules §
// outcome of a save; contract § recording a dose, § editing a recorded dose):
// refusals come back to the editor, never to the global error modal.

const state: { next: GraphqlResult<unknown> } = {
  next: { kind: 'unexpectedError' },
};
const calls: { variables: unknown; options: unknown }[] = [];

vi.mock('@/api/graphql', async () => ({
  // The real error readers: the save classifies what the server sent.
  ...(await vi.importActual<typeof import('@/api/graphql')>('@/api/graphql')),
  graphqlFetch: (_doc: unknown, variables: unknown, options: unknown) => {
    calls.push({ variables, options });
    return Promise.resolve(state.next);
  },
}));

const { fetchBatches, saveDose } = await import('./cardApi');
const { initialDraft } = await import('./doseDraft');
type DraftContext = import('./doseDraft').DraftContext;

const ctx = (
  vaccination: DraftContext['vaccination'] = null
): DraftContext => ({
  vaccination,
  storeId: 'store-gry',
  storeNameId: 'name-gry',
  encounterClinicianId: null,
  courseItemIds: ['dpt'],
  today: '2026-10-12',
});

const recorded = {
  __typename: 'VaccinationNode' as const,
  id: 'vax-1',
  vaccinationDate: '2026-10-01',
  clinicianId: null,
  given: true,
  givenStoreId: 'store-gry',
  notGivenReason: null,
  comment: null,
  facilityNameId: 'name-gry',
  facilityFreeText: null,
  facilityName: null,
  item: null,
  stockLine: null,
  invoice: null,
};

const save = (c: DraftContext) =>
  saveDose({
    draft: { ...initialDraft(c), given: true },
    ctx: c,
    encounterId: 'enc-1',
    vaccineCourseDoseId: 'dose-1',
  });

beforeEach(() => {
  calls.length = 0;
});

describe('OMS-REG-DIS-06.63 — a save that lands', () => {
  it('reports saved for a new dose', async () => {
    state.next = {
      kind: 'success',
      data: {
        insertVaccination: {
          __typename: 'VaccinationNode',
          id: 'v',
          invoice: null,
        },
      },
    };
    expect(await save(ctx())).toEqual({ kind: 'saved' });
  });
});

describe('OMS-REG-DIS-06.45 / OMS-REG-DIS-06.60 — a refused save stays with the editor', () => {
  it('returns a server refusal (a batch on hold, every insert refusal) to the editor', async () => {
    state.next = {
      kind: 'graphqlError',
      message: 'Internal error',
      errors: [],
    };
    expect(await save(ctx())).toEqual({ kind: 'refused' });
    expect(calls[0].options).toEqual({ returnGraphqlErrors: true });
  });
  it('leaves a transport failure to the global error path', async () => {
    state.next = { kind: 'unexpectedError' };
    expect(await save(ctx())).toEqual({ kind: 'failed' });
  });
});

describe('OMS-REG-DIS-06.48 — un-giving a dose while the next is given', () => {
  it('reads the typed refusal as its own outcome', async () => {
    state.next = {
      kind: 'success',
      data: {
        updateVaccination: {
          __typename: 'UpdateVaccinationError',
          error: { __typename: 'NotMostRecentGivenDose', description: '' },
        },
      },
    };
    expect(await save(ctx(recorded))).toEqual({
      kind: 'notMostRecentGivenDose',
    });
  });
});

describe('OMS-REG-DIS-06.64 — without the document-write permission', () => {
  // The save takes its GraphQL errors itself, so a missing permission arrives
  // as one — not as graphqlFetch's `forbidden`, which only the default path
  // returns (VC-20261013-F6).
  it('reads a Forbidden among the errors as the permission-denied outcome, naming the permission', async () => {
    state.next = {
      kind: 'graphqlError',
      message: 'Forbidden',
      errors: [
        {
          message: 'Forbidden',
          extensions: {
            details:
              'Missing access to store: X, Required permissions: And([HasStoreAccess, HasPermission(DocumentMutate)])',
          },
        },
      ],
    };
    expect(await save(ctx())).toEqual({
      kind: 'forbidden',
      permissions: ['DocumentMutate'],
    });
  });
});

describe('OMS-REG-DIS-06.44 — a vaccine with zero doses per unit', () => {
  it('reads as configured, never as one dose per unit (rules § zero doses)', async () => {
    const batch = {
      id: 'sl-a',
      batch: 'A',
      expiryDate: null,
      availableNumberOfPacks: 10,
      packSize: 1,
      onHold: false,
    };
    state.next = {
      kind: 'success',
      data: {
        items: { nodes: [{ doses: 0, availableBatches: { nodes: [batch] } }] },
      },
    };
    const read = await fetchBatches({ storeId: 'store-gry', itemId: 'dpt' });
    expect(read?.dosesPerUnit).toBe(0);
    expect(read?.batches).toHaveLength(1);
  });
});

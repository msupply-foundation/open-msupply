import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { GraphqlResult } from '@/api/graphql';

// The save's outcomes as the editor reads them (spec/vaccination-card rules §
// outcome of a save; contract § recording a dose, § editing a recorded dose):
// refusals come back to the editor, never to the global error modal.

const state: { next: GraphqlResult<unknown> } = {
  next: { kind: 'unexpectedError' },
};
const calls: { variables: unknown; options: unknown }[] = [];

vi.mock('@/api/graphql', () => ({
  graphqlFetch: (_doc: unknown, variables: unknown, options: unknown) => {
    calls.push({ variables, options });
    return Promise.resolve(state.next);
  },
}));

const { saveDose } = await import('./cardApi');
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
  it('leaves the refusal to the permission-denied path and saves nothing', async () => {
    state.next = { kind: 'forbidden' };
    expect(await save(ctx())).toEqual({ kind: 'failed' });
  });
});

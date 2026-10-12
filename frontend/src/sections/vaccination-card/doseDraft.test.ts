import { describe, expect, it } from 'vitest';
import {
  batchChoosable,
  batchDoses,
  confirmations,
  draftDiffers,
  givenAtOtherStore,
  initialDraft,
  insertInput,
  isOtherFacility,
  missingFields,
  OTHER_FACILITY,
  presetBatch,
  showsBatch,
  switchLabel,
  updateInput,
  type DoseDraft,
  type DoseVaccination,
  type DraftContext,
} from './doseDraft';

const TODAY = '2026-10-12';
const STORE = 'store-gry';
const STORE_NAME = 'name-gry';

const ctxFor = (over: Partial<DraftContext> = {}): DraftContext => ({
  vaccination: null,
  storeId: STORE,
  storeNameId: STORE_NAME,
  encounterClinicianId: 'clin-1',
  courseItemIds: ['dpt', 'vax-a'],
  today: TODAY,
  ...over,
});

// A recorded vaccination as the editor reads it (contract § recording a dose).
const recorded = (over: Partial<DoseVaccination> = {}): DoseVaccination => ({
  __typename: 'VaccinationNode',
  id: 'vax-1',
  vaccinationDate: '2026-10-01',
  clinicianId: 'clin-2',
  given: true,
  givenStoreId: STORE,
  notGivenReason: null,
  comment: 'left arm',
  facilityNameId: STORE_NAME,
  facilityFreeText: null,
  facilityName: 'Gryffindor',
  item: { __typename: 'ItemNode', id: 'dpt', name: 'DPT' },
  stockLine: {
    __typename: 'StockLineNode',
    id: 'sl-a',
    batch: 'A',
    itemId: 'dpt',
  },
  invoice: { __typename: 'InvoiceNode', id: 'rx-1' },
  ...over,
});

const newDraft = (
  over: Partial<DoseDraft> = {},
  ctx = ctxFor()
): DoseDraft => ({
  ...initialDraft(ctx),
  ...over,
});

describe('OMS-REG-DIS-06.58 / OMS-REG-DIS-06.61 — a new dose opens with its defaults', () => {
  it("sets this store, the encounter's clinician and today, with neither given nor not given chosen", () => {
    expect(initialDraft(ctxFor())).toMatchObject({
      given: undefined,
      facility: STORE_NAME,
      clinicianId: 'clin-1',
      date: TODAY,
      createTransactions: true,
    });
  });
});

describe('OMS-REG-DIS-06.3 — the item choice', () => {
  it("presets the course's only item", () => {
    expect(initialDraft(ctxFor({ courseItemIds: ['vax-a'] })).itemId).toBe(
      'vax-a'
    );
  });
  it('presets nothing when the course has several', () => {
    expect(initialDraft(ctxFor()).itemId).toBeNull();
  });
});

describe('OMS-REG-DIS-06.55 — a recorded dose opens as recorded', () => {
  it('keeps its batch, and differs from nothing until edited', () => {
    const ctx = ctxFor({ vaccination: recorded() });
    const draft = initialDraft(ctx);
    expect(draft.stockLineId).toBe('sl-a');
    expect(draftDiffers(draft, initialDraft(ctx))).toBe(false);
    expect(
      draftDiffers({ ...draft, comment: 'right arm' }, initialDraft(ctx))
    ).toBe(true);
  });
});

describe('OMS-REG-DIS-06.59 / OMS-REG-DIS-06.8 / OMS-REG-DIS-06.57 — what a save checks', () => {
  it('marks given or not given as required while neither is chosen', () => {
    expect(missingFields(newDraft())).toContain('given');
  });
  it('marks the reason as required for a dose not given', () => {
    expect(missingFields(newDraft({ given: false }))).toEqual([
      'notGivenReason',
    ]);
    expect(
      missingFields(newDraft({ given: false, notGivenReason: 'REFUSED' }))
    ).toEqual([]);
  });
  it('marks the facility name as required for another facility', () => {
    const draft = newDraft({
      given: true,
      facility: OTHER_FACILITY,
      facilityFreeText: '  ',
    });
    expect(missingFields(draft)).toEqual(['facilityFreeText']);
  });
});

describe('OMS-REG-DIS-06.5 / OMS-REG-DIS-06.11 — a comment is optional', () => {
  it('never asks for a comment, given or not given', () => {
    expect(missingFields(newDraft({ given: true, comment: '' }))).toEqual([]);
    expect(
      missingFields(
        newDraft({ given: false, notGivenReason: 'REFUSED', comment: '' })
      )
    ).toEqual([]);
  });
});

describe('OMS-REG-DIS-06.9 / OMS-REG-DIS-06.10 — not given carries no item or batch', () => {
  it('offers no batch, and sends no item or batch', () => {
    const draft = newDraft({
      given: false,
      notGivenReason: 'REFUSED',
      itemId: 'dpt',
      stockLineId: 'sl-a',
    });
    expect(showsBatch(draft, ctxFor())).toBe(false);
    expect(
      insertInput(draft, {
        id: 'n',
        encounterId: 'e',
        vaccineCourseDoseId: 'd',
      })
    ).toMatchObject({
      given: false,
      notGivenReason: 'REFUSED',
      itemId: null,
      stockLineId: null,
    });
  });
});

describe('OMS-REG-DIS-06.14 / OMS-REG-DIS-06.56 — given at another facility', () => {
  const draft = newDraft({
    given: true,
    itemId: 'dpt',
    facility: OTHER_FACILITY,
    facilityFreeText: 'Hogsmeade',
  });
  it('offers no batch, and hides the clinician', () => {
    expect(showsBatch(draft, ctxFor())).toBe(false);
    expect(isOtherFacility(draft, ctxFor())).toBe(true);
  });
  it('sends the facility as free text, with no batch and no clinician', () => {
    expect(
      insertInput(
        { ...draft, stockLineId: 'sl-a' },
        { id: 'n', encounterId: 'e', vaccineCourseDoseId: 'd' }
      )
    ).toMatchObject({
      facilityNameId: null,
      facilityFreeText: 'Hogsmeade',
      clinicianId: null,
      stockLineId: null,
    });
  });
});

describe('OMS-REG-DIS-06.15 / OMS-REG-DIS-06.16 / OMS-REG-DIS-06.17 — a past-dated dose', () => {
  const past = newDraft({ given: true, itemId: 'dpt', date: '2026-10-01' });
  it('offers "Record stock transaction for past vaccination", on', () => {
    expect(switchLabel(past, ctxFor())).toBe('label.record-stock-transaction');
    expect(past.createTransactions).toBe(true);
  });
  it('with the switch off, hides the batch and sends none — no prescription', () => {
    const off = { ...past, createTransactions: false, stockLineId: 'sl-a' };
    expect(showsBatch(off, ctxFor())).toBe(false);
    expect(
      insertInput(off, { id: 'n', encounterId: 'e', vaccineCourseDoseId: 'd' })
        .stockLineId
    ).toBeNull();
  });
  it('with the switch on and a batch, sends the batch — the server issues the dose', () => {
    const on = { ...past, stockLineId: 'sl-a' };
    expect(showsBatch(on, ctxFor())).toBe(true);
    expect(
      insertInput(on, { id: 'n', encounterId: 'e', vaccineCourseDoseId: 'd' })
        .stockLineId
    ).toBe('sl-a');
  });
});

describe('OMS-REG-DIS-06.43 / OMS-REG-DIS-06.4 — a dose given here without a batch', () => {
  it('sends no batch', () => {
    const draft = newDraft({ given: true, itemId: 'dpt' });
    expect(
      insertInput(draft, {
        id: 'n',
        encounterId: 'e',
        vaccineCourseDoseId: 'd',
      }).stockLineId
    ).toBeNull();
  });
  it('asks before saving on a course with items, dated today', () => {
    expect(
      confirmations(newDraft({ given: true, itemId: 'dpt' }), ctxFor(), {
        confirmsSkip: false,
        suggestedDate: null,
      })
    ).toEqual(['noBatch']);
  });
  it('does not ask for a past date with the switch off, nor on a course with no items', () => {
    const past = newDraft({
      given: true,
      itemId: 'dpt',
      date: '2026-10-01',
      createTransactions: false,
    });
    expect(
      confirmations(past, ctxFor(), {
        confirmsSkip: false,
        suggestedDate: null,
      })
    ).toEqual([]);
    const noItems = ctxFor({ courseItemIds: [] });
    expect(
      confirmations(newDraft({ given: true }, noItems), noItems, {
        confirmsSkip: false,
        suggestedDate: null,
      })
    ).toEqual([]);
  });
});

describe('OMS-FUN-VAC-002.5 / OMS-REG-DIS-06.39 — the save questions, in order', () => {
  it('asks to confirm an early dose, naming the suggested date — not refusing it', () => {
    const draft = newDraft({ given: true, itemId: 'dpt', stockLineId: 'sl-a' });
    expect(
      confirmations(draft, ctxFor(), {
        confirmsSkip: false,
        suggestedDate: '2026-10-20',
      })
    ).toEqual(['early']);
  });
  it('asks skip, then early, then no batch', () => {
    const draft = newDraft({ given: true, itemId: 'dpt' });
    expect(
      confirmations(draft, ctxFor(), {
        confirmsSkip: true,
        suggestedDate: '2026-10-20',
      })
    ).toEqual(['skip', 'early', 'noBatch']);
  });
});

describe('OMS-REG-DIS-06.18 / OMS-REG-DIS-06.19 / OMS-REG-DIS-06.51 — un-giving a dose with a prescription', () => {
  const ctx = ctxFor({ vaccination: recorded() });
  const unGiven = {
    ...initialDraft(ctx),
    given: false,
    notGivenReason: 'OUT_OF_STOCK',
  };
  it('offers "Revert existing stock transaction", off', () => {
    expect(switchLabel(unGiven, ctx)).toBe('label.revert-existing-transaction');
    expect(unGiven.createTransactions).toBe(false);
  });
  it('sends the change with the switch as updateTransactions, clearing item and batch', () => {
    expect(
      updateInput({ ...unGiven, createTransactions: true }, ctx)
    ).toMatchObject({
      id: 'vax-1',
      given: false,
      notGivenReason: 'OUT_OF_STOCK',
      itemId: { value: null },
      stockLineId: { value: null },
      updateTransactions: true,
    });
    expect(updateInput(unGiven, ctx).updateTransactions).toBe(false);
  });
});

describe("OMS-REG-DIS-06.20 — changing a given dose's batch", () => {
  const ctx = ctxFor({ vaccination: recorded() });
  it('offers "Update stock transactions" and sends the new batch', () => {
    const draft = {
      ...initialDraft(ctx),
      stockLineId: 'sl-b',
      createTransactions: true,
    };
    expect(switchLabel(draft, ctx)).toBe('label.update-transactions');
    expect(updateInput(draft, ctx)).toMatchObject({
      stockLineId: { value: 'sl-b' },
      updateTransactions: true,
    });
  });
});

describe('OMS-REG-DIS-06.21 — changing a not-given dose to given', () => {
  const ctx = ctxFor({
    vaccination: recorded({
      given: false,
      givenStoreId: null,
      notGivenReason: 'REFUSED',
      item: null,
      stockLine: null,
      invoice: null,
    }),
  });
  it('offers the switch and sends the item and batch', () => {
    const draft = {
      ...initialDraft(ctx),
      given: true,
      itemId: 'dpt',
      stockLineId: 'sl-a',
    };
    expect(switchLabel(draft, ctx)).toBe('label.record-stock-transaction');
    expect(
      updateInput({ ...draft, createTransactions: true }, ctx)
    ).toMatchObject({
      given: true,
      notGivenReason: null,
      itemId: { value: 'dpt' },
      stockLineId: { value: 'sl-a' },
      updateTransactions: true,
    });
  });
});

describe('OMS-REG-DIS-06.52 / OMS-REG-DIS-06.53 — a dose given at another store', () => {
  const ctx = ctxFor({
    vaccination: recorded({ givenStoreId: 'store-other' }),
  });
  it('is recognised as given elsewhere', () => {
    expect(givenAtOtherStore(ctx)).toBe(true);
  });
  it('sends its comment alone, never a status, item or batch change', () => {
    const draft = {
      ...initialDraft(ctx),
      given: false,
      comment: 'checked card',
    };
    expect(updateInput(draft, ctx)).toEqual({
      id: 'vax-1',
      comment: 'checked card',
    });
  });
  it('offers no stock switch and no batch', () => {
    const draft = initialDraft(ctx);
    expect(switchLabel(draft, ctx)).toBeNull();
    expect(showsBatch(draft, ctx)).toBe(false);
  });
});

describe("OMS-REG-DIS-06.54 — clearing a recorded dose's comment", () => {
  it('sends it empty, which the server stores (null would keep the old one)', () => {
    const ctx = ctxFor({ vaccination: recorded() });
    expect(
      updateInput({ ...initialDraft(ctx), comment: '' }, ctx).comment
    ).toBe('');
  });
});

describe('OMS-REG-DIS-06.44 / OMS-REG-DIS-06.46 — the batch list', () => {
  it("counts each batch's doses: doses per unit × available packs × pack size", () => {
    expect(batchDoses(3, { availableNumberOfPacks: 20, packSize: 1 })).toBe(60);
    expect(batchDoses(3, { availableNumberOfPacks: 10, packSize: 10 })).toBe(
      300
    );
  });
  it('lets no batch holding less than one dose be chosen', () => {
    expect(
      batchChoosable(1, { availableNumberOfPacks: 0.5, packSize: 1 })
    ).toBe(false);
    expect(
      batchChoosable(3, { availableNumberOfPacks: 0.5, packSize: 1 })
    ).toBe(true);
  });
  it('presets the only batch holding a dose, and none when several do', () => {
    const tiny = { id: 'tiny', availableNumberOfPacks: 0.5, packSize: 1 };
    const one = { id: 'one', availableNumberOfPacks: 4, packSize: 1 };
    expect(presetBatch(1, [tiny, one])).toBe('one');
    expect(presetBatch(1, [one, { ...one, id: 'two' }])).toBeNull();
  });
});

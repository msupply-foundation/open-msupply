import { describe, expect, it } from 'vitest';
import {
  candidateLabel,
  candidateLabelParams,
  canSaveLine,
  destinationDiffersFromSource,
  excludeAddedBatches,
  isCandidateDisabled,
  packsInBounds,
} from './stockMovementLineEdit';
import type { DraftStockMovementLineFragment } from './stockMovementDraftLines.generated';

// Anchors: spec/stock-movements/cases/OMS-REG-SMV-09.
//   .8  — batch picker excludes batches already on the movement
//   .9  — a location-held batch option is disabled, labelled on hold
//   .10/.14 — the batch's current location is not a valid destination
//   .11 — packs bounded 1…available
//   .12 — below one pack rejected; fractions above one accepted
//   .13 — above available rejected (available caps, not total)
// (rules.md § lines, § line candidates; ui-surface.md § S3)

const candidate = (
  over: Partial<DraftStockMovementLineFragment> = {}
): DraftStockMovementLineFragment => ({
  id: 'sl1',
  stockLineId: 'sl1',
  itemId: 'i1',
  itemCode: '037020',
  itemName: 'Paracetamol 500mg tabs',
  restrictedLocationTypeId: null,
  batch: 'C56898',
  expiryDate: null,
  packSize: 100,
  availableNumberOfPacks: 30,
  totalNumberOfPacks: 40,
  onHold: false,
  numberOfPacks: null,
  sourceLocation: { id: 'locB2', code: 'B2', onHold: false },
  destinationLocation: null,
  ...over,
});

describe('OMS-REG-SMV-09.8 — already-added batches are excluded', () => {
  it('withholds candidates whose batch is already on the movement', () => {
    const kept = excludeAddedBatches(
      [candidate(), candidate({ id: 'sl2', stockLineId: 'sl2' })],
      ['sl1']
    );
    expect(kept.map(c => c.stockLineId)).toEqual(['sl2']);
  });

  it("never excludes the edited line's own batch from its own edit", () => {
    const kept = excludeAddedBatches([candidate()], ['sl1'], 'sl1');
    expect(kept.map(c => c.stockLineId)).toEqual(['sl1']);
  });
});

describe('OMS-REG-SMV-09.9 — held-location candidates disable, labelled', () => {
  it('disables only on a held LOCATION — a held batch stays selectable', () => {
    expect(isCandidateDisabled(candidate({ onHold: true }))).toBe(false);
    expect(
      isCandidateDisabled(
        candidate({ sourceLocation: { id: 'l', code: 'X', onHold: true } })
      )
    ).toBe(true);
  });

  it('labels from TOTAL packs, with dashes for a missing batch or location', () => {
    expect(candidateLabelParams(candidate())).toEqual({
      batch: 'C56898',
      packSize: '100',
      packs: '40',
      location: 'B2',
    });
    expect(
      candidateLabelParams(candidate({ batch: null, sourceLocation: null }))
    ).toMatchObject({ batch: '-', location: '-' });
  });

  it('suffixes the on-hold label on a location-held candidate only', () => {
    const held = candidate({
      sourceLocation: { id: 'l', code: 'X', onHold: true },
    });
    expect(candidateLabel(held).endsWith(')')).toBe(true);
    expect(candidateLabel(held)).not.toBe(candidateLabel(candidate()));
    expect(candidateLabel(candidate()).endsWith(')')).toBe(false);
  });
});

describe('OMS-REG-SMV-09.10/.14 — destination must differ from source', () => {
  it('rejects the current location and requires one at all', () => {
    expect(destinationDiffersFromSource('locB2', candidate())).toBe(false);
    expect(destinationDiffersFromSource(undefined, candidate())).toBe(false);
    expect(destinationDiffersFromSource('locC1', candidate())).toBe(true);
  });
});

describe('OMS-REG-SMV-09.11/.12/.13 — quantity bounds', () => {
  it('caps at AVAILABLE packs, not total', () => {
    expect(packsInBounds(30, 30)).toBe(true);
    expect(packsInBounds(31, 30)).toBe(false); // total is 40; available caps
  });

  it('floors at one pack, accepting fractions above it', () => {
    expect(packsInBounds(0.5, 30)).toBe(false);
    expect(packsInBounds(1, 30)).toBe(true);
    expect(packsInBounds(2.5, 30)).toBe(true);
  });

  // A pack size of 1,000 leaves holdings like 1.003 available packs, so the
  // ceiling is exact to more than two decimals. The editor's field once capped
  // entry at 2 dp, which rounded 1.003 to 1.00 and made moving the WHOLE line
  // impossible — its decimalLimit has to carry the batch's own precision.
  it('accepts a ceiling carrying more than two decimals', () => {
    expect(packsInBounds(1.003, 1.003)).toBe(true);
    expect(packsInBounds(1.0031, 1.003)).toBe(false);
  });
});

describe('save gate (ui-surface § S3)', () => {
  it('needs batch + differing destination + in-bounds quantity together', () => {
    const c = candidate();
    expect(
      canSaveLine({ candidate: c, destinationId: 'locC1', packs: 5 })
    ).toBe(true);
    expect(
      canSaveLine({ candidate: undefined, destinationId: 'locC1', packs: 5 })
    ).toBe(false);
    expect(
      canSaveLine({ candidate: c, destinationId: 'locB2', packs: 5 })
    ).toBe(false);
    expect(
      canSaveLine({ candidate: c, destinationId: 'locC1', packs: 999 })
    ).toBe(false);
  });
});

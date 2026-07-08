import { DailyTallyConfig } from '../../types';
import { BatchEntry, countKey } from '../draft';
import {
  computeCoverageTables,
  computeStockMovementRows,
} from '../Summary/summaryMath';
import { buildDisplaySnapshot, reconstructVaccineData } from './displaySnapshot';
import {
  ItemWithBatches,
  UseVaccineBatchDataResult,
} from './useVaccineBatchData';

// Vaccine item, on two courses below to exercise the shared-item pooling.
const bcgItem: ItemWithBatches = {
  id: 'item-bcg',
  name: 'BCG Vaccine',
  code: 'BCG001',
  unitName: 'vial',
  doses: 20,
  isVaccine: true,
  batches: [
    {
      id: 'sl-bcg',
      batch: 'B2026-01',
      expiryDate: '2027-06-30',
      availableNumberOfPacks: 50,
      // Kept == available so the round-trip is exact (total isn't snapshotted).
      totalNumberOfPacks: 50,
      packSize: 1,
    },
  ],
};

const syringe: ItemWithBatches = {
  id: 'item-syringe',
  name: 'Syringe',
  code: 'SYR',
  unitName: 'each',
  doses: 1,
  isVaccine: false,
  batches: [
    {
      id: 'sl-syr',
      batch: null,
      expiryDate: null,
      availableNumberOfPacks: 100,
      totalNumberOfPacks: 100,
      packSize: 1,
    },
  ],
};

// A resolved result as the live join would produce it: one course, plus a
// pooled non-vaccine item, with the stock-line lookup built across both.
const liveData = (): UseVaccineBatchDataResult => {
  const itemByStockLineId: Record<string, ItemWithBatches> = {
    'sl-bcg': bcgItem,
    'sl-syr': syringe,
  };
  return {
    courses: [
      {
        id: 'vc-bcg',
        name: 'BCG',
        demographicId: 'dem-0-11m',
        items: [bcgItem],
        configuredDoseIds: ['vcd-bcg-1'],
        doseLabelById: { 'vcd-bcg-1': 'BCG 1' },
      },
    ],
    nonVaccineItems: [syringe],
    itemByStockLineId,

    isLoading: false,
    isError: false,
  };
};

const config: DailyTallyConfig = {
  demographic_groups: [
    {
      id: 'dg1',
      label: 'Children 0-11m',
      summary_label: 'Children',
      counters: [
        { id: 'c-m', label: 'Male' },
        { id: 'c-f', label: 'Female' },
      ],
      doses: [
        { id: 'd-bcg', vaccine_course_dose_id: 'vcd-bcg-1', display_name: 'BCG 1' },
      ],
    },
  ],
  non_vaccine_items: [{ id: 'nv1', item_id: 'item-syringe' }],
  wastage_reasons: { open_vial: '', negative_adjustment: '' },
  summary_tables: [
    { id: 'st1', label: 'Vaccination Summary', subtotal_label: 'Total', columns: ['dg1'] },
  ],
};

const counts: Record<string, number> = {
  [countKey('d-bcg', 'c-m')]: 8,
  [countKey('d-bcg', 'c-f')]: 12,
};

const batches: Record<string, BatchEntry> = {
  'sl-bcg': {
    issued: 20,
    openVialWastageDoses: 0,
    wasted: 0,
    hasOpenVialWastage: false,
  },
  'sl-syr': {
    issued: 20,
    openVialWastageDoses: 0,
    wasted: 0,
    hasOpenVialWastage: false,
  },
};

describe('displaySnapshot', () => {
  it('round-trips: build then reconstruct equals the original resolved data', () => {
    const live = liveData();
    const reconstructed = reconstructVaccineData(buildDisplaySnapshot(live));
    expect(reconstructed).toEqual(live);
  });

  it('pools an item shared across courses once, referenced by id', () => {
    const live = liveData();
    // Same item id on a second course.
    live.courses.push({
      ...live.courses[0]!,
      id: 'vc-bcg-2',
      configuredDoseIds: ['vcd-bcg-2'],
      doseLabelById: { 'vcd-bcg-2': 'BCG 2' },
    });
    const snapshot = buildDisplaySnapshot(live);
    // item-bcg (shared) + item-syringe = 2 entries, not 3.
    expect(snapshot.items.map(i => i.id).sort()).toEqual([
      'item-bcg',
      'item-syringe',
    ]);
    expect(reconstructVaccineData(snapshot)).toEqual(live);
  });

  it('produces identical stock-movement rows from snapshot vs live', () => {
    const live = liveData();
    const reconstructed = reconstructVaccineData(buildDisplaySnapshot(live));
    const fromLive = computeStockMovementRows(
      config,
      batches,
      live.courses,
      live.nonVaccineItems
    );
    const fromSnapshot = computeStockMovementRows(
      config,
      batches,
      reconstructed.courses,
      reconstructed.nonVaccineItems
    );
    expect(fromSnapshot).toEqual(fromLive);
    // Sanity: opening stock and issued actually came through.
    const bcgRow = fromSnapshot.find(r => r.itemId === 'item-bcg')!;
    expect(bcgRow.openingStock).toBe(1000); // 50 packs × 20 doses
    expect(bcgRow.issued).toBe(20);
  });

  it('produces identical coverage tables from snapshot vs live', () => {
    const live = liveData();
    const reconstructed = reconstructVaccineData(buildDisplaySnapshot(live));
    expect(computeCoverageTables(config, counts, reconstructed.courses)).toEqual(
      computeCoverageTables(config, counts, live.courses)
    );
  });

  it('still renders rows from the snapshot when the live join is empty (deleted courses)', () => {
    const snapshot = buildDisplaySnapshot(liveData());
    const reconstructed = reconstructVaccineData(snapshot);

    // Simulates the bug: courses deleted, so the live join returns nothing.
    const deletedLive: UseVaccineBatchDataResult = {
      courses: [],
      nonVaccineItems: [],
      itemByStockLineId: {},
  
      isLoading: false,
      isError: false,
    };

    const fromSnapshot = computeStockMovementRows(
      config,
      batches,
      reconstructed.courses,
      reconstructed.nonVaccineItems
    );
    const fromDeletedLive = computeStockMovementRows(
      config,
      batches,
      deletedLive.courses,
      deletedLive.nonVaccineItems
    );

    expect(fromSnapshot.length).toBeGreaterThan(0);
    expect(fromDeletedLive).toHaveLength(0);
  });
});

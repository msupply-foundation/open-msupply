import { CoverageEntry, DailyTallyConfig, TallyConfigSnapshot } from '../types';
import {
  countKey,
  resolveCoverageCounts,
  reviewCoverageConfig,
  stableCellId,
} from './draft';

// Current config: one group ("0-11 months") with Male/Female counters and BCG
// (vcd-bcg1). The ids below are the "current" generation; historical entries
// below were stored under older generations of these ids.
const config: DailyTallyConfig = {
  demographic_groups: [
    {
      id: 'dg-0-11m',
      label: '0-11 months',
      counters: [
        { id: 'c-m', label: 'Male' },
        { id: 'c-f', label: 'Female' },
      ],
      doses: [
        {
          id: 'd-bcg',
          vaccine_course_dose_id: 'vcd-bcg1',
          display_name: 'BCG',
        },
      ],
    },
  ],
  non_vaccine_items: [],
  wastage_reasons: { open_vial: '', negative_adjustment: '' },
  summary_tables: [],
};

const entry = (e: Partial<CoverageEntry>): CoverageEntry => ({
  demographic_group_id: 'dg-0-11m',
  dose_id: 'd-bcg',
  vaccine_course_dose_id: 'vcd-bcg1',
  counter_id: 'c-m',
  count: 1,
  ...e,
});

describe('stableCellId', () => {
  it('joins group label, vaccine_course_dose_id, counter label', () => {
    // Must match the report port byte-for-byte.
    expect(stableCellId('0-11 months', 'vcd-bcg1', 'Male')).toBe(
      '0-11 months::vcd-bcg1::Male'
    );
  });
});

describe('resolveCoverageCounts', () => {
  it('resolves an entry whose config UUIDs were regenerated, via stable labels', () => {
    // Stored under an OLD config generation (stale dose_id/counter_id), but
    // carries the stable labels → resolves to the current cell.
    const counts = resolveCoverageCounts(config, [
      entry({
        dose_id: 'OLD-bcg',
        counter_id: 'OLD-m',
        count: 5,
        demographic_group_label: '0-11 months',
        counter_label: 'Male',
      }),
    ]);
    expect(counts[countKey('d-bcg', 'c-m')]).toBe(5);
    expect(counts[countKey('OLD-bcg', 'OLD-m')]).toBeUndefined();
  });

  it('aggregates two entries (different stale id generations) into one cell', () => {
    const counts = resolveCoverageCounts(config, [
      entry({ dose_id: 'v1-bcg', counter_id: 'v1-m', count: 4,
        demographic_group_label: '0-11 months', counter_label: 'Male' }),
      entry({ dose_id: 'v2-bcg', counter_id: 'v2-m', count: 7,
        demographic_group_label: '0-11 months', counter_label: 'Male' }),
    ]);
    expect(counts[countKey('d-bcg', 'c-m')]).toBe(11);
  });

  it('uses the legacy id key for label-less entries (config unchanged since submission)', () => {
    const counts = resolveCoverageCounts(config, [
      entry({ dose_id: 'd-bcg', counter_id: 'c-m', count: 3 }),
    ]);
    // Legacy fallback resolves because the ids still match the current config.
    expect(counts[countKey('d-bcg', 'c-m')]).toBe(3);
  });

  it('keeps a label-less entry with stale ids under its own key (forward-only limit)', () => {
    const counts = resolveCoverageCounts(config, [
      entry({ dose_id: 'gone-bcg', counter_id: 'gone-m', count: 9 }),
    ]);
    expect(counts[countKey('d-bcg', 'c-m')]).toBeUndefined();
    expect(counts[countKey('gone-bcg', 'gone-m')]).toBe(9);
  });

  it('returns an empty map for no entries, and tolerates an undefined config', () => {
    expect(resolveCoverageCounts(config, [])).toEqual({});
    // No config → every entry falls back to its raw id key.
    expect(
      resolveCoverageCounts(undefined, [entry({ count: 2 })])
    ).toEqual({ [countKey('d-bcg', 'c-m')]: 2 });
  });
});

describe('reviewCoverageConfig', () => {
  // A snapshot whose structure/labels differ from the live `config` above, to
  // prove the frozen slice (not the live config) drives the coverage surfaces.
  const snapshot: TallyConfigSnapshot = {
    demographic_groups: [
      {
        id: 'frozen-grp',
        label: '0-11 months (as submitted)',
        counters: [{ id: 'frozen-c', label: 'Male' }],
        doses: [
          { id: 'frozen-d', vaccine_course_dose_id: 'vcd-bcg1', display_name: 'BCG' },
        ],
      },
    ],
    summary_tables: [
      { id: 'frozen-st', label: 'Frozen table', subtotal_label: 'Sub', columns: ['frozen-grp'] },
    ],
  };

  it('returns the live config unchanged when there is no snapshot (legacy rows)', () => {
    expect(reviewCoverageConfig(config, undefined)).toBe(config);
  });

  it('overlays the frozen groups/tables onto the live config, keeping its other fields', () => {
    const result = reviewCoverageConfig(config, snapshot)!;
    expect(result.demographic_groups).toBe(snapshot.demographic_groups);
    expect(result.summary_tables).toBe(snapshot.summary_tables);
    // Non-coverage fields still come from the live config.
    expect(result.non_vaccine_items).toBe(config.non_vaccine_items);
    expect(result.wastage_reasons).toBe(config.wastage_reasons);
  });

  it('synthesizes a config from the snapshot when the live config is gone', () => {
    const result = reviewCoverageConfig(undefined, snapshot)!;
    expect(result.demographic_groups).toBe(snapshot.demographic_groups);
    expect(result.summary_tables).toBe(snapshot.summary_tables);
    // Other fields default to empty so the coverage views still render.
    expect(result.non_vaccine_items).toEqual([]);
    expect(result.wastage_reasons).toEqual({
      open_vial: '',
      closed_vial: '',
      negative_adjustment: '',
    });
  });
});

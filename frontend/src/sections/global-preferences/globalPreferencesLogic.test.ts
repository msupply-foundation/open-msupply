import { describe, expect, it } from 'vitest';
import {
  asBackdatingParts,
  asBool,
  asNumber,
  buildAutoSaveInput,
  canEditGlobalPreferences,
  filterCatalogue,
  genderLabelKey,
  groupPreferences,
  isAmcExplainerShown,
  matchesPreferenceFilter,
  OFFERED_GENDER_OPTIONS,
  preferenceLabelKey,
  selectedGenders,
  toggleGender,
  type GlobalPreference,
} from './globalPreferencesLogic';

// The served catalogue in its live order (probed against a running central
// server — spec/global-preferences/ui-surface.md § S1 › The catalogue).
const pref = (
  key: GlobalPreference['key'],
  valueType: GlobalPreference['valueType'],
  value: unknown = false
): GlobalPreference => ({ key, valueType, value });

const CATALOGUE: GlobalPreference[] = [
  pref('allowTrackingOfStockByDonor', 'BOOLEAN'),
  pref('authorisePurchaseOrder', 'BOOLEAN'),
  pref('customTranslationsV2', 'CUSTOM_TRANSLATIONS_V2', {}),
  pref('genderOptions', 'MULTI_CHOICE', [...OFFERED_GENDER_OPTIONS]),
  pref('preventTransfersMonthsBeforeInitialisation', 'INTEGER', 3),
  pref('showContactTracing', 'BOOLEAN'),
  pref('syncRecordsDisplayThreshold', 'INTEGER', 0),
  pref('warningForExcessRequest', 'BOOLEAN'),
  pref('adjustForNumberOfDaysOutOfStock', 'BOOLEAN'),
  pref('daysInMonth', 'FLOAT', 0),
  pref('expiredStockPreventIssue', 'BOOLEAN'),
  pref('expiredStockIssueThreshold', 'INTEGER', 0),
  pref('itemMarginOverridesSupplierMargin', 'BOOLEAN'),
  pref('isGaps', 'BOOLEAN'),
  pref('displayPopulationBasedForecasting', 'BOOLEAN'),
  pref('backdating', 'BACKDATING_DATA', {
    shipmentsEnabled: false,
    inventoryAdjustmentsEnabled: false,
    maxDays: 0,
  }),
];

// Label lookup for filter tests — English labels, as displayed.
const LABELS: Partial<Record<GlobalPreference['key'], string>> = {
  allowTrackingOfStockByDonor: 'Allow tracking of stock by donor',
  authorisePurchaseOrder: 'Authorise purchase orders',
  expiredStockPreventIssue: 'Prevent issuing expired stock',
  expiredStockIssueThreshold: 'Expired stock issue threshold (days)',
  daysInMonth: 'Days in a month',
  adjustForNumberOfDaysOutOfStock: 'Adjust for number of days out of stock',
  backdating: 'Backdating',
};
const labelOf = (preference: GlobalPreference) =>
  LABELS[preference.key] ?? preference.key;
const GROUP_LABELS = {
  'label.procurement': 'Procurement',
  'title.average-monthly-consumption': 'Average monthly consumption',
  'label.expired-stock': 'Expired stock',
  'label.backdating': 'Backdating',
} as const;
const groupLabelOf = (group: { labelKey: keyof typeof GROUP_LABELS }) =>
  GROUP_LABELS[group.labelKey];

describe('grouping (OMS-REG-GPREF-01.2)', () => {
  it('splits the catalogue into ungrouped rows and the four groups, in served order', () => {
    const { ungrouped, groups } = groupPreferences(CATALOGUE);
    expect(ungrouped.map(p => p.key)).toEqual([
      'allowTrackingOfStockByDonor',
      'customTranslationsV2',
      'genderOptions',
      'preventTransfersMonthsBeforeInitialisation',
      'showContactTracing',
      'syncRecordsDisplayThreshold',
      'warningForExcessRequest',
      'itemMarginOverridesSupplierMargin',
      'isGaps',
      'displayPopulationBasedForecasting',
    ]);
    // Groups ordered by their FIRST member's catalogue position — Procurement
    // first (authorisePurchaseOrder is row 2), then AMC, Expired stock,
    // Backdating (as observed live).
    expect(groups.map(g => g.labelKey)).toEqual([
      'label.procurement',
      'title.average-monthly-consumption',
      'label.expired-stock',
      'label.backdating',
    ]);
    // Members keep catalogue order, not config order.
    expect(
      groups
        .find(g => g.labelKey === 'title.average-monthly-consumption')
        ?.members.map(m => m.key)
    ).toEqual(['adjustForNumberOfDaysOutOfStock', 'daysInMonth']);
  });
});

describe('filter (OMS-REG-GPREF-01.4/.5/.6)', () => {
  const grouped = groupPreferences(CATALOGUE);

  it('matches labels case-insensitively; a blank term matches everything', () => {
    expect(matchesPreferenceFilter('Days in a month', 'DAYS')).toBe(true);
    expect(matchesPreferenceFilter('Days in a month', '')).toBe(true);
    expect(matchesPreferenceFilter('Days in a month', 'zzz')).toBe(false);
  });

  it('a member match keeps the whole group (.5)', () => {
    const filtered = filterCatalogue(
      grouped,
      labelOf,
      groupLabelOf,
      'issue threshold'
    );
    expect(filtered.ungrouped).toEqual([]);
    expect(filtered.groups.map(g => g.labelKey)).toEqual([
      'label.expired-stock',
    ]);
    // Whole group, both members.
    expect(filtered.groups[0]?.members).toHaveLength(2);
  });

  it('a group-label match keeps the group even when no member label matches (.5)', () => {
    const filtered = filterCatalogue(
      grouped,
      labelOf,
      groupLabelOf,
      'procurement'
    );
    expect(filtered.groups.map(g => g.labelKey)).toEqual(['label.procurement']);
  });

  it('no match leaves nothing (.6); clearing restores everything (.4)', () => {
    const none = filterCatalogue(grouped, labelOf, groupLabelOf, 'zzzqqq');
    expect(none.ungrouped).toEqual([]);
    expect(none.groups).toEqual([]);
    const all = filterCatalogue(grouped, labelOf, groupLabelOf, '');
    expect(all.ungrouped).toHaveLength(10);
    expect(all.groups).toHaveLength(4);
  });
});

describe('AMC explainer (OMS-REG-GPREF-01.7)', () => {
  const members = groupPreferences(CATALOGUE).groups.find(
    g => g.labelKey === 'title.average-monthly-consumption'
  )!.members;

  it('is hidden while both AMC preferences are inactive', () => {
    expect(isAmcExplainerShown(members, p => p.value)).toBe(false);
  });

  it('shows when the adjustment is on, or days-in-a-month is above zero', () => {
    expect(
      isAmcExplainerShown(members, p =>
        p.key === 'adjustForNumberOfDaysOutOfStock' ? true : p.value
      )
    ).toBe(true);
    expect(
      isAmcExplainerShown(members, p =>
        p.key === 'daysInMonth' ? 30.5 : p.value
      )
    ).toBe(true);
  });
});

describe('auto-save input (OMS-REG-GPREF-01.8/.9)', () => {
  it('builds a one-field input per changed preference', () => {
    expect(buildAutoSaveInput('showContactTracing', true)).toEqual({
      showContactTracing: true,
    });
    expect(buildAutoSaveInput('daysInMonth', 30.5)).toEqual({
      daysInMonth: 30.5,
    });
    expect(
      buildAutoSaveInput('preventTransfersMonthsBeforeInitialisation', 6)
    ).toEqual({ preventTransfersMonthsBeforeInitialisation: 6 });
  });

  it('coerces wrong-typed values to the kind’s zero', () => {
    expect(buildAutoSaveInput('isGaps', 'yes')).toEqual({ isGaps: false });
    expect(buildAutoSaveInput('syncRecordsDisplayThreshold', 'x')).toEqual({
      syncRecordsDisplayThreshold: 0,
    });
  });

  it('never auto-saves the translations editor’s preference (its own save path)', () => {
    expect(buildAutoSaveInput('customTranslationsV2', {})).toBeUndefined();
  });
});

describe('gender choice (OMS-REG-GPREF-01.12)', () => {
  it('offers the seven base genders with derived label keys', () => {
    expect(OFFERED_GENDER_OPTIONS).toHaveLength(7);
    expect(genderLabelKey('TRANSGENDER_FEMALE')).toBe(
      'gender.transgender-female'
    );
  });

  it('toggling rebuilds the selection in display order', () => {
    expect(toggleGender(['MALE', 'FEMALE'], 'UNKNOWN', true)).toEqual([
      'FEMALE',
      'MALE',
      'UNKNOWN',
    ]);
    expect(toggleGender(['FEMALE', 'MALE'], 'MALE', false)).toEqual(['FEMALE']);
  });

  it('permits an empty selection — no minimum enforced (rules § Editing)', () => {
    expect(toggleGender(['FEMALE'], 'FEMALE', false)).toEqual([]);
  });

  it('preserves unoffered stored members rather than silently dropping them', () => {
    const stored = ['FEMALE', 'TRANSGENDER_MALE_HORMONE'];
    expect(toggleGender(stored, 'MALE', true)).toEqual([
      'FEMALE',
      'MALE',
      'TRANSGENDER_MALE_HORMONE',
    ]);
    expect(selectedGenders(stored)).toEqual(['FEMALE']);
  });
});

describe('backdating composite (OMS-REG-GPREF-01.13)', () => {
  it('reads the three parts defensively and saves the whole value', () => {
    expect(asBackdatingParts({ shipmentsEnabled: true, maxDays: 30 })).toEqual({
      shipmentsEnabled: true,
      inventoryAdjustmentsEnabled: false,
      maxDays: 30,
    });
    expect(
      buildAutoSaveInput('backdating', {
        shipmentsEnabled: true,
        inventoryAdjustmentsEnabled: false,
        maxDays: 30,
      })
    ).toEqual({
      backdating: {
        shipmentsEnabled: true,
        inventoryAdjustmentsEnabled: false,
        maxDays: 30,
      },
    });
  });
});

describe('editability gate (OMS-REG-GPREF-01.14)', () => {
  it('requires the central server and the central-data permission together', () => {
    expect(
      canEditGlobalPreferences({
        canEditCentralData: true,
        isCentralServer: true,
      })
    ).toBe(true);
    expect(
      canEditGlobalPreferences({
        canEditCentralData: true,
        isCentralServer: false,
      })
    ).toBe(false);
    expect(
      canEditGlobalPreferences({
        canEditCentralData: false,
        isCentralServer: true,
      })
    ).toBe(false);
  });
});

describe('value coercions and labels (OMS-REG-GPREF-01.1)', () => {
  it('fabricated defaults read as the kind’s zero', () => {
    expect(asBool(undefined)).toBe(false);
    expect(asNumber(undefined)).toBe(0);
    expect(asNumber(3)).toBe(3);
  });

  it('the v2 translations row reuses the legacy label key (ui-surface § S1 row 3)', () => {
    expect(preferenceLabelKey('customTranslationsV2')).toBe(
      'preference.customTranslations'
    );
    expect(preferenceLabelKey('isGaps')).toBe('preference.isGaps');
  });
});

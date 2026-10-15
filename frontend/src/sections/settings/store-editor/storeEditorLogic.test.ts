import { describe, expect, it } from 'vitest';
import {
  allowedValues,
  asStatusList,
  asWarnParts,
  buildPreferencesInput,
  buildPreferencesVariables,
  canEditPreferences,
  filterStoreCatalogue,
  groupStorePreferences,
  isOverridable,
  overrideChoice,
  overrideGlobalValue,
  overrideSelection,
  preferenceValue,
  stagePreference,
  storedSelection,
  toggleInvoiceStatus,
  type StorePreference,
  canEditAnything,
  coordinate,
  formatCoordinate,
  formatDms,
  geolocationErrorKey,
  hasCoordinates,
  haversineKm,
  isDefinitionEditable,
  parseProperties,
  propertyFields,
  roundCoordinate,
  serialiseProperties,
  setProperty,
  type PropertyDefinition,
} from './storeEditorLogic';

// The wire's own property keys, snake_case as the server serves them — held as
// constants and used as computed keys, the same way propertySets.test.ts holds
// SUPPLY_LEVEL_KEY.
const ELECTRICITY = 'electricity_availability';
const POPULATION = 'population_served';
const FACILITY_TYPE = 'facility_type';
const UNKNOWN = 'unknown_key';

const definition = (
  key: string,
  name: string,
  overrides: Partial<PropertyDefinition['property']> & {
    remoteEditable?: boolean;
  } = {}
): PropertyDefinition => {
  const { remoteEditable = false, ...property } = overrides;
  return {
    id: `def-${key}`,
    remoteEditable,
    property: {
      id: key,
      key,
      name,
      allowedValues: null,
      valueType: 'STRING',
      ...property,
    },
  };
};

describe('storeEditorLogic — store editor (spec/settings S5)', () => {
  // OMS-REG-SET-05.28 — the panel renders one field per definition, ordered by
  // definition name, with the lat/long pair excluded (the GPS block owns it).
  it('lists every definition but the GPS pair, ordered by name (SET-05.28)', () => {
    const definitions = [
      definition('zero_dose', 'Zero Dose Coverage'),
      definition('latitude', 'Latitude', { valueType: 'FLOAT' }),
      definition(FACILITY_TYPE, 'Facility Type'),
      definition('longitude', 'Longitude', { valueType: 'FLOAT' }),
      definition(ELECTRICITY, 'Electricity Availability'),
    ];
    expect(propertyFields(definitions).map(d => d.property.name)).toEqual([
      'Electricity Availability',
      'Facility Type',
      'Zero Dose Coverage',
    ]);
  });

  // OMS-REG-SET-05.28 — a single-select offers exactly the definition's
  // allowed values, split from the one comma-separated string.
  it('splits allowed values, trimming and dropping blanks (SET-05.28)', () => {
    expect(allowedValues('Government,NGO,Private,Faith-based')).toEqual([
      'Government',
      'NGO',
      'Private',
      'Faith-based',
    ]);
    expect(allowedValues('> 16 hours, 8-16 hours ,, < 8 hours')).toEqual([
      '> 16 hours',
      '8-16 hours',
      '< 8 hours',
    ]);
    expect(allowedValues(null)).toEqual([]);
    expect(allowedValues('')).toEqual([]);
  });

  // OMS-REG-SET-05.28 — the saved values pre-fill the fields. The server
  // fabricates "{}" when nothing was ever recorded, and never validates what it
  // stores, so a non-JSON / non-object blob reads as "nothing recorded".
  it('parses the stored document, tolerating the unstored cases (SET-05.28)', () => {
    expect(
      parseProperties(
        '{"electricity_availability":"> 16 hours","population_served":1200}'
      )
    ).toEqual({ [ELECTRICITY]: '> 16 hours', [POPULATION]: 1200 });
    expect(parseProperties('{}')).toEqual({});
    expect(parseProperties(null)).toEqual({});
    expect(parseProperties('not-json')).toEqual({});
    expect(parseProperties('[1,2]')).toEqual({});
  });

  // rules § The store editor — a save replaces the facility's WHOLE recorded
  // set, so an edit must round-trip every key that was read, including keys no
  // definition covers.
  it('an edit keeps every other key in the document (SET-05.28)', () => {
    const draft = parseProperties(
      '{"electricity_availability":"> 16 hours","population_served":1200,"unknown_key":"kept"}'
    );
    const edited = setProperty(draft, POPULATION, 1500);
    expect(JSON.parse(serialiseProperties(edited))).toEqual({
      [ELECTRICITY]: '> 16 hours',
      [POPULATION]: 1500,
      [UNKNOWN]: 'kept',
    });
    // The original draft is untouched — Cancel discards by dropping the copy.
    expect(draft[POPULATION]).toBe(1200);
  });

  it('clearing a field records null rather than dropping the key (SET-05.28)', () => {
    expect(
      setProperty({ [FACILITY_TYPE]: 'NGO' }, FACILITY_TYPE, undefined)
    ).toEqual({
      [FACILITY_TYPE]: null,
    });
  });

  // OMS-REG-SET-05.29 — without the store-properties permission every field is
  // read-only; away from the central server a definition not marked
  // remote-editable is read-only too.
  it('editability needs the permission, and remote-editable off central (SET-05.29)', () => {
    const remote = definition('packaging_level', 'Packaging Level', {
      remoteEditable: true,
    });
    const local = definition(FACILITY_TYPE, 'Facility Type');

    // No permission: nothing is editable, wherever we are.
    expect(
      isDefinitionEditable(remote, { canMutate: false, isCentralServer: true })
    ).toBe(false);
    // Central server: remoteEditable is not consulted.
    expect(
      isDefinitionEditable(local, { canMutate: true, isCentralServer: true })
    ).toBe(true);
    // Remote site: only the remote-editable definition.
    expect(
      isDefinitionEditable(local, { canMutate: true, isCentralServer: false })
    ).toBe(false);
    expect(
      isDefinitionEditable(remote, { canMutate: true, isCentralServer: false })
    ).toBe(true);
  });

  // OMS-REG-SET-05.29 / .30 — Save is disabled while the session can edit
  // nothing (D79), including when the server holds no definitions at all.
  it('Save is enabled only when something is editable (SET-05.29/.30)', () => {
    const definitions = [
      definition('latitude', 'Latitude', { valueType: 'FLOAT' }),
      definition(FACILITY_TYPE, 'Facility Type'),
    ];
    expect(
      canEditAnything(definitions, { canMutate: true, isCentralServer: true })
    ).toBe(true);
    expect(
      canEditAnything(definitions, { canMutate: false, isCentralServer: true })
    ).toBe(false);
    // Remote site, nothing marked remote-editable → nothing to save.
    expect(
      canEditAnything(definitions, { canMutate: true, isCentralServer: false })
    ).toBe(false);
    // No definitions at all (the empty Properties tab).
    expect(
      canEditAnything([], { canMutate: true, isCentralServer: true })
    ).toBe(false);
  });

  // OMS-REG-SET-05.32 — the GPS block reads its pair out of the same draft the
  // property fields edit; 0,0 is indistinguishable from "never recorded".
  it('reads coordinates out of the draft, defaulting to 0 (SET-05.32)', () => {
    expect(coordinate({ latitude: -41.28 }, 'latitude')).toBe(-41.28);
    // The column is an opaque pass-through: a numeric string still reads.
    expect(coordinate({ longitude: '174.777' }, 'longitude')).toBe(174.777);
    expect(coordinate({}, 'latitude')).toBe(0);
    expect(coordinate({ latitude: 'nowhere' }, 'latitude')).toBe(0);
    expect(hasCoordinates(0, 0)).toBe(false);
    expect(hasCoordinates(-41.28, 0)).toBe(true);
  });

  // OMS-REG-SET-05.32 — Update live location rounds the device's position
  // before staging it into the draft.
  it('a captured position is rounded to six decimal places (SET-05.32)', () => {
    expect(roundCoordinate(-41.28664412345678)).toBe(-41.286644);
    expect(roundCoordinate(174.7)).toBe(174.7);
  });

  it('renders the decimal value beside its degrees-minutes-seconds form', () => {
    expect(formatDms(-41.2865, 'latitude')).toBe('S 41° 17\' 11.400"');
    expect(formatDms(174.7762, 'longitude')).toBe('E 174° 46\' 34.320"');
    expect(formatDms(0, 'latitude')).toBe('N 0° 0\' 0.000"');
    expect(formatCoordinate(0, 'longitude')).toBe('0 / E 0° 0\' 0.000"');
  });

  it('measures the distance from the device to the recorded coordinates', () => {
    // Wellington → Auckland, ~493 km great-circle.
    const distance = haversineKm(
      { latitude: -41.2865, longitude: 174.7762 },
      { latitude: -36.8485, longitude: 174.7633 }
    );
    expect(distance).toBeGreaterThan(490);
    expect(distance).toBeLessThan(497);
    expect(
      haversineKm(
        { latitude: -41.2865, longitude: 174.7762 },
        { latitude: -41.2865, longitude: 174.7762 }
      )
    ).toBe(0);
  });

  it('names each geolocation failure by its browser error code', () => {
    expect(geolocationErrorKey(1)).toBe('error.permission-denied');
    expect(geolocationErrorKey(2)).toBe('error.position-unavailable');
    expect(geolocationErrorKey(3)).toBe('error.timeout');
    expect(geolocationErrorKey(99)).toBe('error.unknown-geolocation-error');
  });
});

// ---------------------------------------------------------------------------
// The Preferences tab (rules § The store editor › Preferences,
// OMS-REG-SET-05.33–.39)

const preference = (
  key: StorePreference['key'],
  valueType: StorePreference['valueType'],
  value: unknown
): StorePreference => ({ key, valueType, value, storeOverride: null });

/* An overridable global preference as the STORE listing serves it: `value` is
   what applies in this store, `storeOverride` says how it got there. */
const overridable = (
  value: boolean,
  isOverridden: boolean,
  globalValue: boolean
): StorePreference => ({
  key: 'authorisePurchaseOrder',
  valueType: 'BOOLEAN',
  value,
  storeOverride: { isOverridden, globalValue },
});

describe('preferenceValue', () => {
  it('shows the staged edit over the served value, including a staged falsy', () => {
    const pref = preference('blindStocktake', 'BOOLEAN', true);
    expect(preferenceValue(pref, {})).toBe(true);
    expect(preferenceValue(pref, { blindStocktake: false })).toBe(false);
  });
});

describe('the three states of an overridable preference (SET-05.59)', () => {
  it('a store with no row of its own records "follow global", not the value it shows', () => {
    const following = overridable(true, false, true);
    // What applies is the global true; what the STORE records is "follow".
    expect(following.value).toBe(true);
    expect(storedSelection(following)).toBeNull();
    expect(overrideChoice(preferenceValue(following, {}))).toBe('global');
  });

  it('distinguishes a followed value from a pinned one that reads the same', () => {
    // The pair the old two-state control could not tell apart: both show
    // "off", and only one of them would survive the global value changing.
    const followed = overridable(false, false, false);
    const pinned = overridable(false, true, false);
    expect(overrideChoice(preferenceValue(followed, {}))).toBe('global');
    expect(overrideChoice(preferenceValue(pinned, {}))).toBe('off');
  });

  it('a plain store preference has no third state', () => {
    const plain = preference('blindStocktake', 'BOOLEAN', false);
    expect(isOverridable(plain)).toBe(false);
    expect(storedSelection(plain)).toBe(false);
    expect(overrideChoice(preferenceValue(plain, {}))).toBe('off');
  });

  it('maps each choice to what the save carries', () => {
    expect(overrideSelection('global')).toBeNull();
    expect(overrideSelection('on')).toBe(true);
    expect(overrideSelection('off')).toBe(false);
  });

  it('reads the global value, not the value the store shows', () => {
    expect(overrideGlobalValue(overridable(true, false, true))).toBe(true);
    expect(overrideGlobalValue(overridable(true, true, false))).toBe(false);
    expect(
      overrideGlobalValue(preference('blindStocktake', 'BOOLEAN', true))
    ).toBe(false);
  });
});

describe('stagePreference — an edit back to the stored state stages nothing (SET-05.60)', () => {
  it('drops the key when a toggle returns to what the store records', () => {
    const pref = preference('blindStocktake', 'BOOLEAN', false);
    const on = stagePreference({}, pref, true);
    expect(on).toEqual({ blindStocktake: true });
    expect(stagePreference(on, pref, false)).toEqual({});
  });

  it('a no-op flick never pins a store that was merely following global', () => {
    // The accident the reviewer found: on-then-off wrote a row equal to the
    // global value, silently opting the store out of every later change.
    const following = overridable(true, false, true);
    const pinned = stagePreference({}, following, false);
    expect(pinned).toEqual({ authorisePurchaseOrder: false });
    expect(stagePreference(pinned, following, null)).toEqual({});
  });

  it('choosing "use global" on an overridden store IS a change, and stages the clear', () => {
    const overridden = overridable(false, true, true);
    expect(stagePreference({}, overridden, null)).toEqual({
      authorisePurchaseOrder: null,
    });
    // ...while re-choosing the value it is already pinned to is not.
    expect(stagePreference({}, overridden, false)).toEqual({});
  });

  it('compares composites by content, not identity', () => {
    const parts = { enabled: true, maxAge: 30, minItems: 5 };
    const pref = preference(
      'warnWhenMissingRecentStocktake',
      'WARN_WHEN_MISSING_RECENT_STOCKTAKE_DATA',
      parts
    );
    expect(stagePreference({}, pref, { ...parts })).toEqual({});
    expect(stagePreference({}, pref, { ...parts, maxAge: 60 })).toEqual({
      warnWhenMissingRecentStocktake: { ...parts, maxAge: 60 },
    });
  });
});

describe('groupStorePreferences / filterStoreCatalogue (SET-05.35, .61)', () => {
  // The grouping and filter mechanics are the shared catalogue helper's
  // (domain/preferences tests); these pin which keys form the Procurement
  // group and that the filter respects it.
  const pref = (
    key: StorePreference['key'],
    valueType: StorePreference['valueType'] = 'BOOLEAN'
  ): StorePreference => ({ key, valueType, value: false, storeOverride: null });
  // A slice of the served order: the purchase-order preferences sit apart
  // (rows 1 and 14) among unrelated rows.
  const served: StorePreference[] = [
    pref('authorisePurchaseOrder'),
    pref('blindStocktake'),
    pref('disableManualReturns'),
    pref('externalInboundShipmentLinesMustBeAuthorised'),
    pref('firstThresholdForExpiringItems', 'INTEGER'),
  ];
  const LABELS: Partial<Record<StorePreference['key'], string>> = {
    blindStocktake: 'Enable blind stock take',
    disableManualReturns: 'Disable manual returns',
    externalInboundShipmentLinesMustBeAuthorised:
      'Inbound shipment (external) lines must be authorised',
    firstThresholdForExpiringItems: 'First threshold for expiring items',
    authorisePurchaseOrder: 'Authorise purchase orders',
  };
  const labelOf = (p: StorePreference) => LABELS[p.key] ?? p.key;
  const groupLabelOf = () => 'Procurement';

  it('gathers the purchase-order preferences into one Procurement group, members in served order', () => {
    const { ungrouped, groups } = groupStorePreferences(served);
    expect(ungrouped.map(p => p.key)).toEqual([
      'blindStocktake',
      'disableManualReturns',
      'firstThresholdForExpiringItems',
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0]?.labelKey).toBe('label.procurement');
    expect(groups[0]?.members.map(p => p.key)).toEqual([
      'authorisePurchaseOrder',
      'externalInboundShipmentLinesMustBeAuthorised',
    ]);
  });

  it('a member match keeps the whole group; ungrouped rows match on their own label (SET-05.35)', () => {
    const grouped = groupStorePreferences(served);
    const filtered = filterStoreCatalogue(
      grouped,
      labelOf,
      groupLabelOf,
      'authorise'
    );
    expect(filtered.ungrouped).toEqual([]);
    expect(filtered.groups[0]?.members).toHaveLength(2);
  });
});

describe('toggleInvoiceStatus (SET-05.38)', () => {
  const defaults = asStatusList([
    'NEW',
    'ALLOCATED',
    'PICKED',
    'SHIPPED',
    'RECEIVED',
    'DELIVERED',
    'VERIFIED',
  ]);

  it('unchecks one of the Delivered/Received pair while the other remains', () => {
    expect(toggleInvoiceStatus(defaults, 'DELIVERED', false)).toEqual([
      'NEW',
      'ALLOCATED',
      'PICKED',
      'SHIPPED',
      'RECEIVED',
      'VERIFIED',
    ]);
  });

  it('refuses unchecking the LAST selected of Delivered/Received', () => {
    const withoutReceived = asStatusList([
      'NEW',
      'ALLOCATED',
      'PICKED',
      'SHIPPED',
      'DELIVERED',
      'VERIFIED',
    ]);
    expect(toggleInvoiceStatus(withoutReceived, 'DELIVERED', false)).toBeNull();
  });

  it('a set already violating the rule does not block unrelated edits', () => {
    // Another client can store any set (the server never validates) — only
    // the specific uncheck-the-last-of-the-pair edit refuses.
    const bad = asStatusList(['NEW', 'SHIPPED']);
    expect(toggleInvoiceStatus(bad, 'PICKED', true)).toEqual([
      'NEW',
      'PICKED',
      'SHIPPED',
    ]);
  });

  it('keeps the canonical order whatever the toggle order', () => {
    const some = asStatusList(['NEW', 'RECEIVED']);
    expect(toggleInvoiceStatus(some, 'ALLOCATED', true)).toEqual([
      'NEW',
      'ALLOCATED',
      'RECEIVED',
    ]);
  });
});

describe('asWarnParts / asStatusList — defensive reads of the untyped value', () => {
  it('reads a malformed composite as the fabricated default', () => {
    expect(asWarnParts('not-an-object')).toEqual({
      enabled: false,
      maxAge: 0,
      minItems: 0,
    });
    expect(asWarnParts({ enabled: true, maxAge: 30, minItems: 5 })).toEqual({
      enabled: true,
      maxAge: 30,
      minItems: 5,
    });
  });

  it('reads a malformed status list as empty and drops unknown members', () => {
    expect(asStatusList('nope')).toEqual([]);
    expect(asStatusList(['DELIVERED', 'CANCELLED', 'bogus'])).toEqual([
      'DELIVERED',
    ]);
  });
});

describe('canEditPreferences (SET-05.36)', () => {
  it('requires the central server AND the central-data permission together', () => {
    expect(
      canEditPreferences({ canEditCentralData: true, isCentralServer: true })
    ).toBe(true);
    expect(
      canEditPreferences({ canEditCentralData: true, isCentralServer: false })
    ).toBe(false);
    expect(
      canEditPreferences({ canEditCentralData: false, isCentralServer: true })
    ).toBe(false);
  });
});

describe('buildPreferencesInput (SET-05.37)', () => {
  it('sends only staged preferences, each naming the edited store', () => {
    const input = buildPreferencesInput(
      { blindStocktake: true, firstThresholdForExpiringItems: 30 },
      'store-a'
    );
    expect(input).toEqual({
      blindStocktake: [{ storeId: 'store-a', value: true }],
      firstThresholdForExpiringItems: [{ storeId: 'store-a', value: 30 }],
    });
  });

  it('writes the changing-target-months switch, including turning it off', () => {
    // On unless set (spec/internal-orders rules › target months of stock), so
    // the edit that matters is an explicit false — it must reach the wire.
    expect(
      buildPreferencesInput({ canChangeTargetMonthsOfStock: false }, 'store-a')
    ).toEqual({
      canChangeTargetMonthsOfStock: [{ storeId: 'store-a', value: false }],
    });
  });

  it('returns undefined when nothing is staged, so the save skips the call', () => {
    expect(buildPreferencesInput({}, 'store-a')).toBeUndefined();
  });

  it('writes the purchase-order authorisation row as the store override, never the global value (SET-05.59)', () => {
    const input = buildPreferencesInput(
      { authorisePurchaseOrder: false },
      'store-a'
    );
    expect(input).toEqual({
      authorisePurchaseOrderStoreOverride: [
        { storeId: 'store-a', value: false },
      ],
    });
    expect(input).not.toHaveProperty('authorisePurchaseOrder');
  });

  it('sends a null value to REMOVE the store override (SET-05.60)', () => {
    // The one write that deletes rather than writes: the store follows the
    // global value again, later changes included.
    expect(
      buildPreferencesInput({ authorisePurchaseOrder: null }, 'store-a')
    ).toEqual({
      authorisePurchaseOrderStoreOverride: [
        { storeId: 'store-a', value: null },
      ],
    });
  });

  it('carries the composite and the status set in their wire shapes', () => {
    const input = buildPreferencesInput(
      {
        warnWhenMissingRecentStocktake: {
          enabled: true,
          maxAge: 30,
          minItems: 5,
        },
        invoiceStatusOptions: ['NEW', 'DELIVERED'],
        storeCustomColour: '#004fc4',
      },
      'store-a'
    );
    expect(input).toEqual({
      warnWhenMissingRecentStocktake: [
        {
          storeId: 'store-a',
          value: { enabled: true, maxAge: 30, minItems: 5 },
        },
      ],
      invoiceStatusOptions: [
        { storeId: 'store-a', value: ['NEW', 'DELIVERED'] },
      ],
      storeCustomColour: [{ storeId: 'store-a', value: '#004fc4' }],
    });
  });

  it("coerces a wrong-typed staged value to the kind's zero, never dropping the write", () => {
    const input = buildPreferencesInput(
      { blindStocktake: 'yes', secondThresholdForExpiringItems: 'ten' },
      'store-a'
    );
    expect(input).toEqual({
      blindStocktake: [{ storeId: 'store-a', value: false }],
      secondThresholdForExpiringItems: [{ storeId: 'store-a', value: 0 }],
    });
  });
});

describe('buildPreferencesVariables (SET-05.37, MNG-02.30)', () => {
  // #1442 — from the facility register the edited store is one the
  // administrator usually can't sign in to; authorising against it is refused
  // (Forbidden, EditCentralData), so the signed-in store authorises the write.
  it('authorises against the signed-in store while every entry names the edited one', () => {
    expect(
      buildPreferencesVariables({ blindStocktake: true }, 'central', 'remote')
    ).toEqual({
      storeId: 'central',
      input: { blindStocktake: [{ storeId: 'remote', value: true }] },
    });
  });

  it('returns undefined when nothing is staged, so the save skips the call', () => {
    expect(buildPreferencesVariables({}, 'central', 'remote')).toBeUndefined();
  });
});

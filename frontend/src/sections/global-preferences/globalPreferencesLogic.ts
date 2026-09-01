// Pure logic for the Global preferences page (spec/global-preferences/
// rules.md): the catalogue grouping, the filter, the AMC predicate, the value
// coercions, and the one-field auto-save input. No Solid, no fetching — the
// page composes these.

import type {
  GlobalPreferencesResult,
  UpsertGlobalPreferencesVariables,
} from './globalPreferences.generated';

/** One preference as `preferenceDescriptions` serves it — the served order IS
 *  the display order (contract § The catalogue). */
export type GlobalPreference =
  GlobalPreferencesResult['preferenceDescriptions'][number];

export type UpsertGlobalPreferencesInput =
  UpsertGlobalPreferencesVariables['input'];

/*
 * The label key derives from the wire key (`preference.<key>`) — with one
 * deliberate exception: the v2 custom-translations row reuses the legacy
 * `preference.customTranslations` label so it reads the same to users
 * (ui-surface § S1 row 3).
 */
export const preferenceLabelKey = (
  key: GlobalPreference['key']
): `preference.${string}` =>
  key === 'customTranslationsV2'
    ? 'preference.customTranslations'
    : `preference.${key}`;

// ---------------------------------------------------------------------------
// Grouping (rules § The page)

export type GroupLabelKey =
  | 'label.procurement'
  | 'title.average-monthly-consumption'
  | 'label.expired-stock'
  | 'label.backdating';

/* Which group a preference belongs to; anything unlisted is ungrouped. */
const GROUP_OF: Partial<Record<GlobalPreference['key'], GroupLabelKey>> = {
  authorisePurchaseOrder: 'label.procurement',
  adjustForNumberOfDaysOutOfStock: 'title.average-monthly-consumption',
  daysInMonth: 'title.average-monthly-consumption',
  expiredStockPreventIssue: 'label.expired-stock',
  expiredStockIssueThreshold: 'label.expired-stock',
  backdating: 'label.backdating',
};

export interface PreferenceGroup {
  labelKey: GroupLabelKey;
  members: GlobalPreference[];
}

export interface GroupedCatalogue {
  ungrouped: GlobalPreference[];
  groups: PreferenceGroup[];
}

/*
 * Split the served catalogue into the ungrouped rows and the collapsible
 * groups. Both orders derive from the SERVED order: groups appear where their
 * first member does, members keep catalogue order (OMS-REG-GPREF-01.2).
 */
export const groupPreferences = (
  preferences: GlobalPreference[]
): GroupedCatalogue => {
  const ungrouped: GlobalPreference[] = [];
  const groups: PreferenceGroup[] = [];
  for (const preference of preferences) {
    const labelKey = GROUP_OF[preference.key];
    if (!labelKey) {
      ungrouped.push(preference);
      continue;
    }
    const group = groups.find(g => g.labelKey === labelKey);
    if (group) group.members.push(preference);
    else groups.push({ labelKey, members: [preference] });
  }
  return { ungrouped, groups };
};

/** Case-insensitive substring match on a displayed label — a blank term
 *  matches everything (OMS-REG-GPREF-01.4). */
export const matchesPreferenceFilter = (label: string, term: string): boolean =>
  label.toLowerCase().includes(term.trim().toLowerCase());

/*
 * The filtered catalogue: ungrouped rows match on their own label; a group is
 * all-or-nothing — kept whole when its label or ANY member matches
 * (OMS-REG-GPREF-01.5). The filter only hides rows; it never changes what an
 * edit saves (rules § The page).
 */
export const filterCatalogue = (
  catalogue: GroupedCatalogue,
  labelOf: (preference: GlobalPreference) => string,
  groupLabelOf: (group: PreferenceGroup) => string,
  term: string
): GroupedCatalogue => ({
  ungrouped: catalogue.ungrouped.filter(preference =>
    matchesPreferenceFilter(labelOf(preference), term)
  ),
  groups: catalogue.groups.filter(
    group =>
      matchesPreferenceFilter(groupLabelOf(group), term) ||
      group.members.some(member =>
        matchesPreferenceFilter(labelOf(member), term)
      )
  ),
});

/*
 * Whether the AMC group carries the calculation explainer: either AMC
 * preference active — the adjustment on, or days-in-a-month above zero
 * (rules § The page, OMS-REG-GPREF-01.7). Reads CURRENT values so a just-made
 * edit shows/hides it live.
 */
export const isAmcExplainerShown = (
  members: GlobalPreference[],
  currentValue: (preference: GlobalPreference) => unknown
): boolean =>
  members.some(preference => {
    if (preference.key === 'adjustForNumberOfDaysOutOfStock')
      return currentValue(preference) === true;
    if (preference.key === 'daysInMonth')
      return asNumber(currentValue(preference)) > 0;
    return false;
  });

// ---------------------------------------------------------------------------
// Values (contract § The catalogue: `value` is untyped JSON)

// Defensive readers — a wrong-typed value reads as the kind's zero, which is
// also what the server fabricates for "unset".
export const asBool = (value: unknown): boolean => value === true;
export const asNumber = (value: unknown): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : 0;

/** One offered gender — the generated input's own member type. */
export type GenderOption = NonNullable<
  UpsertGlobalPreferencesInput['genderOptions']
>[number];

/*
 * The offered gender options, in display order (ui-surface § S1 row 4): the
 * wire enum minus the hormone/surgical variants — the option set is
 * app-defined, never served (contract § The catalogue).
 */
export const OFFERED_GENDER_OPTIONS = [
  'FEMALE',
  'MALE',
  'NON_BINARY',
  'TRANSGENDER',
  'TRANSGENDER_FEMALE',
  'TRANSGENDER_MALE',
  'UNKNOWN',
] as const satisfies readonly GenderOption[];

export const genderLabelKey = (option: GenderOption): `gender.${string}` =>
  `gender.${option.toLowerCase().replace(/_/g, '-')}`;

/** The offered genders currently selected (display state). */
export const selectedGenders = (value: unknown): GenderOption[] =>
  Array.isArray(value)
    ? OFFERED_GENDER_OPTIONS.filter(option => value.includes(option))
    : [];

/*
 * Apply one checkbox toggle: offered members rebuilt in display order, any
 * unoffered members the stored value carries (e.g. a hormone/surgical variant
 * written elsewhere) preserved at the end rather than silently dropped. No
 * minimum is enforced — an empty selection is accepted (rules § Editing).
 */
export const toggleGender = (
  current: unknown,
  option: GenderOption,
  checked: boolean
): GenderOption[] => {
  const list = Array.isArray(current)
    ? current.filter((v): v is GenderOption => typeof v === 'string')
    : [];
  const offered = OFFERED_GENDER_OPTIONS.filter(g =>
    g === option ? checked : list.includes(g)
  );
  const unoffered = list.filter(
    v => !(OFFERED_GENDER_OPTIONS as readonly string[]).includes(v)
  );
  return [...offered, ...unoffered];
};

/** The three parts of the backdating composite (rules § Editing). */
export interface BackdatingParts {
  shipmentsEnabled: boolean;
  inventoryAdjustmentsEnabled: boolean;
  maxDays: number;
}
export const asBackdatingParts = (value: unknown): BackdatingParts => {
  const parts =
    typeof value === 'object' && value !== null
      ? (value as Record<string, unknown>)
      : {};
  return {
    shipmentsEnabled: asBool(parts.shipmentsEnabled),
    inventoryAdjustmentsEnabled: asBool(parts.inventoryAdjustmentsEnabled),
    maxDays: asNumber(parts.maxDays),
  };
};

// ---------------------------------------------------------------------------
// The auto-save input (contract § Editing: one bare field per preference)

/** The generated input's GLOBAL (bare, non-array) keys whose value has the
 *  given type. */
type GlobalPreferenceKeyOf<V> = {
  [K in keyof UpsertGlobalPreferencesInput]-?: NonNullable<
    UpsertGlobalPreferencesInput[K]
  > extends V
    ? K
    : never;
}[keyof UpsertGlobalPreferencesInput];

/*
 * The uniform global preferences, one key list per coercion — `satisfies`
 * refuses any key whose generated wire type isn't a bare boolean/number
 * (kdd/explicit-composition's flat-key-list clause, as the store editor).
 * receivePaymentsFromPrescriptions is writable but never described, so it
 * never reaches buildAutoSaveInput — listed for the exhaustiveness net only.
 */
const BOOL_PREFERENCE_KEYS = [
  'allowTrackingOfStockByDonor',
  'authorisePurchaseOrder',
  'showContactTracing',
  'warningForExcessRequest',
  'adjustForNumberOfDaysOutOfStock',
  'expiredStockPreventIssue',
  'itemMarginOverridesSupplierMargin',
  'isGaps',
  'displayPopulationBasedForecasting',
  'receivePaymentsFromPrescriptions',
] as const satisfies readonly GlobalPreferenceKeyOf<boolean>[];
const NUMBER_PREFERENCE_KEYS = [
  'preventTransfersMonthsBeforeInitialisation',
  'syncRecordsDisplayThreshold',
  'daysInMonth',
  'expiredStockIssueThreshold',
] as const satisfies readonly GlobalPreferenceKeyOf<number>[];

/**
 * Compile-time exhaustiveness net (as the store editor's): `pnpm codegen`
 * flows a new server global preference into the generated input, and the page
 * then renders it a live control — so a key missing here would mean the
 * auto-save silently drops that edit. This alias fails to compile until the
 * new key joins a list above or gets an explicit branch in
 * buildAutoSaveInput. The three `unknown`-typed JSON fields are accounted
 * explicitly: customTranslationsV2 saves through the editor's own path;
 * customTranslations (legacy) only ever rides along with it;
 * globalTableConfigs is the table-configuration feature's
 * (src/api/tableConfig.graphql), never this page's.
 */
export type EveryGlobalPreferenceHandled<
  Unhandled extends never = Exclude<
    GlobalPreferenceKeyOf<boolean | number | object>,
    | (typeof BOOL_PREFERENCE_KEYS)[number]
    | (typeof NUMBER_PREFERENCE_KEYS)[number]
    | GlobalPreferenceKeyOf<object> // arrays (store-scoped) + composites, handled below/elsewhere
    | 'genderOptions'
    | 'backdating'
  >,
> = Unhandled;

const isBoolKey = (
  key: GlobalPreference['key']
): key is (typeof BOOL_PREFERENCE_KEYS)[number] =>
  (BOOL_PREFERENCE_KEYS as readonly string[]).includes(key);
const isNumberKey = (
  key: GlobalPreference['key']
): key is (typeof NUMBER_PREFERENCE_KEYS)[number] =>
  (NUMBER_PREFERENCE_KEYS as readonly string[]).includes(key);

/*
 * One changed preference as the mutation input — a one-field input, the
 * others untouched (contract § Editing). Undefined for keys this page never
 * auto-saves (the translations editor has its own save path; store-typed keys
 * never appear in a GLOBAL read).
 */
export const buildAutoSaveInput = (
  key: GlobalPreference['key'],
  value: unknown
): UpsertGlobalPreferencesInput | undefined => {
  const input: UpsertGlobalPreferencesInput = {};
  if (isBoolKey(key)) {
    input[key] = asBool(value);
    return input;
  }
  if (isNumberKey(key)) {
    input[key] = asNumber(value);
    return input;
  }
  if (key === 'genderOptions') {
    return { genderOptions: asGenderSelection(value) };
  }
  if (key === 'backdating') {
    return { backdating: asBackdatingParts(value) };
  }
  return undefined;
};

/* The staged gender list, passed through as-is (already built by
   toggleGender); a non-list stages the empty selection. */
const asGenderSelection = (value: unknown): GenderOption[] =>
  Array.isArray(value)
    ? value.filter((v): v is GenderOption => typeof v === 'string')
    : [];

/*
 * Editable only on the central server by a session holding the central-data
 * permission (rules § Editing) — the same two facts the server enforces,
 * mirrored as a UI gate.
 */
export const canEditGlobalPreferences = (session: {
  canEditCentralData: boolean;
  isCentralServer: boolean;
}): boolean => session.canEditCentralData && session.isCentralServer;

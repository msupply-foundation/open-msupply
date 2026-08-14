// Pure logic for the store editor (spec/settings/rules.md § The store editor,
// ui-surface § S5): the property draft, the GPS block's formatting/distance
// maths, and the editability derivations. No Solid, no fetching — the modal
// composes these.

import type { NamePropertiesResult } from '../configuration/nameProperties.generated';
import type {
  StorePreferencesResult,
  UpsertStorePreferencesVariables,
} from './storeEditor.generated';

/** One property definition as the nameProperties catalogue serves it. */
export type PropertyDefinition =
  NamePropertiesResult['nameProperties']['nodes'][number];

/*
 * The facility's recorded property set: ONE document, keyed by property key
 * (contract § The store editor — a save replaces the whole thing, so an
 * implementation must round-trip every key it read, including keys no
 * definition covers). Values are `unknown` because the column is an opaque
 * pass-through server-side: anything can be in there, and what isn't ours to
 * understand is still ours to preserve.
 */
export type PropertyDraft = Record<string, unknown>;

/** The GPS pair — property values, never listed as property fields. */
export const LATITUDE_KEY = 'latitude';
export const LONGITUDE_KEY = 'longitude';

/*
 * Parse the stored document. The server fabricates "{}" for a facility whose
 * properties were never set, and never validates what it stores — a non-JSON
 * or non-object blob is possible, and reads as "nothing recorded" rather than
 * blowing up the editor.
 */
export const parseProperties = (
  json: string | null | undefined
): PropertyDraft => {
  if (!json) return {};
  try {
    const parsed: unknown = JSON.parse(json);
    return typeof parsed === 'object' &&
      parsed !== null &&
      !Array.isArray(parsed)
      ? (parsed as PropertyDraft)
      : {};
  } catch {
    return {};
  }
};

/*
 * Stage one edit. A cleared field records `null` rather than dropping the key
 * (the reference client's `v ?? null`): an explicit null is what the wire
 * carries for "no value", and dropping keys is how a document silently loses
 * data.
 */
export const setProperty = (
  draft: PropertyDraft,
  key: string,
  value: string | number | boolean | null | undefined
): PropertyDraft => ({ ...draft, [key]: value ?? null });

/** The complete document, as the mutation's `properties` string. */
export const serialiseProperties = (draft: PropertyDraft): string =>
  JSON.stringify(draft);

/*
 * The fields the Properties panel renders: every definition except the
 * latitude/longitude pair (the GPS block owns those), ordered by the
 * definition's own display name.
 */
export const propertyFields = (
  definitions: PropertyDefinition[]
): PropertyDefinition[] =>
  definitions
    .filter(
      d => d.property.key !== LATITUDE_KEY && d.property.key !== LONGITUDE_KEY
    )
    .toSorted((a, b) => a.property.name.localeCompare(b.property.name));

/*
 * A definition's allowed values: ONE comma-separated string on the wire, split
 * client-side. (The same split as Configuration's supply-level editor, kept
 * local rather than imported so this lazily-loaded chunk doesn't drag in the
 * seed-data module.)
 */
export const allowedValues = (allowed: string | null | undefined): string[] =>
  (allowed ?? '')
    .split(',')
    .map(v => v.trim())
    .filter(v => v !== '');

/*
 * Whether ONE definition is editable in this session. Two independent gates
 * (rules § The store editor): the store-properties permission — without it the
 * whole panel is read-only — and, away from the central server, the
 * definition's own remote-editable marking (a UI courtesy; the server honours
 * the write from anywhere).
 */
export const isDefinitionEditable = (
  definition: PropertyDefinition,
  session: { canMutate: boolean; isCentralServer: boolean }
): boolean =>
  session.canMutate && (session.isCentralServer || definition.remoteEditable);

/*
 * Whether the session can edit ANYTHING in the editor — the Save gate (D79:
 * a Save that can only no-op or fail is a blocked affordance). Latitude and
 * longitude count: they are property values too, so an otherwise read-only
 * session that can still stage a live location has something to save. With no
 * definitions at all there is nothing to edit and nothing to save.
 */
export const canEditAnything = (
  definitions: PropertyDefinition[],
  session: { canMutate: boolean; isCentralServer: boolean }
): boolean => definitions.some(d => isDefinitionEditable(d, session));

/*
 * A coordinate read out of the draft. The document is opaque, so a number that
 * came back as a string still reads as a number; anything else is 0 — which is
 * also what "never recorded" looks like (rules § GPS coordinates: 0,0 and
 * unrecorded are indistinguishable, and render as such).
 */
export const coordinate = (draft: PropertyDraft, key: string): number => {
  const value = draft[key];
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
};

/** Whether coordinates are recorded at all — exactly 0,0 counts as not. */
export const hasCoordinates = (latitude: number, longitude: number): boolean =>
  latitude !== 0 || longitude !== 0;

/** Six decimal places (~0.1 m) — a captured position's kept precision. */
export const roundCoordinate = (value: number): number =>
  Number.parseFloat(value.toFixed(6));

/*
 * The degrees-minutes-seconds rendering shown beside the decimal value, e.g.
 * `S 41° 17' 12.360"`. The hemisphere letter carries the sign, so the degrees
 * are absolute.
 */
export const formatDms = (
  value: number,
  axis: 'latitude' | 'longitude'
): string => {
  const direction =
    axis === 'latitude' ? (value >= 0 ? 'N' : 'S') : value >= 0 ? 'E' : 'W';
  const absolute = Math.abs(value);
  const degrees = Math.floor(absolute);
  const minutes = Math.floor((absolute - degrees) * 60);
  const seconds = ((absolute * 3600) % 60).toFixed(3);
  return `${direction} ${degrees}° ${minutes}' ${seconds}"`;
};

/** The read-only coordinate display: decimal value beside its DMS form. */
export const formatCoordinate = (
  value: number,
  axis: 'latitude' | 'longitude'
): string => `${value} / ${formatDms(value, axis)}`;

/*
 * Great-circle distance in kilometres (haversine) between the recorded
 * coordinates and this device's position — "Your distance (km)".
 */
export const haversineKm = (
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number }
): number => {
  const EARTH_RADIUS_KM = 6371;
  const toRadians = (degrees: number) => degrees * (Math.PI / 180);
  const lat1 = toRadians(from.latitude);
  const lat2 = toRadians(to.latitude);
  const deltaLat = toRadians(to.latitude - from.latitude);
  const deltaLng = toRadians(to.longitude - from.longitude);
  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number.parseFloat((EARTH_RADIUS_KM * c).toFixed(6));
};

/*
 * The i18n key for a browser geolocation failure. The numeric codes are the
 * GeolocationPositionError constants (1 PERMISSION_DENIED, 2
 * POSITION_UNAVAILABLE, 3 TIMEOUT); anything else is the unknown case.
 */
export const geolocationErrorKey = (
  code: number
):
  | 'error.permission-denied'
  | 'error.position-unavailable'
  | 'error.timeout'
  | 'error.unknown-geolocation-error' => {
  switch (code) {
    case 1:
      return 'error.permission-denied';
    case 2:
      return 'error.position-unavailable';
    case 3:
      return 'error.timeout';
    default:
      return 'error.unknown-geolocation-error';
  }
};

// ---------------------------------------------------------------------------
// The Preferences tab (rules § The store editor › Preferences, ui-surface § S5)

/** One preference as `preferenceDescriptions` serves it — the served order IS
 *  the display order (contract § The store editor). */
export type StorePreference =
  StorePreferencesResult['preferenceDescriptions'][number];

export type UpsertPreferencesInput = UpsertStorePreferencesVariables['input'];

/*
 * Staged preference edits, keyed by preference key — staged values ONLY (the
 * write is per-preference, unlike the properties document, so an untouched
 * preference never rides along). Values are `unknown` for the same reason the
 * served `value` is: the wire declares its own type loss, so every read is
 * defensive rather than cast.
 */
export type PreferenceDraft = Record<string, unknown>;

/** The value a control shows: the staged edit, else what the server holds. */
export const preferenceValue = (
  preference: StorePreference,
  draft: PreferenceDraft
): unknown =>
  preference.key in draft ? draft[preference.key] : preference.value;

// Defensive readers from the untyped value — a wrong-typed value reads as the
// kind's zero, which is also what the server fabricates for "unset".
export const asBool = (value: unknown): boolean => value === true;
export const asNumber = (value: unknown): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : 0;
export const asColour = (value: unknown): string =>
  typeof value === 'string' ? value : '';

/** The three parts of the recent-stocktake warning composite. */
export interface WarnStocktakeParts {
  enabled: boolean;
  maxAge: number;
  minItems: number;
}
export const asWarnParts = (value: unknown): WarnStocktakeParts => {
  const parts =
    typeof value === 'object' && value !== null
      ? (value as Record<string, unknown>)
      : {};
  return {
    enabled: asBool(parts.enabled),
    maxAge: asNumber(parts.maxAge),
    minItems: asNumber(parts.minItems),
  };
};

/** One offered invoice status — the generated input's own member type. */
export type InvoiceStatusOption = NonNullable<
  UpsertPreferencesInput['invoiceStatusOptions']
>[number]['value'][number];

/*
 * The offered statuses, in the canonical (default-set) order. Two labelled
 * groups over ONE stored set; the bookends are offered but immutable
 * (ui-surface § S5 row 22). CANCELLED exists on the wire but is never offered
 * — as the reference app.
 */
export const OUTBOUND_STATUS_OPTIONS = [
  'NEW',
  'ALLOCATED',
  'PICKED',
  'SHIPPED',
] as const satisfies readonly InvoiceStatusOption[];
export const INBOUND_STATUS_OPTIONS = [
  'NEW',
  'DELIVERED',
  'RECEIVED',
  'VERIFIED',
] as const satisfies readonly InvoiceStatusOption[];
export const IMMUTABLE_INVOICE_STATUSES = [
  'NEW',
  'SHIPPED',
  'VERIFIED',
] as const satisfies readonly InvoiceStatusOption[];
const ALL_INVOICE_STATUS_OPTIONS = [
  'NEW',
  'ALLOCATED',
  'PICKED',
  'SHIPPED',
  'RECEIVED',
  'DELIVERED',
  'VERIFIED',
] as const satisfies readonly InvoiceStatusOption[];

export const asStatusList = (value: unknown): InvoiceStatusOption[] =>
  ALL_INVOICE_STATUS_OPTIONS.filter(
    status => Array.isArray(value) && value.includes(status)
  );

/*
 * Apply one checkbox toggle to the stored set, keeping canonical order.
 * Returns null when the edit must be refused: unchecking the LAST selected of
 * Delivered/Received (OMS-REG-SET-05.38) — the app's guard, the server accepts
 * any set (contract wire trap). Only that specific uncheck refuses, so a set
 * already violating the rule (written by another client) doesn't block
 * unrelated edits.
 */
export const toggleInvoiceStatus = (
  current: readonly InvoiceStatusOption[],
  status: InvoiceStatusOption,
  checked: boolean
): InvoiceStatusOption[] | null => {
  const next = ALL_INVOICE_STATUS_OPTIONS.filter(option =>
    option === status ? checked : current.includes(option)
  );
  if (
    !checked &&
    (status === 'DELIVERED' || status === 'RECEIVED') &&
    !next.includes('DELIVERED') &&
    !next.includes('RECEIVED')
  ) {
    return null;
  }
  return next;
};

/** Case-insensitive substring match on the displayed label (SET-05.35). */
export const matchesPreferenceFilter = (label: string, term: string): boolean =>
  term.trim() === '' || label.toLowerCase().includes(term.trim().toLowerCase());

/*
 * Preferences are editable only on the central server by a session holding the
 * central-data permission (rules § The store editor › Preferences) — the same
 * two facts the server enforces (central-server root gate + EDIT_CENTRAL_DATA),
 * mirrored as a UI gate.
 */
export const canEditPreferences = (session: {
  canEditCentralData: boolean;
  isCentralServer: boolean;
}): boolean => session.canEditCentralData && session.isCentralServer;

/*
 * The staged edits as the mutation input — one `{ storeId, value }` array per
 * staged preference, every entry naming the EDITED store (the server honours
 * the ids inside the payload, not the auth-checked one — contract wire trap).
 * Undefined when nothing is staged, so the save can skip the call. Written out
 * per key (kdd/explicit-composition): each line is one preference with its own
 * coercion, checked field-by-field against the generated input type.
 */
export const buildPreferencesInput = (
  draft: PreferenceDraft,
  storeId: string
): UpsertPreferencesInput | undefined => {
  const input: UpsertPreferencesInput = {};
  const bool = (key: string) => [{ storeId, value: asBool(draft[key]) }];
  const number = (key: string) => [{ storeId, value: asNumber(draft[key]) }];

  if ('showIndicativePriceInRequisitions' in draft)
    input.showIndicativePriceInRequisitions = bool(
      'showIndicativePriceInRequisitions'
    );
  if ('blindStocktake' in draft) input.blindStocktake = bool('blindStocktake');
  if ('orderInPacks' in draft) input.orderInPacks = bool('orderInPacks');
  if ('useProcurementFunctionality' in draft)
    input.useProcurementFunctionality = bool('useProcurementFunctionality');
  if ('sortByVvmStatusThenExpiry' in draft)
    input.sortByVvmStatusThenExpiry = bool('sortByVvmStatusThenExpiry');
  if ('useSimplifiedMobileUi' in draft)
    input.useSimplifiedMobileUi = bool('useSimplifiedMobileUi');
  if ('disableManualReturns' in draft)
    input.disableManualReturns = bool('disableManualReturns');
  if ('requisitionAutoFinalise' in draft)
    input.requisitionAutoFinalise = bool('requisitionAutoFinalise');
  if ('inboundShipmentAutoVerify' in draft)
    input.inboundShipmentAutoVerify = bool('inboundShipmentAutoVerify');
  if ('manageVvmStatusForStock' in draft)
    input.manageVvmStatusForStock = bool('manageVvmStatusForStock');
  if ('manageVaccinesInDoses' in draft)
    input.manageVaccinesInDoses = bool('manageVaccinesInDoses');
  if ('canCreateInternalOrderFromARequisition' in draft)
    input.canCreateInternalOrderFromARequisition = bool(
      'canCreateInternalOrderFromARequisition'
    );
  if ('selectDestinationStoreForAnInternalOrder' in draft)
    input.selectDestinationStoreForAnInternalOrder = bool(
      'selectDestinationStoreForAnInternalOrder'
    );
  if ('externalInboundShipmentLinesMustBeAuthorised' in draft)
    input.externalInboundShipmentLinesMustBeAuthorised = bool(
      'externalInboundShipmentLinesMustBeAuthorised'
    );
  if ('doNotPrintPlaceholderLineLabels' in draft)
    input.doNotPrintPlaceholderLineLabels = bool(
      'doNotPrintPlaceholderLineLabels'
    );
  if (
    'numberOfMonthsToCheckForConsumptionWhenCalculatingOutOfStockProducts' in
    draft
  )
    input.numberOfMonthsToCheckForConsumptionWhenCalculatingOutOfStockProducts =
      number(
        'numberOfMonthsToCheckForConsumptionWhenCalculatingOutOfStockProducts'
      );
  if ('numberOfMonthsThresholdToShowLowStockAlertsForProducts' in draft)
    input.numberOfMonthsThresholdToShowLowStockAlertsForProducts = number(
      'numberOfMonthsThresholdToShowLowStockAlertsForProducts'
    );
  if ('numberOfMonthsThresholdToShowOverStockAlertsForProducts' in draft)
    input.numberOfMonthsThresholdToShowOverStockAlertsForProducts = number(
      'numberOfMonthsThresholdToShowOverStockAlertsForProducts'
    );
  if ('firstThresholdForExpiringItems' in draft)
    input.firstThresholdForExpiringItems = number(
      'firstThresholdForExpiringItems'
    );
  if ('secondThresholdForExpiringItems' in draft)
    input.secondThresholdForExpiringItems = number(
      'secondThresholdForExpiringItems'
    );
  if ('storeCustomColour' in draft)
    input.storeCustomColour = [
      { storeId, value: asColour(draft.storeCustomColour) },
    ];
  if ('warnWhenMissingRecentStocktake' in draft)
    input.warnWhenMissingRecentStocktake = [
      { storeId, value: asWarnParts(draft.warnWhenMissingRecentStocktake) },
    ];
  if ('invoiceStatusOptions' in draft)
    input.invoiceStatusOptions = [
      { storeId, value: asStatusList(draft.invoiceStatusOptions) },
    ];

  return Object.keys(input).length > 0 ? input : undefined;
};

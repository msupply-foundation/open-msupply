// Pure logic for the store editor (spec/settings/rules.md § The store editor,
// ui-surface § S5): the property draft, the GPS block's formatting/distance
// maths, and the editability derivations. No Solid, no fetching — the modal
// composes these.

import type { NamePropertiesResult } from '../configuration/nameProperties.generated';

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
 * Whether the session can edit ANYTHING in the editor — the Save gate (D71:
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

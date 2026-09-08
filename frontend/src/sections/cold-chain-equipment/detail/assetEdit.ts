import type {
  AssetDetailFragment,
  UpdateAssetVariables,
} from '../equipment.generated';

// The detail screen's form logic (spec/cold-chain-equipment › ui-surface S2) —
// what the user may change, whether anything has changed, and the update input
// that carries it. Framework-free so the whole-draft obligation, the scan locks
// and the location-editability gate are testable in node vitest.

export type AssetDetail = AssetDetailFragment;

/** A property object as the screen holds it: the parsed asset-own JSON. */
export type PropertyValues = Record<string, string | number | boolean | null>;

/**
 * The editable half of an asset. Every field the detail screen can change, held
 * as a plain comparable value — the wire's null-vs-absent distinctions are made
 * at {@link buildUpdateInput}.
 *
 * `locationIds` is `undefined`, not `[]`, when the assignment is not this
 * screen's to change: on a central server an asset held by another store shows
 * its locations but cannot edit them, because they belong to that store
 * (rules › the store boundary, AC-S5).
 */
export type AssetFormState = {
  assetNumber: string;
  serialNumber: string;
  notes: string;
  installationDate: string;
  replacementDate: string;
  warrantyStart: string;
  warrantyEnd: string;
  needsReplacement: boolean;
  donorNameId: string;
  storeId: string;
  locationIds: string[] | undefined;
  properties: PropertyValues;
};

/**
 * The asset's own specification, parsed.
 *
 * `properties` is a JSON STRING that fabricates the two-character `"{}"` for
 * absent data — it is never null (contract ⚠️ wire trap) — and a malformed
 * value is treated as no specification rather than crashing the screen.
 */
export const parseProperties = (json: string | null | undefined) => {
  if (!json) return {} as PropertyValues;
  try {
    const parsed: unknown = JSON.parse(json);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as PropertyValues)
      : ({} as PropertyValues);
  } catch {
    return {} as PropertyValues;
  }
};

/**
 * Whether the asset's storage locations are this screen's to change (AC-S5).
 * Locations belong to the asset's own store, so an acting store that is not it
 * cannot see them to choose among them.
 */
export const canEditLocations = (
  asset: Pick<AssetDetail, 'storeId'>,
  activeStoreId: string,
  isCentral: boolean
): boolean => !isCentral || asset.storeId === activeStoreId;

/** The draft a freshly opened detail screen starts from. */
export const formFromAsset = (
  asset: AssetDetail,
  activeStoreId: string,
  isCentral: boolean
): AssetFormState => ({
  assetNumber: asset.assetNumber ?? '',
  serialNumber: asset.serialNumber ?? '',
  notes: asset.notes ?? '',
  installationDate: asset.installationDate ?? '',
  replacementDate: asset.replacementDate ?? '',
  warrantyStart: asset.warrantyStart ?? '',
  warrantyEnd: asset.warrantyEnd ?? '',
  needsReplacement: asset.needsReplacement ?? false,
  donorNameId: asset.donorNameId ?? '',
  storeId: asset.storeId ?? '',
  locationIds: canEditLocations(asset, activeStoreId, isCentral)
    ? asset.locations.nodes.map(location => location.id)
    : undefined,
  properties: parseProperties(asset.properties),
});

/**
 * Whether the draft still matches the asset as loaded. The save action is
 * unavailable while it does, so an opened-and-closed screen cannot write
 * (AC-E1/AC-E2).
 */
export const isUnchanged = (
  form: AssetFormState,
  asset: AssetDetail,
  activeStoreId: string,
  isCentral: boolean
): boolean => {
  const seed = formFromAsset(asset, activeStoreId, isCentral);
  return (
    form.assetNumber === seed.assetNumber &&
    form.serialNumber === seed.serialNumber &&
    form.notes === seed.notes &&
    form.installationDate === seed.installationDate &&
    form.replacementDate === seed.replacementDate &&
    form.warrantyStart === seed.warrantyStart &&
    form.warrantyEnd === seed.warrantyEnd &&
    form.needsReplacement === seed.needsReplacement &&
    form.donorNameId === seed.donorNameId &&
    form.storeId === seed.storeId &&
    sameIds(form.locationIds, seed.locationIds) &&
    JSON.stringify(form.properties) === JSON.stringify(seed.properties)
  );
};

const sameIds = (a: string[] | undefined, b: string[] | undefined): boolean => {
  if (a === undefined || b === undefined) return a === b;
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((id, index) => id === sortedB[index]);
};

const nullable = (value: string) => ({ value: value || null });

/**
 * The draft as an update input — **the whole draft, every time**.
 *
 * `assetNumber`, `notes`, `properties` and `needsReplacement` are NOT partial
 * fields: the service assigns each straight onto the stored row, so omitting
 * one ERASES it (contract ⚠️ wire trap, AC-E6). There is no shape that leaves
 * them alone, which is why this builds from a form seeded with the asset's
 * whole current state and always sends all four (AC-E7).
 *
 * The eight nullable-update fields carry the three-state wrapper: `{value: x}`
 * sets and `{value: null}` clears. This screen always states them explicitly —
 * they are fields the user just looked at, so "unchanged" is not a shape it
 * needs, and sending them means a cleared date really clears.
 *
 * `locationIds` is the one field that IS omitted when absent: the assignment is
 * wholesale, so sending `[]` would release every location, and that is not what
 * "you cannot edit these" means (AC-S5).
 *
 * `properties` carries the asset's OWN object, never the catalogue's — writing
 * the catalogue's values onto the asset would freeze a snapshot of the model
 * (contract › editing an asset).
 */
export const buildUpdateInput = (
  form: AssetFormState,
  assetId: string
): UpdateAssetVariables['input'] => ({
  id: assetId,
  // The four non-partial fields — always present, or they are erased.
  assetNumber: form.assetNumber || null,
  notes: form.notes || null,
  properties: JSON.stringify(form.properties),
  needsReplacement: form.needsReplacement,
  // The nullable-update wrappers.
  serialNumber: nullable(form.serialNumber),
  installationDate: nullable(form.installationDate),
  replacementDate: nullable(form.replacementDate),
  warrantyStart: nullable(form.warrantyStart),
  warrantyEnd: nullable(form.warrantyEnd),
  donorNameId: nullable(form.donorNameId),
  storeId: nullable(form.storeId),
  // Omitted, not emptied, when the assignment is not this screen's to change.
  ...(form.locationIds ? { locationIds: form.locationIds } : {}),
});

/**
 * Whether a scan-locked field is offered for editing.
 *
 * Every field a GS1 barcode supplied is read-only: the physical label is the
 * authority and a typo would silently disagree with it. Only a server
 * administrator may override one (rules › scanning, AC-B5).
 *
 * A frontend obligation only — the server never consults `lockedFields`, and no
 * input can change it after insert (contract ⚠️ wire trap).
 */
export const isLockedField = (
  asset: Pick<AssetDetail, 'lockedFields'>,
  field: 'serialNumber' | 'warrantyStart' | 'warrantyEnd' | 'catalogueItemId',
  isServerAdmin: boolean
): boolean => asset.lockedFields[field] && !isServerAdmin;

import type { AssetPropertiesListResult } from '../catalogue.generated';
import type { PropertyValues } from './assetEdit';

// The specification's presentation logic (spec/cold-chain-equipment › rules §
// properties, ui-surface S2.2). Which property definitions apply to an asset,
// which value each row shows, and which rows are the store's to fill in.
// Framework-free so the catalogue-wins rule and the read-only set are testable
// in node vitest.

export type PropertyDefinition =
  AssetPropertiesListResult['assetProperties']['nodes'][number];

/**
 * The two mapping-date properties. They are derived from the temperature-
 * mapping history, not typed in, so they are read-only wherever they appear
 * (rules › properties, AC-R6).
 *
 * Keyed on the literal property keys, which is how the reference app
 * recognises them too — they are ordinary property rows on the wire, with
 * nothing marking them derived (contract › properties).
 */
export const MAPPING_DATE_KEYS: readonly string[] = [
  'initial_mapping_date',
  'most_recent_mapping_date',
] as const;

/**
 * The definitions that apply to one asset, each appearing once (AC-R4).
 *
 * `assetProperties` returns ONE ROW PER SCOPE, so the same `key` recurs — a
 * property scoped to a class and again to a category comes back twice
 * (contract ⚠️ wire trap). De-duplicated by key here, keeping the first, so no
 * row renders twice.
 *
 * The read is already narrowed server-side by the asset's class, category and
 * type; this is the presentation half of that.
 */
export const applicableProperties = (
  definitions: readonly PropertyDefinition[]
): PropertyDefinition[] => {
  const seen = new Set<string>();
  const result: PropertyDefinition[] = [];
  for (const definition of definitions) {
    if (seen.has(definition.key)) continue;
    seen.add(definition.key);
    result.push(definition);
  }
  return result;
};

export type PropertyRow = {
  definition: PropertyDefinition;
  value: string | number | boolean | null;
  /** The catalogue answers this key, so its value is the model's, not the store's. */
  fromCatalogue: boolean;
  /** Derived from the mapping history rather than typed in. */
  derived: boolean;
  /** Neither the catalogue's nor derived — the store's to fill in. */
  editable: boolean;
};

/**
 * One row per applicable property: which value it shows and whether it is the
 * store's to change.
 *
 * Where both the catalogue item and the asset answer a key, **the catalogue's
 * value is what is shown** and the row is read-only — the specification of a
 * model is the model's, not the store's (AC-R1/AC-R3). The asset's own value is
 * kept (the draft still carries it) but not displayed.
 */
export const propertyRows = (
  definitions: readonly PropertyDefinition[],
  assetProperties: PropertyValues,
  catalogueProperties: PropertyValues
): PropertyRow[] =>
  applicableProperties(definitions).map(definition => {
    const fromCatalogue = Object.prototype.hasOwnProperty.call(
      catalogueProperties,
      definition.key
    );
    const derived = MAPPING_DATE_KEYS.includes(definition.key);
    return {
      definition,
      value: fromCatalogue
        ? (catalogueProperties[definition.key] ?? null)
        : (assetProperties[definition.key] ?? null),
      fromCatalogue,
      derived,
      editable: !fromCatalogue && !derived,
    };
  });

/**
 * The allowed values a choice property offers, or undefined where it declares
 * none (in which case the row is plain text).
 */
export const allowedValues = (
  definition: PropertyDefinition
): string[] | undefined => {
  const raw = definition.allowedValues?.trim();
  if (!raw) return undefined;
  const values = raw
    .split(',')
    .map(value => value.trim())
    .filter(Boolean);
  return values.length ? values : undefined;
};

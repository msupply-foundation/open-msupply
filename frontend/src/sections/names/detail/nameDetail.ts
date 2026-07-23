import type { NameByIdResult, NamePropertiesResult } from '../names.generated';

// Read-model helpers for the customer/supplier detail views (spec/names). Both
// roles are built from the SAME single-name read (rules › record detail); only
// which fields/tabs are shown differs by role. Kept framework-free for unit
// testing.

export type NameDetail = NameByIdResult['names']['nodes'][number];
export type NamePropertyDef =
  NamePropertiesResult['nameProperties']['nodes'][number];

// The single-name read filters by id, so the detail is the first (only) node —
// undefined when the id matches nothing (rules › record detail; the detail
// reuses the list query).
export const detailFromResult = (
  result: NameByIdResult | undefined
): NameDetail | undefined => result?.names.nodes[0];

// A name is itself a store when its `store` relation is present — drives the
// detail header's store indicator (rules › record detail; AC-N8 parity).
export const isStoreName = (detail: Pick<NameDetail, 'store'>): boolean =>
  detail.store != null;

// The customer detail's "supply level" is a v1 NAME PROPERTY (distinct from the
// v2 custom fields): its value lives in NameNode.properties — a JSON STRING blob
// keyed by property key. Matched by a well-known key.
// ⚠️ VERIFY: the exact central key for supply level; using 'supply_level' as the
// documented best guess (the reference dataset configures no name properties, so
// this is contract-grounded, not populated-observable — see BUILD_REPORT).
export const SUPPLY_LEVEL_KEY = 'supply_level';

// Parse the NameNode.properties JSON STRING blob to a plain record.
export const parseProperties = (
  raw: string | null | undefined
): Record<string, unknown> => {
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === 'object'
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
};

// The supply-level value for the customer detail (AC-N20, AC-N25). Resolves the
// property key from the matching definition when present, else the well-known
// key, and reads the value out of the properties blob. Blank when unset.
export const supplyLevelValue = (
  propertiesJson: string | null | undefined,
  defs: NamePropertyDef[] | undefined
): string => {
  const def = (defs ?? []).find(d => d.property.key === SUPPLY_LEVEL_KEY);
  const key = def?.property.key ?? SUPPLY_LEVEL_KEY;
  const value = parseProperties(propertiesJson)[key];
  if (value == null || value === '') return '';
  return String(value);
};

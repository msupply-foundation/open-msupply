import {
  useQuery,
  keepPreviousData,
  useUrlQuery,
  useUrlQueryParams,
  LegacyPropertyFilterInput,
  PropertyV2ValueFilterInput,
} from '@openmsupply-client/common';
import { useNameApi } from '../utils/useNameApi';

// Splits URL params into the three filter shapes the stores page understands:
//  - `legacyProperty.<key>`     → legacy text-JSON column filter
//  - `legacyPropertyJsonb.<key>` → legacy JSONB twin filter
//  - `property.<id>`             → V2 relational property filter
// All three flow through one query; mixing them in a single request is the
// whole point of the perf comparison.
const LEGACY_PREFIX = 'legacyProperty.';
const JSONB_PREFIX = 'legacyPropertyJsonb.';
const V2_PREFIX = 'property.';

type StoresFilter = {
  legacyProperty?: LegacyPropertyFilterInput[];
  legacyPropertyJsonb?: LegacyPropertyFilterInput[];
  property?: PropertyV2ValueFilterInput[];
};

// FilterMenu stores number ranges as `{ from: N, to: N }` under a single URL
// parameter. Returns `{ min, max }` if either bound is set, otherwise null.
const toNumberRange = (
  raw: unknown
): { min?: number; max?: number } | null => {
  if (raw == null || typeof raw !== 'object') return null;
  const r = raw as { from?: unknown; to?: unknown };
  const parse = (v: unknown): number | undefined => {
    if (v === undefined || v === null || v === '') return undefined;
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  };
  const min = parse(r.from);
  const max = parse(r.to);
  if (min === undefined && max === undefined) return null;
  return {
    ...(min !== undefined ? { min } : {}),
    ...(max !== undefined ? { max } : {}),
  };
};

const buildFilters = (
  urlQuery: Record<string, unknown>,
  optionPropertyIds: Set<string>
): StoresFilter => {
  const legacy: LegacyPropertyFilterInput[] = [];
  const jsonb: LegacyPropertyFilterInput[] = [];
  const v2: PropertyV2ValueFilterInput[] = [];
  for (const [param, value] of Object.entries(urlQuery)) {
    if (value === undefined || value === null || value === '') continue;
    const range = toNumberRange(value);

    if (param.startsWith(JSONB_PREFIX)) {
      const key = param.slice(JSONB_PREFIX.length);
      if (range) jsonb.push({ key, numberValue: range });
      else jsonb.push({ key, value: { like: String(value) } });
    } else if (param.startsWith(LEGACY_PREFIX)) {
      const key = param.slice(LEGACY_PREFIX.length);
      if (range) legacy.push({ key, numberValue: range });
      else legacy.push({ key, value: { like: String(value) } });
    } else if (param.startsWith(V2_PREFIX)) {
      const propertyId = param.slice(V2_PREFIX.length);
      if (range) {
        v2.push({
          propertyId: { equalTo: propertyId },
          valueNumber: range,
        });
      } else {
        const stringValue = String(value);
        v2.push({
          propertyId: { equalTo: propertyId },
          ...(optionPropertyIds.has(propertyId)
            ? { valueOptionId: { equalTo: stringValue } }
            : { valueText: { like: stringValue } }),
        });
      }
    }
  }
  return {
    ...(legacy.length ? { legacyProperty: legacy } : {}),
    ...(jsonb.length ? { legacyPropertyJsonb: jsonb } : {}),
    ...(v2.length ? { property: v2 } : {}),
  };
};

// `optionPropertyIds` comes from the V2 property definitions and lets the hook
// pick `valueOptionId` vs `valueText` per filter — passed in by the ListView
// (rather than fetched here) to avoid a circular import via `useName`.
export const useStores = (optionPropertyIds: Set<string> = new Set()) => {
  const api = useNameApi();
  const { queryParams } = useUrlQueryParams({
    initialSort: { key: 'name', dir: 'asc' },
    filters: [{ key: 'codeOrName' }],
  });
  const { urlQuery } = useUrlQuery();
  const filters = buildFilters(urlQuery, optionPropertyIds);
  const hasFilter =
    !!filters.legacyProperty ||
    !!filters.legacyPropertyJsonb ||
    !!filters.property;

  return useQuery({
    // Filter object appended to the key so each combination produces a
    // distinct cache entry — it's not part of the typed ListParams shape.
    queryKey: [...api.keys.storesList(queryParams), filters],
    queryFn: () =>
      api.get.stores({
        ...queryParams,
        filter: hasFilter ? filters : undefined,
      }),
    placeholderData: keepPreviousData,
  });
};

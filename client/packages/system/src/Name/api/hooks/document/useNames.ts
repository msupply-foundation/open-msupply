import {
  useQuery,
  keepPreviousData,
  useUrlQuery,
  useUrlQueryParams,
  PropertyValueFilterInput,
} from '@openmsupply-client/common';
import { useNameApi } from '../utils/useNameApi';

// URL params like `property.<propertyId>=<optionId|text>` are turned into
// PropertyValueFilterInput entries on the names query. The value column we
// target depends on the property's `type` — option-typed properties use
// `valueOptionId`, everything else falls back to `valueText` (the only branch
// the toolbar currently emits, but the parsing is generic so adding numeric/
// date filters later only requires a Toolbar change).
const PROPERTY_PREFIX = 'property.';

const buildPropertyFilters = (
  urlQuery: Record<string, unknown>,
  optionPropertyIds: Set<string>
): PropertyValueFilterInput[] => {
  const filters: PropertyValueFilterInput[] = [];
  for (const [key, value] of Object.entries(urlQuery)) {
    if (!key.startsWith(PROPERTY_PREFIX)) continue;
    if (value === undefined || value === null || value === '') continue;
    const propertyId = key.slice(PROPERTY_PREFIX.length);
    const stringValue = String(value);
    filters.push({
      propertyId: { equalTo: propertyId },
      ...(optionPropertyIds.has(propertyId)
        ? { valueOptionId: { equalTo: stringValue } }
        : { valueText: { like: stringValue } }),
    });
  }
  return filters;
};

export const useNames = (
  type: 'customer' | 'supplier',
  optionPropertyIds: Set<string> = new Set()
) => {
  const { queryParams } = useUrlQueryParams({
    initialSort: { key: 'name', dir: 'asc' },
  });
  const { urlQuery } = useUrlQuery();
  const propertyFilters = buildPropertyFilters(urlQuery, optionPropertyIds);
  const api = useNameApi();
  return {
    ...useQuery({
      // Property filters appended so different selections produce distinct
      // cache entries — they're not part of the typed `ListParams` shape.
      queryKey: [...api.keys.paramList(queryParams), propertyFilters],

      queryFn: () =>
        api.get.list({
          first: queryParams.first,
          offset: queryParams.offset,
          sortBy: queryParams.sortBy,
          type,
          filter: propertyFilters.length
            ? { property: propertyFilters }
            : undefined,
        }),

      placeholderData: keepPreviousData,
    }),
  };
};

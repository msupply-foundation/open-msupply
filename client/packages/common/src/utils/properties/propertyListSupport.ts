import { MRT_RowData } from 'material-react-table';

import {
  FilterDefinition,
  GroupFilterDefinition,
} from '../../ui/components/inputs/Filters';
import { ColumnDef } from '../../ui/layout/tables/types';
import { ColumnType } from '../../ui/layout/tables/useGetColumnDefDefaults';
import { FilterBy, FilterRule } from '../../hooks/useQueryParams';
import { PropertyNodeValueTypeV2 } from '@common/types';
import {
  formatPropertyV2Value,
  getHierarchicalOptions,
  PropertyV2DefinitionLike,
} from './propertiesV2';

// List-view support for propertiesV2: build filter definitions, URL filter
// configs and table columns for every property visible on a table scope, and
// translate the resulting FilterBy entries into the server's `dynamicFilter`
// condition AST (see server json_property_filter.rs / dynamic_query_filter.rs).

/** The full definition shape list views need (the per-package generated
 * `PropertyV2Fragment`s are structurally assignable). */
export interface PropertyV2ListDefinition extends PropertyV2DefinitionLike {
  key: string;
  name: string;
}

/** Prefix marking URL parameters (and FilterBy keys) as property filters,
 * e.g. `?prop-custom_population=100_500`. */
export const PROPERTY_URL_PREFIX = 'prop-';

export const propertyUrlParam = (key: string) => `${PROPERTY_URL_PREFIX}${key}`;

// The serde wire shape of the server's dynamic filter condition AST
// (`NameCondition::Inner` / `ItemCondition::Inner` — externally tagged enums).
export type GeneralFilterValue<T> =
  | { Equal: T }
  | { NotEqual: T }
  | { GreaterThan: T }
  | { LowerThan: T }
  | { GreaterThanOrEqual: T }
  | { LowerThanOrEqual: T }
  | { In: T[] }
  | { Like: T }
  | 'IsNull'
  | 'IsNotNull';

export type PropertyValueFilter =
  | { Text: GeneralFilterValue<string> }
  | { Number: GeneralFilterValue<number> }
  | { Date: GeneralFilterValue<string> }
  | { Boolean: GeneralFilterValue<boolean> }
  | { Option: GeneralFilterValue<string> };

export type DynamicFilterCondition =
  | { Property: { key: string; filter: PropertyValueFilter } }
  | { And: DynamicFilterCondition[] }
  | { Or: DynamicFilterCondition[] };

/** Translated suffixes for range filter element names, e.g.
 * `{ min: t('label.min'), max: t('label.max'), fromDate: t('label.from-date'), toDate: t('label.to-date') }` */
export interface PropertyFilterRangeLabels {
  min: string;
  max: string;
  fromDate: string;
  toDate: string;
}

/**
 * One FilterMenu definition per property, by value type: TEXT → substring
 * text filter, OPTION → hierarchical dropdown (same control as the edit
 * input: parents are indented headers, leaves selectable), NUMBER/REAL →
 * min/max range pair, DATE → date range pair, BOOLEAN → toggle. Properties
 * with an unknown value type get no filter.
 */
export const buildPropertyFilterDefinitions = (
  properties: PropertyV2ListDefinition[],
  rangeLabels: PropertyFilterRangeLabels
): (FilterDefinition | GroupFilterDefinition)[] =>
  properties.flatMap(
    (property): (FilterDefinition | GroupFilterDefinition)[] => {
      const urlParameter = propertyUrlParam(property.key);
      const { name } = property;

      switch (property.valueType) {
        case PropertyNodeValueTypeV2.Text:
          return [{ type: 'text' as const, name, urlParameter }];
        case PropertyNodeValueTypeV2.Option:
          return [
            {
              type: 'hierarchicalEnum' as const,
              name,
              urlParameter,
              options: getHierarchicalOptions(property),
            },
          ];
        case PropertyNodeValueTypeV2.Number:
        case PropertyNodeValueTypeV2.Real:
          return [
            {
              type: 'group' as const,
              name,
              elements: [
                {
                  type: 'number' as const,
                  name: `${name} (${rangeLabels.min})`,
                  urlParameter,
                  range: 'from' as const,
                },
                {
                  type: 'number' as const,
                  name: `${name} (${rangeLabels.max})`,
                  urlParameter,
                  range: 'to' as const,
                },
              ],
            },
          ];
        case PropertyNodeValueTypeV2.Date:
          return [
            {
              type: 'group' as const,
              name,
              elements: [
                {
                  type: 'date' as const,
                  name: `${name} (${rangeLabels.fromDate})`,
                  urlParameter,
                  range: 'from' as const,
                },
                {
                  type: 'date' as const,
                  name: `${name} (${rangeLabels.toDate})`,
                  urlParameter,
                  range: 'to' as const,
                },
              ],
            },
          ];
        case PropertyNodeValueTypeV2.Boolean:
          return [{ type: 'boolean' as const, name, urlParameter }];
        default:
          return [];
      }
    }
  );

/**
 * useUrlQueryParams `filters` config entries for the property URL parameters,
 * so property values reach FilterBy with the right condition (and are not
 * numerically coerced — the keys land in skipParse).
 */
export const buildPropertyUrlFilterConfigs = (
  properties: PropertyV2ListDefinition[]
): { key: string; condition?: string }[] =>
  properties.flatMap(property => {
    const key = propertyUrlParam(property.key);
    switch (property.valueType) {
      case PropertyNodeValueTypeV2.Text:
        return [{ key }]; // default condition: like
      case PropertyNodeValueTypeV2.Option:
        return [{ key, condition: 'equalTo' }];
      case PropertyNodeValueTypeV2.Number:
      case PropertyNodeValueTypeV2.Real:
      case PropertyNodeValueTypeV2.Date:
        return [{ key, condition: 'between' }];
      case PropertyNodeValueTypeV2.Boolean:
        return [{ key, condition: '=' }];
      default:
        return [];
    }
  });

const toNumber = (value: unknown): number | undefined => {
  if (value === null || value === undefined || value === '') return undefined;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
};

const propertyValueFilters = (
  property: PropertyV2ListDefinition,
  entry: FilterRule | null | boolean | string | number
): PropertyValueFilter[] => {
  switch (property.valueType) {
    case PropertyNodeValueTypeV2.Text: {
      const like = (entry as FilterRule)?.like;
      return like === undefined || like === null
        ? []
        : [{ Text: { Like: String(like) } }];
    }
    case PropertyNodeValueTypeV2.Option: {
      const equalTo = (entry as FilterRule)?.equalTo;
      return equalTo === undefined || equalTo === null
        ? []
        : [{ Option: { Equal: String(equalTo) } }];
    }
    case PropertyNodeValueTypeV2.Number:
    case PropertyNodeValueTypeV2.Real: {
      const rule = entry as FilterRule;
      const from = toNumber(rule?.afterOrEqualTo);
      const to = toNumber(rule?.beforeOrEqualTo);
      return [
        ...(from !== undefined
          ? [{ Number: { GreaterThanOrEqual: from } } as const]
          : []),
        ...(to !== undefined
          ? [{ Number: { LowerThanOrEqual: to } } as const]
          : []),
      ];
    }
    case PropertyNodeValueTypeV2.Date: {
      const rule = entry as FilterRule;
      const from = rule?.afterOrEqualTo;
      const to = rule?.beforeOrEqualTo;
      return [
        ...(from
          ? [{ Date: { GreaterThanOrEqual: String(from) } } as const]
          : []),
        ...(to ? [{ Date: { LowerThanOrEqual: String(to) } } as const] : []),
      ];
    }
    case PropertyNodeValueTypeV2.Boolean:
      return typeof entry === 'boolean' ? [{ Boolean: { Equal: entry } }] : [];
    default:
      return [];
  }
};

/**
 * Translate a FilterBy from useUrlQueryParams: `prop-*` entries are stripped
 * and re-expressed as a `dynamicFilter` entry holding the condition AST the
 * server expects (multiple conditions AND together); regular (typed) filter
 * entries pass through unchanged.
 */
export const mapPropertyFilters = (
  filterBy: FilterBy | null,
  properties: PropertyV2ListDefinition[]
): FilterBy | null => {
  if (!filterBy) return filterBy;

  const result: FilterBy = {};
  const conditions: DynamicFilterCondition[] = [];

  for (const [key, entry] of Object.entries(filterBy)) {
    if (!key.startsWith(PROPERTY_URL_PREFIX)) {
      result[key] = entry;
      continue;
    }
    const propertyKey = key.slice(PROPERTY_URL_PREFIX.length);
    const property = properties.find(p => p.key === propertyKey);
    if (!property) continue;

    conditions.push(
      ...propertyValueFilters(property, entry).map(filter => ({
        Property: { key: property.key, filter },
      }))
    );
  }

  if (conditions.length > 0) {
    const dynamicFilter: DynamicFilterCondition =
      conditions.length === 1 && conditions[0]
        ? conditions[0]
        : { And: conditions };
    // FilterBy's value union doesn't know about condition ASTs; it's spread
    // verbatim into the GraphQL filter input, where dynamicFilter is JSON
    result['dynamicFilter'] = dynamicFilter as unknown as FilterBy[string];
  }

  return Object.keys(result).length === 0 ? null : result;
};

/**
 * One (non-sortable) display column per property, appended after the fixed
 * columns and visible by default. OPTION ids resolve to option names, DATE
 * values are localised, BOOLEAN renders as the standard boolean column.
 */
export const buildPropertyColumns = <
  T extends MRT_RowData & { propertiesV2?: Record<string, unknown> | null },
>(
  properties: PropertyV2ListDefinition[],
  localisedDate: (date: Date) => string
): ColumnDef<T>[] =>
  properties.map(property => ({
    id: propertyUrlParam(property.key),
    header: property.name,
    enableSorting: false,
    ...(property.valueType === PropertyNodeValueTypeV2.Boolean
      ? {
          columnType: ColumnType.Boolean,
          accessorFn: (row: T) => row.propertiesV2?.[property.key] ?? null,
        }
      : {
          accessorFn: (row: T) =>
            formatPropertyV2Value(
              property,
              row.propertiesV2?.[property.key],
              localisedDate
            ),
        }),
  }));

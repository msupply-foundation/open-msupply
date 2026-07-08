import { MRT_RowData } from 'material-react-table';

import {
  FilterDefinition,
  GroupFilterDefinition,
} from '../../ui/components/inputs/Filters';
import { ColumnDef } from '../../ui/layout/tables/types';
import { ColumnType } from '../../ui/layout/tables/useGetColumnDefDefaults';
import { FilterBy, FilterRule } from '../../hooks/useQueryParams';
import { noOtherVariants } from '../types';
import { CustomFieldNodeValueType } from '@common/types';
import {
  formatCustomFieldValue,
  getHierarchicalOptions,
  getOptionAndDescendantIds,
  CustomFieldDefinitionLike,
} from './customFields';

// List-view support for customFields: build filter definitions, URL filter
// configs and table columns for every property visible on a table scope, and
// translate the resulting FilterBy entries into the server's `dynamicFilter`
// condition AST (see server json_property_filter.rs / dynamic_query_filter.rs).

/** The full definition shape list views need (the per-package generated
 * `CustomFieldFragment`s are structurally assignable). */
export interface CustomFieldListDefinition extends CustomFieldDefinitionLike {
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
  | { CustomField: { key: string; filter: PropertyValueFilter } }
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
 * input, but any level can be picked — a parent means "anything under it"),
 * INTEGER/REAL → min/max range pair, DATE → date range pair, BOOLEAN →
 * toggle. Properties with an unknown value type get no filter.
 */
export const buildCustomFieldFilterDefinitions = (
  properties: CustomFieldListDefinition[],
  rangeLabels: PropertyFilterRangeLabels
): (FilterDefinition | GroupFilterDefinition)[] =>
  properties.flatMap(
    (property): (FilterDefinition | GroupFilterDefinition)[] => {
      const urlParameter = propertyUrlParam(property.key);
      const { name } = property;

      switch (property.valueType) {
        case CustomFieldNodeValueType.Text:
          return [{ type: 'text' as const, name, urlParameter }];
        case CustomFieldNodeValueType.Option:
          return [
            {
              type: 'hierarchicalEnum' as const,
              name,
              urlParameter,
              options: getHierarchicalOptions(property),
            },
          ];
        case CustomFieldNodeValueType.Integer:
        case CustomFieldNodeValueType.Real:
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
        case CustomFieldNodeValueType.Date:
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
        case CustomFieldNodeValueType.Boolean:
          return [{ type: 'boolean' as const, name, urlParameter }];
      }
      // Exhaustive over the value type enum — a new variant fails to compile here.
      return noOtherVariants(property.valueType);
    }
  );

/**
 * useUrlQueryParams `filters` config entries for the property URL parameters,
 * so property values reach FilterBy with the right condition (and are not
 * numerically coerced — the keys land in skipParse).
 */
export const buildPropertyUrlFilterConfigs = (
  properties: CustomFieldListDefinition[]
): { key: string; condition?: string }[] =>
  properties.flatMap(property => {
    const key = propertyUrlParam(property.key);
    switch (property.valueType) {
      case CustomFieldNodeValueType.Text:
        return [{ key }]; // default condition: like
      case CustomFieldNodeValueType.Option:
        return [{ key, condition: 'equalTo' }];
      case CustomFieldNodeValueType.Integer:
      case CustomFieldNodeValueType.Real:
      case CustomFieldNodeValueType.Date:
        return [{ key, condition: 'between' }];
      case CustomFieldNodeValueType.Boolean:
        return [{ key, condition: '=' }];
    }
    // Exhaustive over the value type enum — a new variant fails to compile here.
    return noOtherVariants(property.valueType);
  });

const toNumber = (value: unknown): number | undefined => {
  if (value === null || value === undefined || value === '') return undefined;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
};

const propertyValueFilters = (
  property: CustomFieldListDefinition,
  entry: FilterRule | null | boolean | string | number
): PropertyValueFilter[] => {
  switch (property.valueType) {
    case CustomFieldNodeValueType.Text: {
      const like = (entry as FilterRule)?.like;
      return like === undefined || like === null
        ? []
        : [{ Text: { Like: String(like) } }];
    }
    case CustomFieldNodeValueType.Option: {
      const equalTo = (entry as FilterRule)?.equalTo;
      if (equalTo === undefined || equalTo === null) return [];
      // A parent selection means "anything under it": expand to the id plus
      // all descendant ids (records store leaf ids). Leaves (and unknown ids)
      // expand to just themselves and stay an exact match.
      const ids = getOptionAndDescendantIds(property, String(equalTo));
      return ids.length > 1
        ? [{ Option: { In: ids } }]
        : [{ Option: { Equal: String(equalTo) } }];
    }
    case CustomFieldNodeValueType.Integer:
    case CustomFieldNodeValueType.Real: {
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
    case CustomFieldNodeValueType.Date: {
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
    case CustomFieldNodeValueType.Boolean:
      return typeof entry === 'boolean' ? [{ Boolean: { Equal: entry } }] : [];
  }
  // Exhaustive over the value type enum — a new variant fails to compile here.
  return noOtherVariants(property.valueType);
};

/**
 * Translate a FilterBy from useUrlQueryParams: `prop-*` entries are stripped
 * and re-expressed as a `dynamicFilter` entry holding the condition AST the
 * server expects (multiple conditions AND together); regular (typed) filter
 * entries pass through unchanged.
 */
export const mapPropertyFilters = (
  filterBy: FilterBy | null,
  properties: CustomFieldListDefinition[]
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
        CustomField: { key: property.key, filter },
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
  T extends MRT_RowData & { customFields?: Record<string, unknown> | null },
>(
  properties: CustomFieldListDefinition[],
  localisedDate: (date: Date) => string
): ColumnDef<T>[] =>
  properties.map(property => ({
    id: propertyUrlParam(property.key),
    header: property.name,
    enableSorting: false,
    ...(property.valueType === CustomFieldNodeValueType.Boolean
      ? {
          columnType: ColumnType.Boolean,
          accessorFn: (row: T) => row.customFields?.[property.key] ?? null,
        }
      : {
          accessorFn: (row: T) =>
            formatCustomFieldValue(
              property,
              row.customFields?.[property.key],
              localisedDate
            ),
        }),
  }));

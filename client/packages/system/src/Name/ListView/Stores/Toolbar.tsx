import React from 'react';
import {
  AppBarContentPortal,
  Box,
  FilterDefinition,
  FilterMenu,
  FilterRule,
  PropertyNodeValueType,
  PropertyV2TypeEnum,
  SearchBar,
  useTranslation,
  useUrlQueryParams,
} from '@openmsupply-client/common';
import { useName, NamePropertyV2Fragment } from '../../api';

// Returns one or two FilterDefinitions per legacy property: number-typed
// properties get two chips (min/max) that share a urlParameter via the
// `range: 'from' | 'to'` mechanism, so the user can express a range and
// every other type stays a single chip.
const buildLegacyFilterDefinitions = (
  property: { name: string; key: string; valueType: PropertyNodeValueType },
  prefix: 'legacyProperty' | 'legacyPropertyJsonb',
  suffixLabel: string
): FilterDefinition[] => {
  const urlParameter = `${prefix}.${property.key}`;
  const name = `${property.name}${suffixLabel}`;
  switch (property.valueType) {
    case PropertyNodeValueType.Date:
      return [{ type: 'date', name, urlParameter }];
    case PropertyNodeValueType.Float:
    case PropertyNodeValueType.Integer:
      return [
        { type: 'number', name: `${name} min`, urlParameter, range: 'from' },
        { type: 'number', name: `${name} max`, urlParameter, range: 'to' },
      ];
    case PropertyNodeValueType.Boolean:
      return [{ type: 'boolean', name, urlParameter }];
    default:
      return [{ type: 'text', name, urlParameter, placeholder: property.name }];
  }
};

// V2-prototype filters: option-typed properties become an enum (Select);
// number-typed properties get min/max chips like the legacy ones; everything
// else falls through to a text filter on `valueText`. URL params use
// `property.<propertyId>` (matching the names list V2 wiring).
const buildV2FilterDefinitions = (
  prop: NamePropertyV2Fragment
): FilterDefinition[] => {
  const urlParameter = `property.${prop.id}`;
  const name = `${prop.name} (V2)`;
  if (prop.type === PropertyV2TypeEnum.Option) {
    const options = prop.options
      .filter(o => !o.isDeleted)
      .map(o => ({ label: o.name, value: o.id }));
    if (options.length === 0) return [];
    return [{ type: 'enum', name, urlParameter, options }];
  }
  if (prop.type === PropertyV2TypeEnum.Number) {
    return [
      { type: 'number', name: `${name} min`, urlParameter, range: 'from' },
      { type: 'number', name: `${name} max`, urlParameter, range: 'to' },
    ];
  }
  return [{ type: 'text', name, urlParameter, placeholder: prop.name }];
};

export const Toolbar = () => {
  const t = useTranslation();
  const { data: legacyProperties } = useName.document.properties();
  const { data: v2Properties } = useName.document.namePropertyDefinitions();

  const { filter } = useUrlQueryParams({
    filters: [{ key: 'codeOrName' }],
  });

  const filterString =
    ((filter.filterBy?.['codeOrName'] as FilterRule)?.like as string) || '';

  // Each defined legacy property gets two entries — text-JSON column and
  // JSONB twin — so the user can pick either path or combine both. V2
  // properties get one entry each. All three flavours can co-exist in a
  // single query to isolate where time is spent.
  const legacyFilters: FilterDefinition[] = (legacyProperties ?? []).flatMap(
    np => [
      ...buildLegacyFilterDefinitions(np.property, 'legacyProperty', ''),
      ...buildLegacyFilterDefinitions(
        np.property,
        'legacyPropertyJsonb',
        ' (JSONB)'
      ),
    ]
  );

  const v2Filters: FilterDefinition[] = (v2Properties ?? []).flatMap(
    buildV2FilterDefinitions
  );

  const allFilters = [...legacyFilters, ...v2Filters];

  return (
    <AppBarContentPortal
      sx={{
        paddingBottom: '16px',
        flex: 1,
        justifyContent: 'space-between',
        display: 'flex',
      }}
    >
      <Box display="flex" gap={1} alignItems="center">
        <SearchBar
          placeholder={t('placeholder.enter-code-or-name')}
          value={filterString ?? ''}
          onChange={newValue => {
            filter.onChangeStringFilterRule('codeOrName', 'like', newValue);
          }}
        />
        {allFilters.length > 0 && <FilterMenu filters={allFilters} />}
      </Box>
    </AppBarContentPortal>
  );
};

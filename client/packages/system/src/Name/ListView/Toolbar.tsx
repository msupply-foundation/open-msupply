import React from 'react';
import {
  AppBarContentPortal,
  Box,
  FilterDefinition,
  FilterMenu,
  PropertyV2TypeEnum,
} from '@openmsupply-client/common';
import { useName, NamePropertyV2Fragment } from '../api';

// Translates a property definition (KDD option 1) into the FilterMenu's
// FilterDefinition shape. Option-typed properties become a Select (enum filter)
// whose options are the property's `option` rows. Everything else becomes a
// text filter — the URL value is interpreted as a `like` match on
// `value_text` by the names hook.
const toFilterDefinition = (
  prop: NamePropertyV2Fragment
): FilterDefinition | null => {
  const urlParameter = `property.${prop.id}`;
  if (prop.type === PropertyV2TypeEnum.Option) {
    const options = prop.options
      .filter(o => !o.isDeleted)
      .map(o => ({ label: o.name, value: o.id }));
    if (options.length === 0) return null;
    return {
      type: 'enum',
      name: prop.name,
      urlParameter,
      options,
    };
  }
  return {
    type: 'text',
    name: prop.name,
    urlParameter,
    placeholder: prop.name,
  };
};

export const Toolbar = () => {
  const { data: properties } = useName.document.namePropertyDefinitions();

  const propertyFilters: FilterDefinition[] = (properties ?? [])
    .map(toFilterDefinition)
    .filter((f): f is FilterDefinition => f !== null);

  if (propertyFilters.length === 0) return null;

  return (
    <AppBarContentPortal
      sx={{
        paddingBottom: '16px',
        flex: 1,
        justifyContent: 'space-between',
        display: 'flex',
      }}
    >
      <Box display="flex" gap={1}>
        <FilterMenu filters={propertyFilters} />
      </Box>
    </AppBarContentPortal>
  );
};

import React, { FC } from 'react';
import { useUrlQuery } from '@common/hooks';
import { HierarchicalOption } from '@common/utils';
import { HierarchicalOptionAutocomplete } from '../Autocomplete';
import { FILTER_WIDTH, FilterDefinitionCommon } from './FilterMenu';
import { FilterLabelSx } from './styleConstants';

export interface HierarchicalEnumFilterDefinition extends FilterDefinitionCommon {
  type: 'hierarchicalEnum';
  /** The flattened hierarchy in display order — see getHierarchicalOptions.
   * Any level can be picked; a parent selection filters to anything under it
   * (expanded to descendant ids in mapPropertyFilters). */
  options: HierarchicalOption[];
}

export const HierarchicalEnumFilter: FC<{
  filterDefinition: HierarchicalEnumFilterDefinition;
}> = ({ filterDefinition }) => {
  const { urlParameter, options, name } = filterDefinition;
  const { urlQuery, updateQuery } = useUrlQuery({
    // option ids shouldn't be coerced (e.g. numeric-looking ids)
    skipParse: [urlParameter],
  });
  const value = (urlQuery[urlParameter] as string) ?? null;

  return (
    <HierarchicalOptionAutocomplete
      width={`${FILTER_WIDTH}px`}
      // the options popover sizes to content so deep hierarchies stay readable
      popperMinWidth={FILTER_WIDTH}
      options={options}
      value={value}
      parentsSelectable
      onChange={id => updateQuery({ [urlParameter]: id ?? '' })}
      inputProps={{ label: name, sx: FilterLabelSx }}
    />
  );
};

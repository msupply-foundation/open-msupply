import React, { FC } from 'react';
import { useUrlQuery } from '@common/hooks';
import { Select } from '@common/components';
import { FILTER_WIDTH, FilterDefinitionCommon } from './FilterMenu';
import { FilterLabelSx } from './styleConstants';

export interface EnumFilterDefinition extends FilterDefinitionCommon {
  type: 'enum';
  options: EnumOption[];
}

type EnumOption = { label: string; value: string };

export const EnumFilter: FC<{
  filterDefinition: EnumFilterDefinition;
  remove: () => void;
}> = ({ filterDefinition }) => {
  const { urlParameter, options, name } = filterDefinition;
  const { urlQuery, updateQuery } = useUrlQuery();

  const value = urlQuery[urlParameter] as string | undefined;

  const handleChange = (selection: string) => {
    if (!selection) {
      updateQuery({ [urlParameter]: '' });
      return;
    }
    const option = options.find(opt => opt.value === selection);
    if (!option) return;

    updateQuery({ [urlParameter]: option.value });
  };

  return (
    <Select
      options={options}
      placeholder={name}
      InputProps={{
        sx: {
          width: FILTER_WIDTH,
        },
      }}
      sx={FilterLabelSx}
      label={name}
      value={value ?? ''}
      onChange={e => handleChange(e.target.value)}
    />
  );
};

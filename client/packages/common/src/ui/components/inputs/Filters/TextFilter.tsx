import React, { FC, useState } from 'react';
import { BasicTextInput } from '../TextInput';
import { useDebouncedValueCallback, useUrlQuery } from '@common/hooks';
import {
  EndAdornment,
  FILTER_WIDTH,
  FilterDefinitionCommon,
} from './FilterMenu';
import { FilterLabelSx } from './styleConstants';

export interface TextFilterDefinition extends FilterDefinitionCommon {
  type: 'text';
  placeholder?: string;
}

export const TextFilter: FC<{
  filterDefinition: TextFilterDefinition;
  remove: () => void;
}> = ({ filterDefinition }) => {
  const { urlQuery, updateQuery } = useUrlQuery();
  const [value, setValue] = useState(
    urlQuery[filterDefinition.urlParameter] ?? ''
  );

  const debouncedOnChange = useDebouncedValueCallback(
    value => updateQuery({ [filterDefinition.urlParameter]: value }),
    [],
    200
  );

  const handleChange = (newValue: string) => {
    setValue(newValue);
    debouncedOnChange(newValue);
  };

  return (
    <BasicTextInput
      InputProps={{
        endAdornment: (
          <EndAdornment
            isLoading={false}
            hasValue={!!value}
            onClear={() => handleChange('')}
          />
        ),
        sx: { width: FILTER_WIDTH },
      }}
      value={value}
      onChange={e => handleChange(e.target.value)}
      label={filterDefinition.name}
      placeholder={filterDefinition.placeholder ?? ''}
      sx={FilterLabelSx}
    />
  );
};

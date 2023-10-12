import React, { FC, useState } from 'react';
import { BasicTextInput } from '../TextInput';
import { useDebouncedValueCallback, useUrlQuery } from '@common/hooks';
import {
  EndAdornment,
  FILTER_WIDTH,
  FilterDefinitionCommon,
} from './FilterMenu';

export interface TextFilterDefinition extends FilterDefinitionCommon {
  type: 'text';
  placeholder?: string;
}

export const TextFilter: FC<{
  filterDefinition: TextFilterDefinition;
  remove: () => void;
}> = ({ filterDefinition, remove }) => {
  const [loading, setLoading] = useState(false);
  const { urlQuery, updateQuery } = useUrlQuery();
  const [value, setValue] = useState(
    urlQuery[filterDefinition.urlParameter] ?? ''
  );

  const debouncedOnChange = useDebouncedValueCallback(
    value => {
      updateQuery({ [filterDefinition.urlParameter]: value });
      setLoading(false);
    },
    [],
    500
  );

  const handleChange = (newValue: string) => {
    setLoading(true);
    setValue(newValue);
    debouncedOnChange(newValue);
  };

  return (
    <BasicTextInput
      InputProps={{
        endAdornment: (
          <EndAdornment
            isLoading={loading}
            hasValue={!!value}
            onClear={remove}
          />
        ),
        sx: { width: FILTER_WIDTH },
      }}
      value={value}
      onChange={e => handleChange(e.target.value)}
      label={filterDefinition.name}
      placeholder={filterDefinition.placeholder ?? ''}
      sx={{
        '& .MuiInputLabel-root': {
          zIndex: 100,
          top: '4px',
          left: '8px',
          color: 'gray.main',
        },
        '& .MuiInputLabel-root.Mui-focused': {
          color: 'secondary.main',
        },
      }}
    />
  );
};

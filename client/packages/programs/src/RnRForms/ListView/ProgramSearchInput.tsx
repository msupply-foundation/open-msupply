import React from 'react';
import {
  Autocomplete,
} from '@openmsupply-client/common';
import { ProgramFragment } from '../../api/operations.generated';
import { useProgramList } from '../../api';

type ProgramSearchInputProps = {
  value: ProgramFragment | null;
  onChange: (newProgram: ProgramFragment) => void;
};


export const ProgramSearchInput = ({
  value,
  onChange,
}: ProgramSearchInputProps) => { 
 const { data, isLoading } = useProgramList();

  return (
    <Autocomplete
    width='100%'
      loading={isLoading}
      options={data?.nodes ?? []}
      optionKey='name'
      onChange={(_, value) => value && onChange(value)}
      value={value ? { label: value.name, ...value } : null}
      isOptionEqualToValue={(option, value) => option.id === value.id}
    />
  );
 };

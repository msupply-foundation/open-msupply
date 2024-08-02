import React, { useEffect } from 'react';
import { Autocomplete } from '@openmsupply-client/common';
import { ProgramFragment } from '../../api/operations.generated';
import { useProgramList } from '../../api';

type ProgramSearchInputProps = {
  value: ProgramFragment | null;
  onChange: (newProgram: ProgramFragment) => void;
  width?: string;
};

export const ProgramSearchInput = ({
  value,
  onChange,
  width,
}: ProgramSearchInputProps) => {
  const { data, isLoading } = useProgramList();

  // If there is only one value, set it automatically
  useEffect(() => {
    if (data?.nodes.length == 1 && !value) {
      onChange(data.nodes[0]!); // if length is 1, the first element must exist
    }
  }, [data?.nodes.length]);

  return (
    <Autocomplete
      width={width}
      loading={isLoading}
      options={data?.nodes ?? []}
      optionKey="name"
      onChange={(_, value) => value && onChange(value)}
      value={value ? { label: value.name, ...value } : null}
      isOptionEqualToValue={(option, value) => option.id === value.id}
      clearable={false}
    />
  );
};

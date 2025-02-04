import React, { useEffect } from 'react';
import { Autocomplete } from '@openmsupply-client/common';
import { DocumentRegistryFragment } from '../api/operations.generated';
import { useDocumentRegistry } from '../api';

type PatientProgramSearchInputProps = {
  value: DocumentRegistryFragment | null;
  onChange: (newProgram: DocumentRegistryFragment) => void;
};

export const PatientProgramSearchInput = ({
  value,
  onChange,
}: PatientProgramSearchInputProps) => {
  const { data, isLoading } = useDocumentRegistry.get.programRegistries();

  // If there is only one value, set it automatically
  useEffect(() => {
    if (data?.nodes.length == 1 && !value) {
      onChange(data.nodes[0]!); // if length is 1, the first element must exist
    }
  }, [data?.nodes.length]);

  return (
    <Autocomplete
      fullWidth
      loading={isLoading}
      options={data?.nodes ?? []}
      optionKey="name"
      onChange={(_, newVal) =>
        newVal && newVal.id !== value?.id && onChange(newVal)
      }
      value={value ? { label: value.name ?? '', ...value } : null}
      isOptionEqualToValue={(option, value) => option.id === value.id}
      clearable={false}
    />
  );
};

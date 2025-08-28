import React, { useEffect } from 'react';
import { Autocomplete } from '@openmsupply-client/common';
import { DocumentRegistryFragment } from '../api/operations.generated';
import { useDocumentRegistry } from '../api';

type PatientProgramSearchInputProps = {
  value: DocumentRegistryFragment | null | AllOptionsType;
  onChange: (newProgram: DocumentRegistryFragment | null) => void;
  setProgram: (newProgram: DocumentRegistryFragment) => void;
  programId: string | null;
  allProgramsOption?: boolean;
};

export type AllOptionsType = {
  name: string;
  id: string;
};

export const PatientProgramSearchInput = ({
  value,
  onChange,
  setProgram,
  programId,
  allProgramsOption,
}: PatientProgramSearchInputProps) => {
  const { data, isLoading } = useDocumentRegistry.get.programRegistries();

  const allProgramsOptionRenderer: AllOptionsType = {
    id: 'AllProgramsSelector',
    name: 'All programs',
  };

  const patientPrograms = data?.nodes ?? [];
  const options =
    patientPrograms.length > 1 && allProgramsOption
      ? [...patientPrograms, allProgramsOptionRenderer]
      : patientPrograms;

  // If there is only one value, set it automatically
  useEffect(() => {
    if (data?.nodes.length == 1 && !value) {
      onChange(data.nodes[0]!); // if length is 1, the first element must exist
    }
  }, [data?.nodes.length]);

  if (programId && !value) {
    const program = data?.nodes.find(program => program.id === programId);
    if (program) {
      setProgram(program);
    }
  }

  const handleChange = (
    newVal: DocumentRegistryFragment | null | AllOptionsType
  ) => {
    if (newVal?.id === 'AllOptionsId') {
      onChange(null);
    }
    newVal &&
      newVal.id !== value?.id &&
      onChange(newVal as DocumentRegistryFragment);
  };

  return (
    <Autocomplete
      fullWidth
      loading={isLoading}
      options={options}
      optionKey="name"
      onChange={(_, newVal) => handleChange(newVal)}
      value={value ? { label: value.name ?? '', ...value } : null}
      isOptionEqualToValue={(option, value) => option.id === value.id}
      clearable={false}
    />
  );
};

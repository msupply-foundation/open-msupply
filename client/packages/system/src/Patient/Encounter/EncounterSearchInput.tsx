import React, { FC, useEffect, useState } from 'react';
import {
  Autocomplete,
  AutocompleteOptionRenderer,
  Box,
  DefaultAutocompleteItemOption,
  Typography,
} from '@openmsupply-client/common';
import { usePatient } from '../api';
import {
  useProgramEnrolments,
  useDocumentRegistry,
  EncounterRegistryByProgram,
} from '@openmsupply-client/programs';

interface EncounterSearchInputProps {
  onChange: (type: EncounterRegistryByProgram) => void;
  width?: number;
  lastEncounterType: string | undefined;
  disabled?: boolean;
}

export const getEncounterOptionRenderer =
  (): AutocompleteOptionRenderer<EncounterRegistryByProgram> =>
  (props, node) => {
    const name = node.encounter.name ?? '';

    return (
      <DefaultAutocompleteItemOption {...props} key={props.id}>
        <Box display="flex" alignItems="flex-end" gap={1} height={25}>
          <Typography>{name}</Typography>
        </Box>
      </DefaultAutocompleteItemOption>
    );
  };

export const EncounterSearchInput: FC<EncounterSearchInputProps> = ({
  onChange,
  width = 250,
  disabled = false,
  lastEncounterType: encounterType,
}) => {
  const patientId = usePatient.utils.id();
  const { data: enrolmentData, isLoading: isEnrolmentDataLoading } =
    useProgramEnrolments.document.list({
      filterBy: {
        patientId: { equalTo: patientId },
      },
    });
  const { data: encounterData, isLoading: isEncounterLoading } =
    useDocumentRegistry.get.encounterRegistriesByPrograms(
      enrolmentData?.nodes ?? []
    );
  const [buffer, setBuffer] = useState<EncounterRegistryByProgram | null>(null);

  useEffect(() => {
    if (!encounterData || !!buffer) return;

    const registry = encounterData.find(
      it => it.encounter.documentType === encounterType
    );
    setBuffer(registry ?? null);
    registry && onChange(registry);
  }, [buffer, encounterData, encounterType, setBuffer, onChange]);

  const EncounterOptionRenderer = getEncounterOptionRenderer();
  return (
    <Autocomplete
      disabled={disabled}
      clearable={false}
      value={
        buffer && {
          ...buffer,
          label: buffer.encounter.name ?? '',
        }
      }
      loading={isEnrolmentDataLoading || isEncounterLoading}
      onChange={(_, registry) => {
        setBuffer(registry ?? null);
        registry && onChange(registry);
      }}
      options={encounterData ?? []}
      renderOption={EncounterOptionRenderer}
      width={`${width}px`}
      popperMinWidth={width}
      isOptionEqualToValue={(option, value) =>
        option.encounter.id === value.encounter.id
      }
    />
  );
};

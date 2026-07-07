import React, { FC, useEffect, useState } from 'react';
import {
  AlertIcon,
  Autocomplete,
  AutocompleteOptionRenderer,
  Box,
  DefaultAutocompleteItemOption,
  Typography,
  useTranslation,
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
  fullWidth?: boolean;
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
  fullWidth,
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
  const t = useTranslation();
  const isLoading = isEnrolmentDataLoading || isEncounterLoading;
  if (!isLoading && !encounterData?.length) {
    return (
      <Box display="flex" gap={1} alignItems="center">
        <AlertIcon color="warning" />
        <Typography>{t('messages.no-encounters-configured')}</Typography>
      </Box>
    );
  }

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
      loading={isLoading}
      onChange={(_, registry) => {
        setBuffer(registry ?? null);
        registry && onChange(registry);
      }}
      options={encounterData ?? []}
      renderOption={EncounterOptionRenderer}
      width={`${width}px`}
      fullWidth={fullWidth}
      popperMinWidth={width}
      isOptionEqualToValue={(option, value) =>
        option.encounter.id === value.encounter.id
      }
    />
  );
};

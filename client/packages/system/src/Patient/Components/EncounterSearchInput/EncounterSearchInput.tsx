import React, { FC } from 'react';
import {
  Autocomplete,
  AutocompleteOptionRenderer,
  Box,
  DefaultAutocompleteItemOption,
  Typography,
  useBufferState,
} from '@openmsupply-client/common';
import { usePatient } from '../../api';
import { EncounterRegistry } from '../../api/hooks/document/useProgramEncounters';

interface EncounterSearchInputProps {
  onChange: (type: EncounterRegistry) => void;
  width?: number;
  value: EncounterRegistry | null;
  disabled?: boolean;
}

export const getEncounterOptionRenderer =
  (): AutocompleteOptionRenderer<EncounterRegistry> => (props, node) => {
    const name = node.encounter.name ?? '??';
    return (
      <DefaultAutocompleteItemOption {...props} key={props.id}>
        <Box display="flex" alignItems="flex-end" gap={1} height={25}>
          <Box display="flex" flexDirection="row" gap={1} width={110}>
            <Typography
              overflow="hidden"
              fontWeight="bold"
              textOverflow="ellipsis"
              sx={{
                whiteSpace: 'nowrap',
              }}
            >
              {name?.substring(0, 3)}
            </Typography>
          </Box>
          <Typography>{name}</Typography>
        </Box>
      </DefaultAutocompleteItemOption>
    );
  };

export const EncounterSearchInput: FC<EncounterSearchInputProps> = ({
  onChange,
  width = 250,
  value,
  disabled = false,
}) => {
  const { data: programsEnrolments, isLoading: programsIsLoading } =
    usePatient.document.programEnrolments();
  const { data, isLoading } = usePatient.document.programEncounters(
    programsEnrolments?.nodes ?? []
  );
  const [buffer, setBuffer] = useBufferState(value);
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
      loading={programsIsLoading || isLoading}
      onChange={(_, name) => {
        setBuffer(name);
        name && onChange(name);
      }}
      options={data ?? []}
      renderOption={EncounterOptionRenderer}
      width={`${width}px`}
      popperMinWidth={width}
      isOptionEqualToValue={(option, value) =>
        option.encounter.id === value.encounter.id
      }
    />
  );
};

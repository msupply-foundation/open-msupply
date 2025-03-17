import { Autocomplete } from '@openmsupply-client/common';
import { ProgramFragment } from '@openmsupply-client/programs';
import React from 'react';
import { FC } from 'react';

interface ProgramSearchInputProps {
  programs: ProgramFragment[];
  selectedProgram: ProgramFragment | null | undefined;
  onChange: (program: ProgramFragment | undefined) => void;
  width?: number;
  disabled?: boolean;
  fullWidth?: boolean;
}

export const ProgramSearchInput: FC<ProgramSearchInputProps> = ({
  selectedProgram,
  programs,
  onChange,
  width = 250,
  disabled,
  fullWidth,
}) => {
  return (
    <Autocomplete
      value={
        selectedProgram
          ? {
              label: selectedProgram.name,
              value: selectedProgram,
            }
          : null
      }
      isOptionEqualToValue={(option, value) =>
        option.value.id === value.value?.id
      }
      width={`${width}px`}
      onChange={(_, option) => {
        onChange(option?.value);
      }}
      options={programs.map(program => ({
        label: program.name,
        value: program,
      }))}
      sx={{ minWidth: width }}
      disabled={disabled}
      fullWidth={fullWidth}
    />
  );
};

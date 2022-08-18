import React, { FC } from 'react';
import { Autocomplete, useBufferState } from '@openmsupply-client/common';
import { ProgramRowFragmentWithId, usePatient } from '../../api';
import { getProgramOptionRenderer } from '../../../Program';

interface ProgramSearchInputProps {
  onChange: (type: ProgramRowFragmentWithId) => void;
  width?: number;
  value: ProgramRowFragmentWithId | null;
  disabled?: boolean;
}

export const ProgramSearchInput: FC<ProgramSearchInputProps> = ({
  onChange,
  width = 250,
  value,
  disabled = false,
}) => {
  const { data, isLoading } = usePatient.document.programs();
  const [buffer, setBuffer] = useBufferState(value);
  const ProgramOptionRenderer = getProgramOptionRenderer();

  return (
    <Autocomplete
      disabled={disabled}
      clearable={false}
      value={
        buffer && {
          ...buffer,
          label: buffer.document?.documentRegistry?.name ?? '',
        }
      }
      loading={isLoading}
      onChange={(_, name) => {
        setBuffer(name);
        name && onChange(name);
      }}
      options={data?.nodes ?? []}
      renderOption={ProgramOptionRenderer}
      width={`${width}px`}
      popperMinWidth={width}
      isOptionEqualToValue={(option, value) => option?.id === value?.id}
    />
  );
};

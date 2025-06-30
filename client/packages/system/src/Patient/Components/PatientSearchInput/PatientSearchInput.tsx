import React, { useEffect, useState } from 'react';
import {
  Autocomplete,
  Box,
  EditIcon,
  IconButton,
  useTranslation,
} from '@openmsupply-client/common';
import { NameSearchInputProps, SearchInputPatient } from '../../utils';
import { getPatientOptionRenderer } from '../PatientOptionRenderer';
import { useSearchPatient } from '../utils';

interface PatientSearchInputProps extends NameSearchInputProps {
  setCreatePatientModalOpen?: (open: boolean) => void;
  setEditPatientModalOpen?: (open: boolean) => void;
  allowCreate?: boolean;
  allowEdit?: boolean;
}

export const PatientSearchInput = ({
  autoFocus,
  onChange,
  width = 250,
  value,
  disabled = false,
  sx,
  setCreatePatientModalOpen,
  setEditPatientModalOpen,
  allowCreate = false,
  allowEdit = false,
}: PatientSearchInputProps) => {
  const t = useTranslation();
  const PatientOptionRenderer = getPatientOptionRenderer();
  const { isLoading, patients, search } = useSearchPatient();

  const [input, setInput] = useState('');

  useEffect(() => {
    if (value) {
      setInput(value.name);
      search(value.name);
    }
  }, [value]);

  const showCreate =
    allowCreate && patients.length === 0 && input !== '' && !isLoading;

  const options = patients as SearchInputPatient[];

  return (
    <Box width={`${width}px`} display={'flex'} alignItems="center">
      <Autocomplete
        autoFocus={autoFocus}
        options={options}
        disabled={disabled}
        clearable={false}
        loading={isLoading}
        onChange={(_, name) => {
          if (name && !(name instanceof Array)) {
            onChange(name);
            setInput(name.name);
          }
        }}
        renderOption={PatientOptionRenderer}
        getOptionLabel={(option: SearchInputPatient) => option.name}
        isOptionEqualToValue={(option, value) => option.name === value.name}
        popperMinWidth={width}
        value={value}
        inputValue={input}
        inputProps={{
          onChange: e => {
            const { value } = e.target;
            // update the input value and the search filter
            setInput(value);
            search(value);
          },
          // reset input value to previous selected patient if user clicks away
          // without selecting a patient
          onBlur: () => setInput(value?.name ?? ''),
        }}
        filterOptions={options => options}
        sx={{ width: '100%', ...sx }}
        noOptionsText={
          input.length > 0
            ? t('messages.no-matching-patients')
            : t('messages.type-to-search')
        }
        clickableOption={
          showCreate && setCreatePatientModalOpen
            ? {
                label: t('label.new-patient'),
                onClick: () => setCreatePatientModalOpen(true),
              }
            : undefined
        }
      />
      {allowEdit && value && (
        <>
          <IconButton
            icon={<EditIcon style={{ fontSize: 16, fill: 'none' }} />}
            label={t('label.edit')}
            onClick={() => setEditPatientModalOpen?.(true)}
          />
        </>
      )}
    </Box>
  );
};

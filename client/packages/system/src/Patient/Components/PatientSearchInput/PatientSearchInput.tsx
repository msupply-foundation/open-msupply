import React, { useEffect, useState } from 'react';
import {
  Autocomplete,
  Box,
  EditIcon,
  IconButton,
  useIntlUtils,
  useTranslation,
} from '@openmsupply-client/common';
import { NameSearchInputProps, SearchInputPatient } from '../../utils';
import { getPatientOptionRenderer } from '../PatientOptionRenderer';
import { useSearchPatient } from '../utils';
import { CreatePatientSlider } from '../../CreatePatientModal/CreatePatientSlider';
import { EditPatientModal } from '../../EditPatientModal';
import {
  CreateNewPatient,
  usePatientStore,
} from '@openmsupply-client/programs/src';
import { PatientColumnData } from '../../CreatePatientModal/PatientResultsTab';
import { CreatePatientModal } from '../../CreatePatientModal';

interface PatientSearchInputProps extends NameSearchInputProps {
  allowCreate?: boolean;
  allowEdit?: boolean;
  mountSlidePanel?: boolean;
}

export const PatientSearchInput = ({
  autoFocus,
  onChange,
  width = 250,
  value,
  disabled = false,
  sx,
  allowCreate = false,
  allowEdit = false,
  mountSlidePanel = false,
}: PatientSearchInputProps) => {
  const t = useTranslation();
  const PatientOptionRenderer = getPatientOptionRenderer();
  const { isLoading, patients, search } = useSearchPatient();
  const { createNewPatient } = usePatientStore();
  const { getLocalisedFullName } = useIntlUtils();

  const [input, setInput] = useState<string>('');
  const [createPatientOpen, setCreatePatientOpen] = useState(false);
  const [editPatientModalOpen, setEditPatientModalOpen] = useState(false);

  useEffect(() => {
    if (value) {
      setInput(value.name);
      search(value.name);
    }
  }, [value]);

  const asOption = (
    patient: CreateNewPatient | PatientColumnData
  ): SearchInputPatient => ({
    ...patient,
    name: getLocalisedFullName(patient.firstName, patient.lastName),
    code: patient.code ?? '',
    isDeceased: patient.isDeceased ?? false,
  });

  const handlePatientClose = (selectedPatient?: PatientColumnData) => {
    setCreatePatientOpen(false);
    const patientToSelect = selectedPatient ?? createNewPatient;
    if (patientToSelect) {
      onChange(asOption(patientToSelect));
    }
    setInput('');
    search('');
  };

  const showCreate = allowCreate && !!input && !isLoading;

  const CreatePatient = mountSlidePanel
    ? CreatePatientSlider
    : CreatePatientModal;

  const options = patients as SearchInputPatient[];

  return (
    <Box width={`${width}px`} display="flex" alignItems="center">
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
          onBlur: () => {
            if (value) {
              setInput(value.name);
            } else {
              setInput('');
              search('');
            }
          },
        }}
        filterOptions={options => options}
        sx={{ width: '100%', ...sx }}
        noOptionsText={t('messages.type-to-search')}
        clickableOption={
          showCreate
            ? {
                label: t('label.new-patient'),
                onClick: () => {
                  setCreatePatientOpen(true);
                },
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
      {allowCreate && (
        <CreatePatient
          open={createPatientOpen}
          onClose={() => setCreatePatientOpen(false)}
          onCreate={() => {
            handlePatientClose();
          }}
          onSelectPatient={patient => {
            handlePatientClose(patient);
          }}
        />
      )}
      {value && editPatientModalOpen && (
        <EditPatientModal
          patientId={value.id}
          onClose={() => {
            setEditPatientModalOpen(false);
          }}
          isOpen={editPatientModalOpen}
        />
      )}
    </Box>
  );
};

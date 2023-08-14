import React, { FC } from 'react';
import {
  Autocomplete,
  BasicModal,
  createQueryParamsStore,
  ModalTitle,
  QueryParamsProvider,
  Typography,
  useTranslation,
  useWindowDimensions,
} from '@openmsupply-client/common';
import { PatientRowFragment } from '../../api';
import { getPatientOptionRenderer } from '../PatientOptionRenderer';
import { PatientSearchModalProps, SearchInputPatient } from '../../utils';
import { searchPatient } from '../utils';

const PatientSearchComponent: FC<PatientSearchModalProps> = ({
  open,
  onClose,
  onChange,
}) => {
  const t = useTranslation('dispensary');
  const PatientOptionRenderer = getPatientOptionRenderer();
  const { height } = useWindowDimensions();
  const { debouncedOnChange, isLoading, patients, setSearchText, overlimit } =
    searchPatient();

  const modalHeight = height * 0.8;

  return (
    <BasicModal open={open} onClose={onClose} height={modalHeight}>
      <ModalTitle title={t('label.patients')} />
      {overlimit && (
        <Typography variant="body1" color="error" margin={1}>
          {t('messages.results-over-limit')}
        </Typography>
      )}
      <Autocomplete
        loading={isLoading}
        options={patients ?? []}
        onClose={onClose}
        onInputChange={(_, value) => {
          debouncedOnChange(value);
          setSearchText(value);
        }}
        renderOption={PatientOptionRenderer}
        getOptionLabel={(option: SearchInputPatient) => option.name}
        width="100%"
        onChange={(_, name) => {
          if (name && !(name instanceof Array)) onChange(name);
        }}
      />
    </BasicModal>
  );
};

export const PatientSearchModal: FC<PatientSearchModalProps> = props => (
  <QueryParamsProvider
    createStore={createQueryParamsStore<PatientRowFragment>({
      initialSortBy: { key: 'name' },
    })}
  >
    <PatientSearchComponent {...props} />
  </QueryParamsProvider>
);

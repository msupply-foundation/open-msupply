import React, { FC } from 'react';
import {
  AutocompleteList,
  BasicModal,
  Box,
  createQueryParamsStore,
  ModalTitle,
  QueryParamsProvider,
  Typography,
  useTranslation,
  useWindowDimensions,
} from '@openmsupply-client/common';
import { PatientRowFragment } from '../../api';
import { getPatientOptionRenderer } from '../PatientOptionRenderer';
import {
  filterByNameAndCode,
  PatientSearchModalProps,
  SearchInputPatient,
} from '../../utils';
import { searchPatient } from '../utils';

const PatientSearchComponent: FC<PatientSearchModalProps> = ({
  open,
  onClose,
  onChange,
}) => {
  const t = useTranslation('dispensary');
  const PatientOptionRenderer = getPatientOptionRenderer();
  const { height } = useWindowDimensions();
  const { isLoading, patients, setSearchText, totalCount, reset, searchText } =
    searchPatient();

  const modalHeight = height * 0.7;
  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <BasicModal open={open} onClose={handleClose} height={modalHeight}>
      <ModalTitle title={t('label.patients')} />
      <Box padding={2}>
        <Box>
          <Typography variant="body1">
            {!!searchText
              ? t('messages.results-found', { totalCount })
              : t('placeholder.search-by-name-or-code')}
          </Typography>
          {totalCount > 100 && (
            <Typography variant="body1" color="error">
              {t('messages.results-over-limit')}
            </Typography>
          )}
        </Box>
        <AutocompleteList
          loading={isLoading}
          options={patients ?? []}
          onInputChange={(_, value) => setSearchText(value)}
          renderOption={PatientOptionRenderer}
          getOptionLabel={(option: SearchInputPatient) => option.name}
          filterOptions={filterByNameAndCode}
          onChange={(_, name) => {
            if (name && !(name instanceof Array)) onChange(name);
          }}
          noOptionsText=""
        />
      </Box>
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

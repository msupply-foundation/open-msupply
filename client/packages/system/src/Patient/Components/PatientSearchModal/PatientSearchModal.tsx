import React, { FC } from 'react';
import {
  createQueryParamsStore,
  ListSearch,
  QueryParamsProvider,
  useTranslation,
} from '@openmsupply-client/common';
import { PatientRowFragment, usePatient } from '../../api';
import { getPatientOptionRenderer } from '../PatientOptionRenderer';
import { filterByNameAndCode, PatientSearchModalProps } from '../../utils';

const PatientSearchComponent: FC<PatientSearchModalProps> = ({
  open,
  onClose,
  onChange,
}) => {
  const { data, isLoading } = usePatient.document.list();
  const t = useTranslation('app');
  const PatientOptionRenderer = getPatientOptionRenderer();

  return (
    <ListSearch
      loading={isLoading}
      open={open}
      options={data?.nodes ?? []}
      onClose={onClose}
      title={t('patients')}
      renderOption={PatientOptionRenderer}
      getOptionLabel={(option: PatientRowFragment) => option.name}
      filterOptions={filterByNameAndCode}
      onChange={(_, name: PatientRowFragment | PatientRowFragment[] | null) => {
        if (name && !(name instanceof Array)) onChange(name);
      }}
    />
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

import React, { FC } from 'react';
import {
  createQueryParamsStore,
  ListSearch,
  QueryParamsProvider,
  useTranslation,
} from '@openmsupply-client/common';
import { useProgramEnrolment, ProgramRowFragmentWithId } from '../api';
import { filterByType, ProgramSearchProps } from '../utils';
import { getProgramOptionRenderer } from './ProgramOptionRenderer';
import { usePatient } from '../../api';

const ProgramSearchComponent: FC<ProgramSearchProps> = ({
  open,
  onClose,
  onChange,
}) => {
  const { data, isLoading } = useProgramEnrolment.document.listAll();
  const patientId = usePatient.utils.id();
  const t = useTranslation('app');
  const ProgramOptionRenderer = getProgramOptionRenderer();

  return (
    <ListSearch<ProgramRowFragmentWithId>
      loading={isLoading}
      open={open}
      options={data?.nodes ?? []}
      onClose={onClose}
      title={t('programs')}
      renderOption={ProgramOptionRenderer}
      getOptionLabel={(option: ProgramRowFragmentWithId) => option.name}
      filterOptions={filterByType}
      onChange={(
        _,
        name: ProgramRowFragmentWithId | ProgramRowFragmentWithId[] | null
      ) => {
        if (name && !(name instanceof Array)) onChange(name);
      }}
      getOptionDisabled={option => option.patientId === patientId}
    />
  );
};

export const ProgramSearchModal: FC<ProgramSearchProps> = props => (
  <QueryParamsProvider
    createStore={() =>
      createQueryParamsStore<ProgramRowFragmentWithId>({
        initialSortBy: { key: 'name' },
      })
    }
  >
    <ProgramSearchComponent {...props} />
  </QueryParamsProvider>
);

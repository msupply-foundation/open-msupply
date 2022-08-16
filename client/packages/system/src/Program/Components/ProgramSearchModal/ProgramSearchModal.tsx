import React, { FC } from 'react';
import {
  createQueryParamsStore,
  ListSearch,
  QueryParamsProvider,
  useTranslation,
} from '@openmsupply-client/common';
import { useProgram, ProgramDocumentFragment } from '../../api';
import { filterByType, ProgramSearchProps } from '../../utils';
import { getProgramOptionRenderer } from './ProgramOptionRenderer';
// import { usePatient } from '@openmsupply-client/system/src/Patient/api';

const ProgramSearchComponent: FC<ProgramSearchProps> = ({
  open,
  onClose,
  onChange,
}) => {
  const { data, isLoading } = useProgram.document.list();
  // const patientId = usePatient.utils.id();
  const t = useTranslation('app');
  const ProgramOptionRenderer = getProgramOptionRenderer();

  return (
    <ListSearch<ProgramDocumentFragment>
      loading={isLoading}
      open={open}
      options={data?.nodes ?? []}
      onClose={onClose}
      title={t('programs')}
      renderOption={ProgramOptionRenderer}
      getOptionLabel={(option: ProgramDocumentFragment) => option.name ?? ''}
      filterOptions={filterByType}
      onChange={(
        _,
        name: ProgramDocumentFragment | ProgramDocumentFragment[] | null
      ) => {
        if (name && !(name instanceof Array)) onChange(name);
      }}
      // getOptionDisabled={option => option.patientId === patientId}
    />
  );
};

export const ProgramSearchModal: FC<ProgramSearchProps> = props => (
  <QueryParamsProvider
    createStore={() =>
      createQueryParamsStore<ProgramDocumentFragment>({
        initialSortBy: { key: 'documentType' },
      })
    }
  >
    <ProgramSearchComponent {...props} />
  </QueryParamsProvider>
);

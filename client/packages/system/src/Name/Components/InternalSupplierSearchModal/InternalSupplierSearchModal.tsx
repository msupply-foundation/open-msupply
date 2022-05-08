import React, { FC } from 'react';
import {
  createQueryParamsStore,
  ListSearch,
  QueryParamsProvider,
  useTranslation,
} from '@openmsupply-client/common';
import { useInternalSuppliers, NameRowFragment } from '../../api';
import { filterByNameAndCode, NameSearchProps } from '../../utils';
import { getNameOptionRenderer } from '../NameOptionRenderer';

const InternalSupplierSearchComponent: FC<NameSearchProps> = ({
  open,
  onClose,
  onChange,
}) => {
  const { data, isLoading } = useInternalSuppliers();
  const t = useTranslation('app');
  const NameOptionRenderer = getNameOptionRenderer(t('label.on-hold'));

  return (
    <ListSearch
      loading={isLoading}
      open={open}
      options={data?.nodes ?? []}
      onClose={onClose}
      title={t('suppliers')}
      renderOption={NameOptionRenderer}
      filterOptions={filterByNameAndCode}
      getOptionLabel={(option: NameRowFragment) => option.name}
      onChange={(_, name: NameRowFragment | NameRowFragment[] | null) => {
        if (name && !(name instanceof Array)) onChange(name);
      }}
      getOptionDisabled={option => option.isOnHold}
    />
  );
};

export const InternalSupplierSearchModal: FC<NameSearchProps> = props => (
  <QueryParamsProvider
    createStore={() =>
      createQueryParamsStore<NameRowFragment>({
        initialSortBy: { key: 'name' },
      })
    }
  >
    <InternalSupplierSearchComponent {...props} />
  </QueryParamsProvider>
);

import React from 'react';
import {
  createQueryParamsStore,
  ListSearch,
  QueryParamsProvider,
  useTranslation,
} from '@openmsupply-client/common';
import { useName, NameRowFragment } from '../../api';
import { filterByNameAndCode, NameSearchModalProps } from '../../utils';
import { getNameOptionRenderer } from '../NameOptionRenderer';

interface SupplierSearchProps extends NameSearchModalProps {
  external?: boolean;
}

const SupplierSearchComponent = ({
  open,
  onClose,
  onChange,
  external,
}: SupplierSearchProps) => {
  const t = useTranslation();
  const { data, isLoading } = useName.document.suppliers(external);
  const NameOptionRenderer = getNameOptionRenderer(t('label.on-hold'));

  return (
    <ListSearch
      loading={isLoading}
      open={open}
      options={data?.nodes ?? []}
      onClose={onClose}
      title={t('suppliers')}
      renderOption={NameOptionRenderer}
      getOptionLabel={(option: NameRowFragment) => option.name}
      filterOptions={filterByNameAndCode}
      onChange={(_, name: NameRowFragment | NameRowFragment[] | null) => {
        if (name && !(name instanceof Array)) onChange(name);
      }}
      getOptionDisabled={option => option.isOnHold}
    />
  );
};

export const SupplierSearchModal = (props: SupplierSearchProps) => (
  <QueryParamsProvider
    createStore={createQueryParamsStore<NameRowFragment>({
      initialSortBy: { key: 'name' },
    })}
  >
    <SupplierSearchComponent {...props} />
  </QueryParamsProvider>
);

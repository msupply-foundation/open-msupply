import React, { FC } from 'react';
import {
  createQueryParamsStore,
  ListSearch,
  QueryParamsProvider,
  useTranslation,
} from '@openmsupply-client/common';
import { useName, NameRowFragment } from '../../api';
import { filterByNameAndCode, NameSearchProps } from '../../utils';
import { getNameOptionRenderer } from '../NameOptionRenderer';

const SupplierSearchComponent: FC<NameSearchProps> = ({
  open,
  onClose,
  onChange,
}) => {
  const { data, isLoading } = useName.document.suppliers();
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
      getOptionLabel={(option: NameRowFragment) => option.name}
      filterOptions={filterByNameAndCode}
      onChange={(_, name: NameRowFragment | NameRowFragment[] | null) => {
        if (name && !(name instanceof Array)) onChange(name);
      }}
      getOptionDisabled={option => option.isOnHold}
    />
  );
};

export const SupplierSearchModal: FC<NameSearchProps> = props => (
  <QueryParamsProvider
    value={createQueryParamsStore<NameRowFragment>({
      initialSortBy: { key: 'name' },
    })}
  >
    <SupplierSearchComponent {...props} />
  </QueryParamsProvider>
);

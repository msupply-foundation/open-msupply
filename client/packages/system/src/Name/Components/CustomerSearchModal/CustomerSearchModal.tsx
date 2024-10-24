import React, { FC } from 'react';
import {
  createQueryParamsStore,
  ListSearch,
  QueryParamsProvider,
  useTranslation,
} from '@openmsupply-client/common';
import { useName, NameRowFragment } from '../../api';
import { filterByNameAndCode, NameSearchModalProps } from '../../utils';
import { getNameOptionRenderer } from '../NameOptionRenderer';

const CustomerSearchComponent: FC<NameSearchModalProps> = ({
  open,
  onClose,
  onChange,
}) => {
  const { data, isLoading } = useName.document.customers();
  const t = useTranslation();
  const NameOptionRenderer = getNameOptionRenderer(t('label.on-hold'));

  return (
    <ListSearch
      loading={isLoading}
      open={open}
      options={data?.nodes ?? []}
      onClose={onClose}
      title={t('customers')}
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

export const CustomerSearchModal: FC<NameSearchModalProps> = props => (
  <QueryParamsProvider
    createStore={createQueryParamsStore<NameRowFragment>({
      initialSortBy: { key: 'name' },
    })}
  >
    <CustomerSearchComponent {...props} />
  </QueryParamsProvider>
);

import React, { FC } from 'react';
import {
  AutocompleteList,
  AutocompleteListProps,
  createQueryParamsStore,
  ListSearch,
  QueryParamsProvider,
  useTranslation,
} from '@openmsupply-client/common';
import { useName, NameRowFragment } from '../../api';
import { filterByNameAndCode, NameSearchProps } from '../../utils';
import { getNameOptionRenderer } from '../NameOptionRenderer';

const InternalSupplierSearchComponent: FC<NameSearchProps> = props => {
  const { data, isLoading } = useName.document.internalSuppliers();
  const t = useTranslation('app');
  const NameOptionRenderer = getNameOptionRenderer(t('label.on-hold'));

  const listProps: AutocompleteListProps<NameRowFragment> = {
    loading: isLoading,
    filterOptions: filterByNameAndCode,
    getOptionLabel: option => option.name,
    renderOption: NameOptionRenderer,
    onChange: (_, name) => {
      if (name && !(name instanceof Array)) props.onChange(name);
    },
    options: data?.nodes ?? [],
    getOptionDisabled: option => option.isOnHold,
  };

  if ('isList' in props) return <AutocompleteList {...listProps} />;

  const { open, onClose } = props;
  return (
    <ListSearch
      open={open}
      onClose={onClose}
      title={t('suppliers')}
      {...listProps}
    />
  );
};

export const InternalSupplierSearchModal: FC<NameSearchProps> = props => (
  <QueryParamsProvider
    createStore={createQueryParamsStore<NameRowFragment>({
      initialSortBy: { key: 'name' },
    })}
  >
    <InternalSupplierSearchComponent {...props} />
  </QueryParamsProvider>
);

import React, { FC } from 'react';
import { ListSearch, useTranslation } from '@openmsupply-client/common';
import { useSuppliers, NameRowFragment } from '../../api';
import { filterByNameAndCode, NameSearchProps } from '../../utils';
import { getNameOptionRenderer } from '../NameOptionRenderer';

export const SupplierSearchModal: FC<NameSearchProps> = ({
  open,
  onClose,
  onChange,
}) => {
  const { data, isLoading } = useSuppliers();
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

import React, { FC } from 'react';
import { ListSearch, useTranslation } from '@openmsupply-client/common';
import { useInternalSuppliers, NameRowFragment } from '../../api';
import { filterByNameAndCode, NameSearchProps } from '../../utils';
import { getNameOptionRenderer } from '../NameOptionRenderer';

export const InternalSupplierSearchModal: FC<NameSearchProps> = ({
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

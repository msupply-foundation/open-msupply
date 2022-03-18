import React, { FC } from 'react';
import { ListSearch, useTranslation } from '@openmsupply-client/common';
import { useCustomers, NameRowFragment } from '../../api';
import { NameSearchProps } from '../../utils';

export const CustomerSearchModal: FC<NameSearchProps> = ({
  open,
  onClose,
  onChange,
}) => {
  const { data, isLoading } = useCustomers();
  const t = useTranslation('app');

  return (
    <ListSearch
      loading={isLoading}
      open={open}
      options={data?.nodes ?? []}
      onClose={onClose}
      title={t('customers')}
      optionKey="name"
      onChange={(_, name: NameRowFragment | NameRowFragment[] | null) => {
        if (name && !(name instanceof Array)) onChange(name);
      }}
    />
  );
};

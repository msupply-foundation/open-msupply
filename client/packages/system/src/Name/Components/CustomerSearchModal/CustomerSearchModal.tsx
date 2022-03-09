import React, { FC } from 'react';
import { ListSearch, useTranslation } from '@openmsupply-client/common';
import { useCustomers, NameRowFragment } from '../../api';

interface NameSearchProps {
  open: boolean;
  onClose: () => void;
  onChange: (name: NameRowFragment) => void;
}

export const CustomerSearchModal: FC<NameSearchProps> = ({
  open,
  onClose,
  onChange,
}) => {
  const { data, isLoading } = useCustomers();
  const t = useTranslation(['app', 'common']);

  return (
    <ListSearch
      loading={isLoading}
      open={open}
      options={data?.nodes ?? []}
      onClose={onClose}
      title={t('suppliers')}
      optionKey="name"
      onChange={(_, name: NameRowFragment | null) => {
        if (name) onChange(name);
      }}
    />
  );
};

import React, { FC } from 'react';
import { Name, useTranslation } from '@openmsupply-client/common';
import { ListSearch } from '@common/components';
import { useNames } from '../../hooks';

interface NameSearchProps {
  open: boolean;
  onClose: () => void;
  onChange: (name: Name) => void;

  type: 'customer' | 'supplier';
}

// TODO: Would be better to disable this query until the button to open the modal
// has been hovered, so we could still pre-fetch the data but not fetch if the user
// is looking at existing invoices.
export const NameSearchModal: FC<NameSearchProps> = ({
  open,
  onClose,
  onChange,
  type,
}) => {
  // TODO: Need to also handle manufacturers and potentially filter out
  // patients when querying for customers. Also might need to handle
  // special names.
  const isCustomerLookup = type === 'customer';
  const filter = isCustomerLookup ? { isCustomer: true } : { isSupplier: true };
  const { data, isLoading } = useNames(filter);
  const t = useTranslation(['app', 'common']);
  return (
    <ListSearch
      loading={isLoading}
      open={open}
      options={data?.nodes ?? []}
      onClose={onClose}
      title={
        isCustomerLookup
          ? t('label.customer', { ns: 'common' })
          : t('suppliers')
      }
      optionKey="name"
      onChange={(_, name: Name | null) => {
        if (name) onChange(name);
      }}
    />
  );
};

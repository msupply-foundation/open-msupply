import React, { FC } from 'react';
import { Name } from '@openmsupply-client/common';
import { ListSearch } from '@openmsupply-client/common/src/ui/components/modals/ListSearch';
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

  return (
    <ListSearch
      loading={isLoading}
      open={open}
      options={data?.nodes ?? []}
      onClose={onClose}
      title={isCustomerLookup ? 'label.customer' : 'app.suppliers'}
      optionKey="name"
      onChange={(_, name: Name | null) => {
        if (name) onChange(name);
      }}
    />
  );
};

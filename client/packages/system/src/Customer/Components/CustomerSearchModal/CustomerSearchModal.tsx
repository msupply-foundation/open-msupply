import React, { FC } from 'react';
import { ListSearch, Name } from '@openmsupply-client/common';
import { useCustomers } from '../../hooks';

interface CustomerSearchProps {
  open: boolean;
  onClose: () => void;
  onChange: (name: Name) => void;
}

// TODO: Would be better to disable this query until the button to open the modal
// has been hovered, so we could still pre-fetch the data but not fetch if the user
// is looking at existing invoices.
export const CustomerSearchModal: FC<CustomerSearchProps> = ({
  open,
  onClose,
  onChange,
}) => {
  const { data, isLoading } = useCustomers();

  return (
    <ListSearch
      loading={isLoading}
      open={open}
      options={data?.nodes ?? []}
      onClose={onClose}
      title="label.customer"
      optionKey="name"
      onChange={(_, name: Name | null) => {
        if (name) onChange(name);
      }}
    />
  );
};

import React, { FC } from 'react';
import { ListSearch, Name, useQuery } from '@openmsupply-client/common';
import { nameListQueryFn } from '../../api';

interface CustomerSearchProps {
  open: boolean;
  onClose: () => void;
  onChange: (name: Name) => void;
}

// TODO: Would be better to disable this query until the button to open the modal
// has been hovered, so we could still pre-fetch the data but not fetch if the user
// is looking at existing invoices.
export const CustomerSearch: FC<CustomerSearchProps> = ({
  open,
  onClose,
  onChange,
}) => {
  const { data, isLoading } = useQuery(['names', 'list'], () =>
    nameListQueryFn()
  );

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

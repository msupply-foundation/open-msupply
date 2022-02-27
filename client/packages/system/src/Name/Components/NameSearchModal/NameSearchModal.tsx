import React, { FC, useMemo } from 'react';
import { ListSearch, Name, useTranslation } from '@openmsupply-client/common';
import { useNamesSearch } from '../../api';

interface NameSearchProps {
  open: boolean;
  onClose: () => void;
  onChange: (name: Name) => void;
  onlyShowStores?: boolean;
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
  onlyShowStores = false,
}) => {
  // TODO: Need to also handle manufacturers and potentially filter out
  // patients when querying for customers. Also might need to handle
  // special names.
  const isCustomerLookup = type === 'customer';
  const filter = isCustomerLookup ? { isCustomer: true } : { isSupplier: true };
  const { data, isLoading } = useNamesSearch(filter);
  const t = useTranslation(['app', 'common']);

  const filteredData = useMemo(() => {
    if (onlyShowStores) return data?.nodes.filter(({ store }) => !!store) ?? [];
    else return data?.nodes ?? [];
  }, [data, onlyShowStores]);

  return (
    <ListSearch
      loading={isLoading}
      open={open}
      options={filteredData}
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

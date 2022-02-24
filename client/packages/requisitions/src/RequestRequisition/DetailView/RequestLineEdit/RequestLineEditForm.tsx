import React from 'react';
import { ItemRowFragment, ItemSearchInput } from '@openmsupply-client/system';
import { useRequestRequisitionLines } from '../../api';

interface RequestLineEditFormProps {
  item: ItemRowFragment | null;
  disabled: boolean;
  onChangeItem: (item: ItemRowFragment) => void;
}

export const RequestLineEditForm = ({
  item,
  disabled,
  onChangeItem,
}: RequestLineEditFormProps) => {
  const { lines } = useRequestRequisitionLines();
  return (
    <ItemSearchInput
      disabled={disabled}
      currentItem={item}
      onChange={(newItem: ItemRowFragment | null) =>
        newItem && onChangeItem(newItem)
      }
      extraFilter={item => {
        const itemAlreadyInShipment = lines?.some(({ id }) => id === item.id);
        return !itemAlreadyInShipment;
      }}
    />
  );
};

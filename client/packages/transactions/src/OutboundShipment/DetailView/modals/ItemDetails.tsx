import React from 'react';

import { Item, TextField, useFormContext } from '@openmsupply-client/common';

interface ItemDetailsProps {
  item?: Item;
}

export const ItemDetails: React.FC<ItemDetailsProps> = ({ item }) => {
  const { item: draft, setItem } = useFormContext();

  const handleInputChange: React.ChangeEventHandler<
    HTMLInputElement | HTMLTextAreaElement
  > = e => {
    const { name, value } = e.target;
    setItem({ ...draft, [name]: value } as Item);
  };
  return (
    <form>
      <div>code</div>
      <div>{item?.code}</div>
      <div>name</div>
      <TextField
        label="Item name"
        value={draft.name}
        variant="filled"
        onChange={handleInputChange}
      />
    </form>
  );
};

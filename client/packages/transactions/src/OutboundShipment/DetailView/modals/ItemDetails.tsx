import React from 'react';

import { Item, TextField, UseFormRegister } from '@openmsupply-client/common';

interface ItemDetailsProps {
  handleSubmit: () => void;
  item?: Item;
  register: UseFormRegister<Item>;
}

export const ItemDetails: React.FC<ItemDetailsProps> = ({
  handleSubmit,
  item,
  register,
}) => {
  //   const { item: draft, setItem } = useFormContext();

  //   const handleInputChange: React.ChangeEventHandler<
  //     HTMLInputElement | HTMLTextAreaElement
  //   > = e => {
  //     const { name, value } = e.target;
  //     setItem({ ...draft, [name]: value } as Item);
  //   };
  return (
    <form onSubmit={handleSubmit}>
      <div>code</div>
      <div>{item?.code}</div>
      <div>name</div>
      <TextField
        label="Item name"
        defaultValue={item?.name}
        variant="filled"
        {...register('name')}
      />
    </form>
  );
};

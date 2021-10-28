import React from 'react';
import {
  Autocomplete,
  AutocompleteOnChange,
  FieldValues,
  InvoiceLine,
  Item,
  ModalInputRow,
  ModalLabel,
  ModalRow,
  UseFormRegister,
  styled,
  useTranslation,
} from '@openmsupply-client/common';

interface ItemDetailsFormProps {
  invoiceLine?: InvoiceLine;
  isLoading: boolean;
  items?: Item[];
  onChangeItem?: AutocompleteOnChange<Item>;
  onChangeQuantity: (quantity: number) => void;
  register: UseFormRegister<FieldValues>;
}

const ItemOption = styled('li')(({ theme }) => ({
  color: theme.palette.midGrey,
  backgroundColor: theme.palette.background.toolbar,
}));

const filterOptions = {
  stringify: (item: Item) => `${item.code} ${item.name}`,
  limit: 100,
};

const renderOption = (
  props: React.HTMLAttributes<HTMLLIElement>,
  item: Item
) => (
  <ItemOption {...props} key={item.code}>
    <span style={{ width: 100 }}>{item.code}</span>
    <span style={{ width: 500 }}>{item.name}</span>
    <span>{item.availableQuantity}</span>
  </ItemOption>
);

export const ItemDetailsForm: React.FC<ItemDetailsFormProps> = ({
  invoiceLine,
  isLoading,
  items,
  onChangeItem,
  onChangeQuantity,
  register,
}) => {
  const t = useTranslation();
  const options =
    items
      ?.filter(item => item.isVisible)
      .map(item => ({ label: item.name, ...item })) || [];

  return (
    <>
      <ModalRow>
        <ModalLabel labelKey="label.item" />
        <Autocomplete
          filterOptionConfig={filterOptions}
          loading={isLoading}
          noOptionsText={t('error.no-items')}
          onChange={onChangeItem}
          options={options}
          renderOption={renderOption}
          defaultValue={invoiceLine?.item}
          width={540}
          isOptionEqualToValue={(option, value) => option.id === value.id}
        />
      </ModalRow>
      <ModalInputRow
        inputProps={register('code', { disabled: true })}
        labelKey="label.code"
        defaultValue={invoiceLine?.itemCode}
      />
      <ModalInputRow
        inputProps={register('quantity', {
          required: true,
          min: { value: 1, message: t('error.greater-than-zero-required') },
          pattern: { value: /^[0-9]+$/, message: t('error.number-required') },
          onChange: event => onChangeQuantity(Number(event.target.value)),
        })}
        labelKey="label.pack-quantity"
        defaultValue={invoiceLine?.quantity}
      />
    </>
  );
};

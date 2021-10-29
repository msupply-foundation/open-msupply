import React from 'react';
import {
  Autocomplete,
  AutocompleteOnChange,
  FieldValues,
  Grid,
  InvoiceLine,
  Item,
  ModalInput,
  ModalLabel,
  ModalRow,
  NumericTextInput,
  UseFormRegister,
  styled,
  useTranslation,
  Typography,
} from '@openmsupply-client/common';

interface ItemDetailsFormProps {
  allocatedQuantity: number;
  invoiceLine?: InvoiceLine;
  isLoading: boolean;
  items?: Item[];
  onChangeItem?: AutocompleteOnChange<Item>;
  onChangeQuantity: (quantity: number) => void;
  quantity?: number;
  register: UseFormRegister<FieldValues>;
}

const SimpleText = styled(Typography)({
  fontSize: 12,
  marginLeft: 16,
  alignSelf: 'center',
  display: 'inline-flex',
});

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
  allocatedQuantity,
  invoiceLine,
  isLoading,
  items,
  onChangeItem,
  onChangeQuantity,
  quantity,
  register,
}) => {
  const t = useTranslation();
  const options =
    items
      ?.filter(item => item.isVisible)
      .map(item => ({ label: item.name, ...item })) || [];

  const quantityDescription = quantity ? (
    <SimpleText
      sx={{
        color: allocatedQuantity < (quantity || 0) ? 'error.main' : undefined,
      }}
    >{`${allocatedQuantity} ${t('label.allocated')}`}</SimpleText>
  ) : undefined;

  return (
    <Grid container gap={0.5}>
      <ModalRow>
        <ModalLabel labelKey="label.item" />
        <Grid item flex={1}>
          <Autocomplete
            filterOptionConfig={filterOptions}
            loading={isLoading}
            noOptionsText={t('error.no-items')}
            onChange={onChangeItem}
            options={options}
            renderOption={renderOption}
            defaultValue={invoiceLine?.item}
            width="100%"
            isOptionEqualToValue={(option, value) => option.id === value.id}
          />
        </Grid>
      </ModalRow>
      <ModalRow>
        <ModalLabel labelKey="label.available" />
        <NumericTextInput
          defaultValue={invoiceLine?.itemCode}
          inputProps={register('availableQuantity')}
          disabled
        />
        <Grid style={{ display: 'flex' }} justifyContent="flex-end" flex={1}>
          <ModalLabel labelKey="label.code" />
          <ModalInput
            defaultValue={invoiceLine?.itemCode}
            inputProps={register('code', { disabled: true })}
            width={150}
          />
        </Grid>
      </ModalRow>
      <ModalRow>
        <ModalLabel labelKey="label.pack-quantity" />
        <NumericTextInput
          inputProps={register('quantity', {
            required: true,
            min: { value: 1, message: t('error.greater-than-zero-required') },
            pattern: { value: /^[0-9]+$/, message: t('error.number-required') },
            onChange: event => onChangeQuantity(Number(event.target.value)),
          })}
          defaultValue={invoiceLine?.quantity}
        />
        {quantityDescription}
        <Grid style={{ display: 'flex' }} justifyContent="flex-end" flex={1}>
          <ModalLabel labelKey="label.unit" />
          <ModalInput
            inputProps={register('unit', {
              disabled: true,
            })}
            width={150}
          />
        </Grid>
      </ModalRow>
    </Grid>
  );
};

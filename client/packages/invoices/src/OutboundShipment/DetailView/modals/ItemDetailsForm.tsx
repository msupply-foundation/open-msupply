import React, { ChangeEventHandler } from 'react';
import {
  FieldValues,
  Grid,
  InvoiceLine,
  Item,
  ModalInput,
  ModalLabel,
  ModalRow,
  NumericTextInput,
  UseFormRegister,
  Select,
  styled,
  useTranslation,
  Typography,
  InputLabel,
  ModalNumericInput,
} from '@openmsupply-client/common';
import { ItemSearchInput } from '@openmsupply-client/system/src/Item';

interface ItemDetailsFormProps {
  allocatedQuantity: number;
  invoiceLine?: InvoiceLine;
  quantity?: number;
  register: UseFormRegister<FieldValues>;
  selectedItem?: Item;
  packSize: number;
  onChangeItem: (newItem: Item) => void;
  onChangeQuantity: (quantity: number) => void;
  setPackSize: (packSize: number) => void;
}

const SimpleText = styled(Typography)({
  fontSize: 12,
  marginLeft: 16,
  alignSelf: 'center',
  display: 'inline-flex',
});

export const ItemDetailsForm: React.FC<ItemDetailsFormProps> = ({
  allocatedQuantity,
  invoiceLine,
  onChangeItem,
  onChangeQuantity,
  quantity,
  register,
  selectedItem,
  setPackSize,
  packSize,
}) => {
  const t = useTranslation();

  const quantityDescription = quantity ? (
    <SimpleText
      sx={{
        color: allocatedQuantity < (quantity || 0) ? 'error.main' : undefined,
      }}
    >{`${allocatedQuantity} ${t('label.allocated')}`}</SimpleText>
  ) : undefined;

  const packSizes = [1];

  const onChangePackSize: ChangeEventHandler<HTMLInputElement> = event => {
    const newPackSize = Number(event.target.value);
    setPackSize(newPackSize);
  };

  selectedItem?.availableBatches.forEach(batch => {
    if (packSizes.every(pack => pack !== batch.packSize)) {
      packSizes.push(batch.packSize);
    }
  });

  const packSizeOptions = packSizes.sort().map(pack => ({
    label: String(pack),
    value: pack,
  }));

  if (packSizes.indexOf(packSize) === -1) {
    setPackSize(1);
  }

  return (
    <Grid container gap={0.5}>
      <ModalRow>
        <ModalLabel labelKey="label.item" />
        <Grid item flex={1}>
          <ItemSearchInput value={selectedItem} onChange={onChangeItem} />
        </Grid>
      </ModalRow>
      <ModalRow>
        <ModalLabel labelKey="label.available" />
        <NumericTextInput
          defaultValue={invoiceLine?.itemCode}
          inputProps={register('availableQuantity')}
          disabled
          sx={{ width: 85 }}
        />
        <Grid style={{ display: 'flex' }} justifyContent="flex-end" flex={1}>
          <ModalLabel labelKey="label.code" justifyContent="flex-end" />
          <ModalInput
            defaultValue={invoiceLine?.itemCode}
            inputProps={register('code', { disabled: true })}
            width={150}
          />
        </Grid>
      </ModalRow>
      <ModalRow>
        <ModalLabel labelKey="label.pack-quantity" />
        <ModalNumericInput
          inputProps={register('quantity', {
            required: true,
            min: { value: 1, message: t('error.invalid-value') },
            pattern: { value: /^[0-9]+$/, message: t('error.invalid-value') },
            onChange: event => onChangeQuantity(Number(event.target.value)),
          })}
          defaultValue={invoiceLine?.numberOfPacks}
        />
        <Grid
          item
          alignItems="center"
          display="flex"
          sx={{ marginLeft: '20px', marginRight: '20px' }}
        >
          <InputLabel sx={{ fontSize: '12px' }}>
            {t('label.pack-size')}
          </InputLabel>
        </Grid>
        <Select
          inputProps={register('packSize')}
          options={packSizeOptions}
          value={packSize}
          onChange={onChangePackSize}
        />
        {quantityDescription}
        <Grid style={{ display: 'flex' }} justifyContent="flex-end" flex={1}>
          <ModalLabel labelKey="label.unit" justifyContent="flex-end" />
          <ModalInput
            inputProps={register('unitName', {
              disabled: true,
            })}
            width={150}
          />
        </Grid>
      </ModalRow>
    </Grid>
  );
};

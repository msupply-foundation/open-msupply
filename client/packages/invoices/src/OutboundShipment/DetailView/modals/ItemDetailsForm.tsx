import React, { useState } from 'react';
import {
  FieldValues,
  Grid,
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
  FlatButton,
  CheckIcon,
  Radio,
  RadioGroup,
  FormControlLabel,
} from '@openmsupply-client/common';
import { ItemSearchInput } from '@openmsupply-client/system/src/Item';
import { OutboundShipmentSummaryItem } from '../types';
import { PackSizeController } from './ItemDetailsModal';

interface ItemDetailsFormProps {
  allocatedQuantity: number;
  register: UseFormRegister<FieldValues>;
  summaryItem?: OutboundShipmentSummaryItem;
  onChangeItem: (newItem: Item | null) => void;
  onChangeQuantity: (quantity: number, packSize: number | null) => void;
  packSizeController: PackSizeController;
  availableQuantity: number;
}

const SimpleText = styled(Typography)({
  fontSize: 12,
  marginLeft: 16,
  alignSelf: 'center',
  display: 'inline-flex',
});

export const ItemDetailsForm: React.FC<ItemDetailsFormProps> = ({
  allocatedQuantity,
  onChangeItem,
  onChangeQuantity,
  register,
  summaryItem,
  packSizeController,
  availableQuantity,
}) => {
  const t = useTranslation();

  const quantityDescription = allocatedQuantity ? (
    <SimpleText
      sx={{
        color: allocatedQuantity ? 'error.main' : undefined,
      }}
    >{`${allocatedQuantity} ${t('label.allocated')}`}</SimpleText>
  ) : undefined;

  const [quantity, setQuantity] = useState('');
  const [issueType, setIssueType] = useState('packs');

  return (
    <Grid container gap={0.5}>
      <ModalRow>
        <ModalLabel labelKey="label.item" />
        <Grid item flex={1}>
          <ItemSearchInput
            currentItemCode={summaryItem?.itemCode}
            onChange={onChangeItem}
          />
        </Grid>
      </ModalRow>

      <ModalRow>
        <ModalLabel labelKey="label.available" />
        <NumericTextInput
          value={availableQuantity}
          disabled
          style={{ width: 85 }}
        />

        <Grid style={{ display: 'flex' }} justifyContent="flex-end" flex={1}>
          <ModalLabel labelKey="label.code" justifyContent="flex-end" />
          <ModalInput
            defaultValue={summaryItem?.itemCode ?? ''}
            disabled
            width={150}
          />
        </Grid>
        <Grid style={{ display: 'flex' }} justifyContent="flex-end" flex={1}>
          <ModalLabel labelKey="label.unit" justifyContent="flex-end" />
          <ModalInput
            disabled
            width={150}
            defaultValue={summaryItem?.itemUnit ?? ''}
          />
        </Grid>
      </ModalRow>

      <ModalRow>
        <Grid
          sx={{
            marginTop: '20px',
            flex: 1,
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'space-between',
          }}
          container
        >
          <ModalLabel labelKey="label.pack-quantity" />
          <ModalNumericInput
            value={Number(quantity)}
            inputProps={register('quantity', {
              required: true,
              min: { value: 1, message: t('error.invalid-value') },
              pattern: {
                value: /^[0-9]+$/,
                message: t('error.invalid-value'),
              },
              onChange: event => {
                setQuantity(event.target.value);
              },
            })}
            defaultValue={0}
          />

          <Grid item alignItems="center" display="flex">
            <InputLabel sx={{ fontSize: '12px' }}>
              {t('label.pack-size')}
            </InputLabel>
          </Grid>
          <Select
            disabled={issueType === 'units'}
            sx={{ width: 110 }}
            inputProps={register('packSize')}
            options={packSizeController.options}
            value={packSizeController.selected.value}
            onChange={e =>
              packSizeController.setPackSize(Number(e.target.value))
            }
          />
          <RadioGroup
            value={issueType}
            onChange={() => {
              setIssueType(state => (state === 'packs' ? 'units' : 'packs'));
            }}
          >
            <FormControlLabel
              control={<Radio size="small" />}
              label="Packs"
              value="packs"
            />
            <FormControlLabel
              control={<Radio size="small" />}
              label="Units"
              value="units"
            />
          </RadioGroup>

          {quantityDescription}
          <FlatButton
            color="secondary"
            icon={<CheckIcon />}
            labelKey="label.issue"
            onClick={() => {
              onChangeQuantity(
                Number(quantity),
                issueType === 'packs' ? packSizeController.selected.value : null
              );
              setQuantity('');
            }}
          />
        </Grid>
      </ModalRow>
    </Grid>
  );
};

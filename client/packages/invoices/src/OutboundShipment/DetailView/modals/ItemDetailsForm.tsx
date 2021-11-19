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
  useTranslation,
  InputLabel,
  ModalNumericInput,
  FlatButton,
  CheckIcon,
  FormControlLabel,
  Switch,
  Divider,
  Box,
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

export const ItemDetailsForm: React.FC<ItemDetailsFormProps> = ({
  allocatedQuantity,
  onChangeItem,
  onChangeQuantity,
  register,
  summaryItem,
  packSizeController,
  availableQuantity,
}) => {
  const t = useTranslation(['common', 'outbound-shipment']);

  const [quantity, setQuantity] = useState('');
  const [issueType, setIssueType] = useState('packs');

  return (
    <Grid container gap={0.5} height={200}>
      <ModalRow>
        <ModalLabel label={t('label.item')} />
        <Grid item flex={1}>
          <ItemSearchInput
            currentItemName={summaryItem?.itemName}
            onChange={onChangeItem}
          />
        </Grid>
      </ModalRow>

      <ModalRow>
        <ModalLabel label={t('label.available')} />
        <NumericTextInput
          value={availableQuantity}
          disabled
          style={{ width: 85 }}
        />

        <Grid style={{ display: 'flex' }} justifyContent="flex-end" flex={1}>
          <ModalLabel label={t('label.unit')} justifyContent="flex-end" />
          <ModalInput
            disabled
            width={150}
            value={summaryItem?.itemUnit ?? ''}
          />
        </Grid>
      </ModalRow>

      <ModalRow>
        <ModalLabel label={t('label.allocated')} />
        <NumericTextInput
          value={allocatedQuantity}
          disabled
          style={{ width: 85 }}
        />
        <Grid style={{ display: 'flex' }} justifyContent="flex-end" flex={1}>
          <ModalLabel label={t('label.code')} justifyContent="flex-end" />
          <ModalInput
            value={summaryItem?.itemCode ?? ''}
            disabled
            width={150}
          />
        </Grid>
      </ModalRow>

      {summaryItem ? (
        <>
          <Divider margin={10} />

          <Box display="flex" flex={1} flexDirection="column">
            <ModalRow>
              <FormControlLabel
                onChange={(_, checked) =>
                  setIssueType(checked ? 'packs' : 'units')
                }
                control={
                  <Switch defaultChecked color="secondary" size="small" />
                }
                label={<Box fontSize={10}>{t('label.allocate-to-packs')}</Box>}
                value="packs"
              />
            </ModalRow>

            <Grid container>
              <ModalLabel label={t('label.allocate')} />
              <ModalNumericInput
                value={Number(quantity)}
                inputProps={register('quantity', {
                  min: { value: 1, message: t('error.invalid-value') },
                  pattern: {
                    value: /^[0-9]+$/,
                    message: t('error.invalid-value'),
                  },
                  onChange: event => {
                    setQuantity(event.target.value);
                  },
                })}
              />

              <Box marginLeft={1} />

              <Grid item alignItems="center" display="flex">
                <InputLabel sx={{ fontSize: '12px' }}>
                  {issueType === 'packs'
                    ? t('label.packs-to-batches-with')
                    : t('label.units')}
                </InputLabel>
              </Grid>

              <Box marginLeft={1} />

              {issueType === 'packs' && packSizeController.selected.value && (
                <Select
                  sx={{ width: 110 }}
                  inputProps={register('packSize')}
                  options={packSizeController.options}
                  value={packSizeController.selected.value}
                  onChange={e =>
                    packSizeController.setPackSize(Number(e.target.value))
                  }
                />
              )}

              <Box marginLeft="auto" />

              <FlatButton
                disabled={Number(quantity) <= 0}
                color="secondary"
                icon={<CheckIcon />}
                label={t('label.allocate')}
                onClick={() => {
                  onChangeQuantity(
                    Number(quantity),
                    issueType === 'packs'
                      ? Number(packSizeController.selected.value)
                      : null
                  );
                  setQuantity('');
                }}
              />
            </Grid>
          </Box>
        </>
      ) : (
        <Box height={100} />
      )}
    </Grid>
  );
};

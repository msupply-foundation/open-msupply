import React, { useState } from 'react';
import {
  FieldValues,
  Grid,
  Item,
  ModalInput,
  ModalLabel,
  ModalRow,
  UseFormRegister,
  Select,
  useTranslation,
  InputLabel,
  ModalNumericInput,
  Divider,
  Box,
  Typography,
} from '@openmsupply-client/common';
import { ItemSearchInput } from '@openmsupply-client/system/src/Item';
import { OutboundShipment, OutboundShipmentSummaryItem } from '../../../types';
import { PackSizeController } from './ItemDetailsModal';

interface ItemDetailsFormProps {
  allocatedQuantity: number;
  register: UseFormRegister<FieldValues>;
  summaryItem?: OutboundShipmentSummaryItem;
  onChangeItem: (newItem: Item | null) => void;
  onChangeQuantity: (quantity: number, packSize: number | null) => void;
  packSizeController: PackSizeController;
  availableQuantity: number;
  draft: OutboundShipment;
}

export const ItemDetailsForm: React.FC<ItemDetailsFormProps> = ({
  allocatedQuantity,
  onChangeItem,
  onChangeQuantity,
  register,
  summaryItem,
  packSizeController,
  availableQuantity,
  draft,
}) => {
  const t = useTranslation(['distribution', 'common']);
  const [issueType, setIssueType] = useState('packs');
  const quantity =
    issueType === 'packs'
      ? allocatedQuantity / Number(packSizeController.selected.value)
      : allocatedQuantity;

  return (
    <Grid container gap="4px">
      <ModalRow>
        <ModalLabel label={t('label.item')} />
        <Grid item flex={1}>
          <ItemSearchInput
            currentItem={{
              name: summaryItem?.itemName ?? '',
              id: summaryItem?.itemId ?? '',
              code: summaryItem?.itemCode ?? '',
              isVisible: true,
              availableBatches: [],
              availableQuantity: 0,
              unitName: '',
            }}
            onChange={onChangeItem}
            extraFilter={item => {
              const itemAlreadyInShipment = draft.items.some(
                ({ id, isDeleted }) => id === item.id && !isDeleted
              );
              return !itemAlreadyInShipment;
            }}
          />
        </Grid>
      </ModalRow>

      <ModalRow>
        <ModalLabel label="" />
        <Grid item display="flex">
          <Typography
            sx={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
            }}
          >
            {t('label.available-quantity', { number: availableQuantity })}
          </Typography>
        </Grid>

        <Grid style={{ display: 'flex' }} justifyContent="flex-end" flex={1}>
          <ModalLabel label={t('label.unit')} justifyContent="flex-end" />
          <ModalInput
            disabled
            width={150}
            value={summaryItem?.itemUnit ?? ''}
          />
        </Grid>
      </ModalRow>

      {summaryItem ? (
        <>
          <Divider margin={10} />

          <Grid container>
            <ModalLabel label={t('label.issue')} />
            <ModalNumericInput
              value={quantity}
              inputProps={register('quantity', {
                min: { value: 1, message: t('error.invalid-value') },
                pattern: {
                  value: /^[0-9]+$/,
                  message: t('error.invalid-value'),
                },
                onChange: event => {
                  onChangeQuantity(
                    Number(event.target.value),
                    issueType === 'packs'
                      ? Number(packSizeController.selected.value)
                      : null
                  );
                },
              })}
            />

            <Box marginLeft={1} />

            <Grid
              item
              alignItems="center"
              display="flex"
              justifyContent="flex-start"
              style={{ minWidth: 125 }}
            >
              <InputLabel sx={{ fontSize: '12px' }}>
                {issueType === 'packs'
                  ? t('label.packs-of')
                  : t('label.units-in-pack-size-of')}
              </InputLabel>
            </Grid>

            <Box marginLeft={1} />

            <Select
              sx={{ width: 110 }}
              inputProps={register('packSize')}
              options={packSizeController.options}
              value={packSizeController.selected.value}
              onChange={e => {
                const { value } = e.target;
                const packSize = Number(value);
                const issueType = packSize === 0 ? 'units' : 'packs';

                setIssueType(issueType);
                packSizeController.setPackSize(packSize);
              }}
            />

            <Box marginLeft="auto" />
          </Grid>
        </>
      ) : (
        <Box height={100} />
      )}
    </Grid>
  );
};

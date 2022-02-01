import React from 'react';
import {
  Grid,
  Item,
  BasicTextInput,
  ModalLabel,
  ModalRow,
  Select,
  useTranslation,
  InputLabel,
  NumericTextInput,
  Divider,
  Box,
  Typography,
} from '@openmsupply-client/common';
import { ItemSearchInput } from '@openmsupply-client/system';
import { PackSizeController } from './hooks';
import { useOutboundRows } from '../../api';

interface OutboundLineEditFormProps {
  allocatedQuantity: number;
  availableQuantity: number;
  item: Item | null;
  onChangeItem: (newItem: Item | null) => void;
  onChangeQuantity: (quantity: number, packSize: number | null) => void;
  packSizeController: PackSizeController;
}

export const OutboundLineEditForm: React.FC<OutboundLineEditFormProps> = ({
  allocatedQuantity,
  onChangeItem,
  onChangeQuantity,
  item,
  packSizeController,
  availableQuantity,
}) => {
  const t = useTranslation(['distribution', 'common']);
  const quantity =
    allocatedQuantity /
    Math.abs(Number(packSizeController.selected.value || 1));
  const { items } = useOutboundRows();

  return (
    <Grid container gap="4px">
      <ModalRow>
        <ModalLabel label={t('label.item')} />
        <Grid item flex={1}>
          <ItemSearchInput
            currentItem={item}
            onChange={onChangeItem}
            extraFilter={item => !!items?.some(({ id }) => id === item.id)}
          />
        </Grid>
      </ModalRow>
      {item && (
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
            <BasicTextInput
              disabled
              sx={{ width: 150 }}
              value={item?.unitName ?? ''}
            />
          </Grid>
        </ModalRow>
      )}
      {item ? (
        <>
          <Divider margin={10} />

          <Grid container>
            <ModalLabel label={t('label.issue')} />
            <NumericTextInput
              value={quantity}
              onChange={event => {
                onChangeQuantity(
                  Number(event.target.value),
                  packSizeController.selected.value === -1
                    ? null
                    : Number(packSizeController.selected.value)
                );
              }}
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
                {packSizeController.selected.value === -1
                  ? t('label.packs-of')
                  : t('label.units-in-pack-size-of')}
              </InputLabel>
            </Grid>

            <Box marginLeft={1} />

            {packSizeController.options.length && (
              <Select
                sx={{ width: 110 }}
                options={packSizeController.options}
                value={packSizeController.selected.value}
                onChange={e => {
                  const { value } = e.target;
                  const packSize = Number(value);
                  packSizeController.setPackSize(packSize);
                  onChangeQuantity(quantity, packSize === -1 ? null : packSize);
                }}
              />
            )}

            <Box marginLeft="auto" />
          </Grid>
        </>
      ) : (
        <Box height={100} />
      )}
    </Grid>
  );
};

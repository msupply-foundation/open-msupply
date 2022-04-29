import React from 'react';
import {
  Grid,
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
import {
  StockItemSearchInput,
  ItemRowFragment,
} from '@openmsupply-client/system';
import { PackSizeController } from './hooks';
import { useOutbound } from '../../api';

interface OutboundLineEditFormProps {
  allocatedQuantity: number;
  availableQuantity: number;
  item: ItemRowFragment | null;
  onChangeItem: (newItem: ItemRowFragment | null) => void;
  onChangeQuantity: (quantity: number, packSize: number | null) => void;
  packSizeController: PackSizeController;
  disabled: boolean;
  canAutoAllocate: boolean;
}

export const OutboundLineEditForm: React.FC<OutboundLineEditFormProps> = ({
  allocatedQuantity,
  onChangeItem,
  onChangeQuantity,
  item,
  packSizeController,
  availableQuantity,
  disabled,
  canAutoAllocate,
}) => {
  const t = useTranslation(['distribution', 'common']);
  const quantity =
    allocatedQuantity /
    Math.abs(Number(packSizeController.selected?.value || 1));
  const { items } = useOutbound.line.rows();

  const onChangePackSize = (newPackSize: number) => {
    const newAllocatedQuantity =
      newPackSize === 0 ? 0 : Math.round(allocatedQuantity / newPackSize);
    packSizeController.setPackSize(newPackSize);
    onChangeQuantity(
      newAllocatedQuantity,
      newPackSize === -1 ? null : newPackSize
    );
  };

  return (
    <Grid container gap="4px">
      <ModalRow>
        <ModalLabel label={t('label.item')} />
        <Grid item flex={1}>
          <StockItemSearchInput
            autoFocus={!item}
            disabled={disabled}
            currentItemId={item?.id}
            onChange={onChangeItem}
            extraFilter={
              disabled
                ? undefined
                : item => !items?.some(({ id }) => id === item.id)
            }
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
      {item && canAutoAllocate ? (
        <>
          <Divider margin={10} />

          <Grid container>
            <ModalLabel label={t('label.issue')} />
            <NumericTextInput
              value={quantity}
              onChange={event => {
                onChangeQuantity(
                  Math.round(Number(event.target.value)),
                  packSizeController.selected?.value === -1
                    ? null
                    : Number(packSizeController.selected?.value)
                );
              }}
            />

            <Box marginLeft={1} />

            {packSizeController.options.length ? (
              <>
                <Grid
                  item
                  alignItems="center"
                  display="flex"
                  justifyContent="flex-start"
                  style={{ minWidth: 125 }}
                >
                  <InputLabel sx={{ fontSize: '12px' }}>
                    {packSizeController.selected?.value === -1
                      ? t('label.units-in-pack-size-of', { count: quantity })
                      : t('label.packs-of', { count: quantity })}
                  </InputLabel>
                </Grid>

                <Box marginLeft={1} />

                <Select
                  sx={{ width: 110 }}
                  options={packSizeController.options}
                  value={packSizeController.selected?.value ?? ''}
                  onChange={e => {
                    const { value } = e.target;
                    onChangePackSize(Number(value));
                  }}
                />
                {packSizeController.selected?.value !== -1 && (
                  <Grid
                    item
                    alignItems="center"
                    display="flex"
                    justifyContent="flex-start"
                  >
                    <InputLabel style={{ fontSize: 12, marginLeft: 8 }}>
                      {t('label.units', {
                        count: packSizeController.selected?.value,
                      })}
                    </InputLabel>
                  </Grid>
                )}
                <Box marginLeft="auto" />
              </>
            ) : null}
          </Grid>
        </>
      ) : (
        <Box height={100} />
      )}
    </Grid>
  );
};

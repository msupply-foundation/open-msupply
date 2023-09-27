import React, { useEffect, useState } from 'react';
import {
  Grid,
  BasicTextInput,
  ModalLabel,
  ModalRow,
  Select,
  useTranslation,
  InputLabel,
  NonNegativeIntegerInput,
  Divider,
  Box,
  Typography,
  InfoPanel,
  useFormatNumber,
  useDebounceCallback,
} from '@openmsupply-client/common';
import {
  StockItemSearchInput,
  ItemRowFragment,
} from '@openmsupply-client/system';
import { useOutbound } from '../../api';
import { DraftItem } from '../../..';
import { PackSizeController } from '../../../StockOut';
import { DraftStockOutLine } from '../../../types';
import { isA } from '../../../utils';

interface OutboundLineEditFormProps {
  allocatedQuantity: number;
  availableQuantity: number;
  item: DraftItem | null;
  onChangeItem: (newItem: ItemRowFragment | null) => void;
  onChangeQuantity: (
    quantity: number,
    packSize: number | null,
    isAutoAllocated: boolean
  ) => DraftStockOutLine[] | undefined;
  packSizeController: PackSizeController;
  disabled: boolean;
  canAutoAllocate: boolean;
  isAutoAllocated: boolean;
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
  isAutoAllocated,
}) => {
  const t = useTranslation('distribution');
  const [allocationWarning, setAllocationWarning] = useState<
    string | undefined
  >();
  const { format } = useFormatNumber();
  const quantity =
    allocatedQuantity /
    Math.abs(Number(packSizeController.selected?.value || 1));

  const [issueQuantity, setIssueQuantity] = useState(0);
  const { items } = useOutbound.line.rows();

  const onChangePackSize = (newPackSize: number) => {
    const packSize = newPackSize === -1 ? 1 : newPackSize;
    const newAllocatedQuantity =
      newPackSize === 0 ? 0 : Math.round(allocatedQuantity / packSize);
    packSizeController.setPackSize(newPackSize);

    allocate(newAllocatedQuantity, newPackSize);
  };

  const unit = item?.unitName ?? t('label.unit');
  const getAllocationWarning = (
    requestedQuantity: number,
    allocatedQuantity: number,
    placeholderQuantity: number
  ) => {
    if (allocatedQuantity !== requestedQuantity) {
      return t('messages.over-allocated', {
        allocatedQuantity: format(allocatedQuantity),
        requestedQuantity: format(requestedQuantity),
      });
    }
    if (placeholderQuantity > 0) {
      return t('messages.placeholder-allocated', { placeholderQuantity });
    }

    return undefined;
  };

  const debouncedQuantityUpdate = useDebounceCallback(
    quantity => setIssueQuantity(quantity),
    []
  );

  const allocate = (quantity: number, packSize: number) => {
    const newAllocateQuantities = onChangeQuantity(
      quantity,
      packSize === -1 ? null : packSize,
      true
    );
    const placeholderLine = newAllocateQuantities?.find(isA.placeholderLine);
    const allocatedQuantity =
      newAllocateQuantities?.reduce(
        (acc, { numberOfPacks, packSize }) => acc + numberOfPacks * packSize,
        0
      ) ?? 0;
    const warning = getAllocationWarning(
      quantity * (packSize === -1 ? 1 : packSize),
      allocatedQuantity,
      placeholderLine?.numberOfPacks ?? 0
    );
    setAllocationWarning(warning);
    debouncedQuantityUpdate(allocatedQuantity);
  };

  const handleIssueQuantityChange = (quantity: number) => {
    setIssueQuantity(quantity);
    allocate(quantity, Number(packSizeController.selected?.value));
  };

  useEffect(() => {
    if (!isAutoAllocated) setIssueQuantity(quantity);
  }, [packSizeController.selected?.value, quantity]);

  return (
    <Grid container gap="4px">
      <ModalRow>
        <ModalLabel label={t('label.item', { count: 1 })} />
        <Grid item flex={1}>
          <StockItemSearchInput
            autoFocus={!item}
            openOnFocus={!item}
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
              {t('label.available-quantity', {
                number: availableQuantity.toFixed(0),
              })}
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
          {allocationWarning && isAutoAllocated && (
            <Grid display="flex" justifyContent="center" flex={1}>
              <InfoPanel message={allocationWarning} />
            </Grid>
          )}
          <Grid container>
            <ModalLabel label={t('label.issue')} />
            <NonNegativeIntegerInput
              autoFocus
              value={issueQuantity}
              onChange={handleIssueQuantityChange}
              defaultValue={0}
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
                      ? `${t('label.unit-plural', {
                          unit,
                          count: issueQuantity,
                        })} ${t('label.in-packs-of')}`
                      : t('label.in-packs-of')}
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
                      {t('label.unit-plural', {
                        count: packSizeController.selected?.value,
                        unit,
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

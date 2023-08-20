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
  ButtonWithIcon,
  ZapIcon,
  InfoPanel,
  useFormatNumber,
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
  const [showAllocationWarning, setShowAllocationWarning] = useState(false);
  const [placeholderQuantity, setPlaceholderQuantity] = useState(0);
  const { format } = useFormatNumber();
  const quantity =
    allocatedQuantity /
    Math.abs(Number(packSizeController.selected?.value || 1));

  const [issueQuantity, setIssueQuantity] = useState(0);
  const { items } = useOutbound.line.rows();

  const onChangePackSize = (newPackSize: number) => {
    const newAllocatedQuantity =
      newPackSize === 0 ? 0 : Math.round(allocatedQuantity / newPackSize);
    packSizeController.setPackSize(newPackSize);
    onChangeQuantity(
      newAllocatedQuantity,
      newPackSize === -1 ? null : newPackSize,
      false
    );
    setShowAllocationWarning(false);
  };

  const unit = item?.unitName ?? t('label.unit');
  const allocate = () => {
    const newAllocateQuantities = onChangeQuantity(
      issueQuantity,
      packSizeController.selected?.value === -1
        ? null
        : Number(packSizeController.selected?.value),
      true
    );
    const placeholderLine = newAllocateQuantities?.find(isA.placeholderLine);
    setPlaceholderQuantity(placeholderLine?.numberOfPacks ?? 0);
    setShowAllocationWarning(!!placeholderLine?.numberOfPacks);
  };

  const handleIssueQuantityChange = (quantity: number) => {
    setIssueQuantity(quantity);
    setShowAllocationWarning(false);
  };

  useEffect(() => {
    setIssueQuantity(quantity);
  }, [packSizeController.selected?.value]);

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
          {showAllocationWarning && isAutoAllocated && (
            <Grid display="flex" justifyContent="center" flex={1}>
              <InfoPanel
                message={t('messages.over-allocated', {
                  quantity: format(placeholderQuantity),
                  issueQuantity: format(
                    issueQuantity *
                      (packSizeController.selected?.value === -1
                        ? 1
                        : packSizeController.selected?.value ?? 1)
                  ),
                })}
              />
            </Grid>
          )}
          <Grid container>
            <ModalLabel label={t('label.issue')} />
            <NonNegativeIntegerInput
              autoFocus
              value={issueQuantity}
              onChange={handleIssueQuantityChange}
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
                      {t('label.unit', {
                        count: packSizeController.selected?.value,
                        unit,
                      })}
                    </InputLabel>
                  </Grid>
                )}
                <Box marginLeft="auto" />
              </>
            ) : null}
            <Box flex={1} display="flex" justifyContent="flex-end">
              <ButtonWithIcon
                disabled={issueQuantity === 0}
                onClick={allocate}
                label={t('button.allocate')}
                Icon={<ZapIcon />}
              />
            </Box>
          </Grid>
        </>
      ) : (
        <Box height={100} />
      )}
    </Grid>
  );
};

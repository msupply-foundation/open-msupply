import React, { useState } from 'react';
import {
  Grid,
  InputWithLabelRow,
  NumericTextInput,
  TextArea,
  Typography,
  BasicTextInput,
  Box,
  Switch,
  NumUtils,
} from '@openmsupply-client/common';
import { useFormatNumber, useTranslation } from '@common/intl';
import {
  StockItemSearchInputWithStats,
  ItemRowWithStatsFragment,
  VariantControl,
  PackVariantSelect,
  useIsPackVariantsEnabled,
} from '@openmsupply-client/system';
import { useRequest } from '../../api';
import { DraftRequestLine } from './hooks';

interface RequestLineEditFormProps {
  currentItem: ItemRowWithStatsFragment | null;
  disabled: boolean;
  onChangeItem: (item: ItemRowWithStatsFragment) => void;
  update: (patch: Partial<DraftRequestLine>) => void;
  draftLine: DraftRequestLine | null;
  variantsControl?: VariantControl;
  numberOfPacksFromQuantity: (totalQuantity: number) => number;
  numberOfPacksToTotalQuantity: (numPacks: number) => number;
}

const InfoRow = ({ label, value }: { label: string; value: string }) => {
  return (
    <Grid spacing={4} container direction="row" paddingBottom={1}>
      <Grid xs={6} item>
        <Typography variant="body1" fontWeight={700}>
          {label}
        </Typography>
      </Grid>
      <Grid xs={3} item>
        <Typography variant="body1" style={{ textAlign: 'right' }}>
          {value}
        </Typography>
      </Grid>
    </Grid>
  );
};

interface RequestLineEditFormLayoutProps {
  Left: React.ReactElement;
  Middle: React.ReactElement;
  Right: React.ReactElement;
  Top: React.ReactElement;
}

export const RequestLineEditFormLayout = ({
  Left,
  Middle,
  Right,
  Top,
}: RequestLineEditFormLayoutProps) => {
  return (
    <Grid
      container
      spacing={2}
      direction="row"
      justifyContent="space-between"
      bgcolor="background.toolbar"
      padding={3}
      paddingBottom={1}
      boxShadow={theme => theme.shadows[2]}
    >
      <Grid item xs={8} direction="column" justifyContent="space-between">
        <Grid item xs={12} sx={{ mb: 2 }}>
          {Top}
        </Grid>
        <Grid
          item
          xs={12}
          container
          direction="row"
          justifyContent="space-between"
        >
          <Grid
            item
            xs={6}
            flexDirection="column"
            display="flex"
            justifyContent="flex-end"
          >
            {Left}
          </Grid>
          <Grid item xs={6}>
            {Middle}
          </Grid>
        </Grid>
      </Grid>
      <Grid item xs={4}>
        {Right}
      </Grid>
    </Grid>
  );
};

export const RequestLineEditForm = ({
  currentItem,
  disabled,
  onChangeItem,
  update,
  draftLine,
  variantsControl,
  numberOfPacksFromQuantity,
  numberOfPacksToTotalQuantity,
}: RequestLineEditFormProps) => {
  const t = useTranslation('replenishment');
  const formatNumber = useFormatNumber();
  const { lines } = useRequest.line.list();
  const requestedQuantity = draftLine?.requestedQuantity ?? 0;
  const originalItemName = lines?.find(
    ({ item }) => item.id === currentItem?.id
  )?.itemName;

  const isPackVariantsEnabled = useIsPackVariantsEnabled();

  const isPacksEnabled =
    !isPackVariantsEnabled && !!currentItem?.defaultPackSize;
  const [isPacks, setIsPacks] = useState(isPacksEnabled);

  return (
    <RequestLineEditFormLayout
      Top={
        <>
          {(disabled && (
            <BasicTextInput
              value={`${currentItem?.code}     ${originalItemName}`}
              disabled
              fullWidth
            />
          )) || (
            <StockItemSearchInputWithStats
              autoFocus={!currentItem}
              openOnFocus={!currentItem}
              width={600}
              disabled={disabled}
              currentItemId={currentItem?.id}
              onChange={(newItem: ItemRowWithStatsFragment | null) =>
                newItem && onChangeItem(newItem)
              }
              extraFilter={
                disabled
                  ? undefined
                  : itemRow =>
                      !lines?.some(({ item }) => itemRow.id === item.id)
              }
            />
          )}
        </>
      }
      Left={
        <>
          {currentItem && currentItem?.unitName ? (
            variantsControl ? (
              <Grid paddingTop={2}>
                <InputWithLabelRow
                  Input={
                    <PackVariantSelect
                      sx={{ minWidth: 110 }}
                      variantControl={variantsControl}
                    />
                  }
                  label={t('label.unit')}
                />
              </Grid>
            ) : (
              <InfoRow label={t('label.unit')} value={currentItem?.unitName} />
            )
          ) : null}

          {!!draftLine?.itemStats.averageMonthlyConsumption ? (
            <InfoRow
              label={t('label.amc')}
              value={formatNumber.round(
                numberOfPacksFromQuantity(
                  draftLine?.itemStats.averageMonthlyConsumption
                ),
                2
              )}
            />
          ) : null}
          {!!draftLine?.itemStats.availableStockOnHand ? (
            <InfoRow
              label={t('label.soh')}
              value={formatNumber.round(
                numberOfPacksFromQuantity(
                  draftLine?.itemStats.availableStockOnHand
                ),
                2
              )}
            />
          ) : null}
          {isPacksEnabled ? (
            <InfoRow
              label={t('label.default-pack-size')}
              value={String(currentItem.defaultPackSize)}
            />
          ) : null}
        </>
      }
      Middle={
        currentItem ? (
          <>
            {isPacksEnabled && (
              <Box display="flex" justifyContent="flex-end" alignItems="center">
                <Switch
                  label={t('label.units')}
                  checked={isPacks}
                  onChange={(_event, checked) => setIsPacks(checked)}
                  size="small"
                />
                <Box paddingLeft={2} paddingRight={2}>
                  {t('label.packs')}
                </Box>
              </Box>
            )}
            <InputWithLabelRow
              Input={
                <NumericTextInput
                  width={100}
                  value={numberOfPacksFromQuantity(
                    draftLine?.suggestedQuantity ?? 0
                  )}
                  disabled
                />
              }
              labelWidth="750px"
              label={t('label.suggested-quantity')}
            />
            <InputWithLabelRow
              Input={
                <NumericTextInput
                  autoFocus
                  value={numberOfPacksFromQuantity(requestedQuantity)}
                  disabled={isPacks}
                  width={100}
                  onChange={q =>
                    update({
                      requestedQuantity: q && numberOfPacksToTotalQuantity(q),
                    })
                  }
                />
              }
              labelWidth="750px"
              label={t('label.order-quantity')}
            />
            {isPacksEnabled && (
              <InputWithLabelRow
                Input={
                  <NumericTextInput
                    autoFocus
                    disabled={!isPacks}
                    value={NumUtils.round(
                      requestedQuantity / currentItem.defaultPackSize,
                      2
                    )}
                    width={100}
                    onChange={quantity => {
                      if (quantity === undefined) return;
                      update({
                        requestedQuantity:
                          quantity * currentItem.defaultPackSize,
                      });
                    }}
                  />
                }
                labelWidth="750px"
                label={t('label.requested-packs')}
              />
            )}
          </>
        ) : (
          <></>
        )
      }
      Right={
        <>
          <Typography variant="body1" fontWeight="bold">
            {t('heading.comment')}
          </Typography>
          <TextArea
            value={draftLine?.comment ?? ''}
            onChange={e => update({ comment: e.target.value })}
            InputProps={{
              sx: { backgroundColor: theme => theme.palette.background.menu },
            }}
            minRows={7}
            maxRows={7}
          />
        </>
      }
    />
  );
};

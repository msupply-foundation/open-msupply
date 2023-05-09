import React, { useState } from 'react';
import {
  Grid,
  InputWithLabelRow,
  NumericTextInput,
  NonNegativeIntegerInput,
  TextArea,
  Typography,
  Switch,
  Box,
  NumUtils,
} from '@openmsupply-client/common';
import { useFormatNumber, useTranslation } from '@common/intl';
import {
  StockItemSearchInputWithStats,
  ItemRowWithStatsFragment,
} from '@openmsupply-client/system';
import { useRequest } from '../../api';
import { DraftRequestLine } from './hooks';

interface RequestLineEditFormProps {
  item: ItemRowWithStatsFragment | null;
  disabled: boolean;
  onChangeItem: (item: ItemRowWithStatsFragment) => void;
  update: (patch: Partial<DraftRequestLine>) => void;
  draftLine: DraftRequestLine | null;
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
}

export const RequestLineEditFormLayout = ({
  Left,
  Middle,
  Right,
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
      <Grid item xs={4}>
        {Left}
      </Grid>
      <Grid
        item
        xs={4}
        paddingBottom={1}
        display="flex"
        flexDirection="column"
        justifyContent="flex-end"
      >
        {Middle}
      </Grid>
      <Grid item xs={4}>
        {Right}
      </Grid>
    </Grid>
  );
};

export const RequestLineEditForm = ({
  item,
  disabled,
  onChangeItem,
  update,
  draftLine,
}: RequestLineEditFormProps) => {
  const t = useTranslation('replenishment');
  const formatNumber = useFormatNumber();
  const { lines } = useRequest.line.list();
  const isPacksEnabled = !!item?.defaultPackSize;
  const [isPacks, setIsPacks] = useState(isPacksEnabled);
  const requestedQuantity = draftLine?.requestedQuantity ?? 0;
  const defaultPackSize = item?.defaultPackSize ?? 0;

  return (
    <RequestLineEditFormLayout
      Left={
        <>
          <StockItemSearchInputWithStats
            autoFocus={!item}
            openOnFocus={!item}
            width={300}
            disabled={disabled}
            currentItemId={item?.id}
            onChange={(newItem: ItemRowWithStatsFragment | null) =>
              newItem && onChangeItem(newItem)
            }
            extraFilter={
              disabled
                ? undefined
                : itemRow => !lines?.some(({ item }) => itemRow.id === item.id)
            }
          />

          {item && item?.unitName ? (
            <InfoRow label="Unit" value={item.unitName} />
          ) : null}
          {!!draftLine?.itemStats.averageMonthlyConsumption ? (
            <InfoRow
              label={t('label.amc')}
              value={formatNumber.round(
                draftLine?.itemStats.averageMonthlyConsumption,
                2
              )}
            />
          ) : null}
          {!!draftLine?.itemStats.availableStockOnHand ? (
            <InfoRow
              label={t('label.soh')}
              value={formatNumber.round(
                draftLine?.itemStats.availableStockOnHand,
                2
              )}
            />
          ) : null}
          {isPacksEnabled && (
            <InfoRow
              label={t('label.default-pack-size')}
              value={`${defaultPackSize}`}
            />
          )}
        </>
      }
      Middle={
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
                value={Math.round(draftLine?.suggestedQuantity ?? 0)}
                disabled
              />
            }
            labelWidth="750px"
            label={t(
              isPacksEnabled
                ? 'label.suggested-units'
                : 'label.suggested-quantity'
            )}
          />
          <InputWithLabelRow
            Input={
              <NonNegativeIntegerInput
                autoFocus
                disabled={isPacks}
                value={requestedQuantity}
                width={100}
                onChange={requestedQuantity => update({ requestedQuantity })}
              />
            }
            labelWidth="750px"
            label={t(
              isPacksEnabled
                ? 'label.order-quantity-units'
                : 'label.order-quantity'
            )}
          />
          {isPacksEnabled && (
            <InputWithLabelRow
              Input={
                <NonNegativeIntegerInput
                  autoFocus
                  disabled={!isPacks}
                  value={NumUtils.round(requestedQuantity / defaultPackSize, 2)}
                  width={100}
                  onChange={quantity =>
                    update({
                      requestedQuantity: quantity * defaultPackSize,
                    })
                  }
                />
              }
              labelWidth="750px"
              label={t('label.requested-packs')}
            />
          )}
        </>
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
            minRows={6}
            maxRows={6}
          />
        </>
      }
    />
  );
};

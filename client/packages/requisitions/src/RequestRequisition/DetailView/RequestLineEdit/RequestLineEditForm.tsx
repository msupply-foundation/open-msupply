import React from 'react';
import {
  Grid,
  InputWithLabelRow,
  NumericTextInput,
  NonNegativeIntegerInput,
  TextArea,
  Typography,
} from '@openmsupply-client/common';
import { useFormatNumber, useTranslation } from '@common/intl';
import {
  StockItemSearchInput,
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
    <Grid spacing={4} container direction="row">
      <Grid xs={4} item>
        <Typography variant="body1" fontWeight={700}>
          {label}
        </Typography>
      </Grid>
      <Grid xs={2} item>
        <Typography variant="body1">{value}</Typography>
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
      boxShadow={theme => theme.shadows[2]}
    >
      <Grid item xs={4}>
        {Left}
      </Grid>
      <Grid
        item
        xs={4}
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

  return (
    <RequestLineEditFormLayout
      Left={
        <>
          <StockItemSearchInput
            autoFocus={!item}
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
        </>
      }
      Middle={
        <>
          <InputWithLabelRow
            Input={
              <NumericTextInput
                width={150}
                value={Math.round(draftLine?.suggestedQuantity ?? 0)}
                disabled
              />
            }
            labelWidth="150px"
            label={t('label.suggested-quantity', { ns: 'replenishment' })}
          />
          <InputWithLabelRow
            Input={
              <NonNegativeIntegerInput
                autoFocus
                value={draftLine?.requestedQuantity ?? 0}
                width={150}
                onChange={requestedQuantity => update({ requestedQuantity })}
              />
            }
            labelWidth="150px"
            label={t('label.order-quantity', { ns: 'replenishment' })}
          />
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
          />
        </>
      }
    />
  );
};

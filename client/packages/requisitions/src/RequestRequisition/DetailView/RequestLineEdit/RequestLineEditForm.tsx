import React from 'react';
import {
  Grid,
  InputWithLabelRow,
  NumericTextInput,
  TextArea,
  Typography,
  useTranslation,
} from '@openmsupply-client/common';
import {
  StockItemSearchInput,
  ItemRowWithStatsFragment,
} from '@openmsupply-client/system';
import { useRequestLines } from '../../api';
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
      <Grid item xs={4}>
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
  const t = useTranslation(['replenishment', 'common']);
  const { lines } = useRequestLines();
  return (
    <RequestLineEditFormLayout
      Left={
        <>
          <Typography variant="body1" fontWeight="bold">
            {t('label.stock-details', { ns: 'replenishment' })}
          </Typography>
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
          {item && item?.stats.averageMonthlyConsumption != null ? (
            <InfoRow
              label={t('label.amc')}
              value={String(item?.stats.averageMonthlyConsumption)}
            />
          ) : null}
        </>
      }
      Middle={
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
      Right={
        <>
          <Typography variant="body1" fontWeight="bold">
            {t('heading.order')}
          </Typography>
          <InputWithLabelRow
            Input={
              <NumericTextInput
                width={150}
                value={draftLine?.suggestedQuantity}
                disabled
              />
            }
            labelWidth="150px"
            labelProps={{ sx: { fontWeight: 500 } }}
            label={t('label.suggested-quantity', { ns: 'replenishment' })}
          />
          <InputWithLabelRow
            Input={
              <NumericTextInput
                value={draftLine?.requestedQuantity}
                width={150}
                onChange={e =>
                  update({
                    requestedQuantity: Math.max(Number(e.target.value), 0),
                  })
                }
              />
            }
            labelWidth="150px"
            labelProps={{ sx: { fontWeight: 500 } }}
            label={t('label.order-quantity', { ns: 'replenishment' })}
          />
        </>
      }
    />
  );
};

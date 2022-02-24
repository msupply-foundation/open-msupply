import React from 'react';
import {
  Grid,
  InputWithLabelRow,
  NumericTextInput,
  TextArea,
  Typography,
  useTranslation,
} from '@openmsupply-client/common';
import { ItemSearchInput } from '@openmsupply-client/system';
import { useRequestRequisitionLines, ItemWithStatsFragment } from '../../api';
import { DraftRequestRequisitionLine } from './hooks';

interface RequestLineEditFormProps {
  item: ItemWithStatsFragment | null;
  disabled: boolean;
  onChangeItem: (item: ItemWithStatsFragment) => void;
  update: (patch: Partial<DraftRequestRequisitionLine>) => void;
  draftLine: DraftRequestRequisitionLine | null;
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
    <Grid container spacing={2} direction="row" justifyContent="space-between">
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
  const { lines } = useRequestRequisitionLines();
  return (
    <RequestLineEditFormLayout
      Left={
        <>
          <Typography variant="body1" fontWeight="bold">
            {t('label.stock-details', { ns: 'replenishment' })}
          </Typography>
          <ItemSearchInput
            width={300}
            disabled={disabled}
            currentItem={item}
            onChange={(newItem: ItemWithStatsFragment | null) =>
              newItem && onChangeItem(newItem)
            }
            extraFilter={itemToFind => {
              const itemAlreadyInShipment = lines?.some(
                ({ item: itemInReq }) => itemInReq.id === itemToFind.id
              );
              return !itemAlreadyInShipment;
            }}
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
          {draftLine && draftLine.suggestedQuantity != null ? (
            <InfoRow
              label={t('label.suggested')}
              value={String(draftLine.suggestedQuantity)}
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
                value={draftLine?.requestedQuantity}
                width={220}
                onChange={e =>
                  update({
                    requestedQuantity: Math.max(Number(e.target.value), 0),
                  })
                }
              />
            }
            labelProps={{ sx: { fontWeight: 500 } }}
            label={t('label.order-quantity', { ns: 'replenishment' })}
          />
        </>
      }
    />
  );
};

import React from 'react';
import {
  Grid,
  InputWithLabelRow,
  NumericTextInput,
  TextArea,
  Typography,
  BasicTextInput,
} from '@openmsupply-client/common';
import { useFormatNumber, useTranslation } from '@common/intl';
import {
  StockItemSearchInputWithStats,
  ItemRowWithStatsFragment,
  VariantControl,
  PackVariantSelect,
} from '@openmsupply-client/system';
import { useRequest } from '../../api';
import { DraftRequestLine } from './hooks';

interface RequestLineEditFormProps {
  item: ItemRowWithStatsFragment | null;
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
  item,
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
  const originalItemName = lines?.find(({ item }) => item.id === item.id)
    ?.itemName;

  return (
    <RequestLineEditFormLayout
      Top={
        <>
          {(disabled && (
            <BasicTextInput
              value={`${item?.code}     ${originalItemName}`}
              disabled
              fullWidth
            />
          )) || (
            <StockItemSearchInputWithStats
              autoFocus={!item}
              openOnFocus={!item}
              width={600}
              disabled={disabled}
              currentItemId={item?.id}
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
          {item && item?.unitName ? (
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
              <InfoRow label={t('label.unit')} value={item?.unitName} />
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
        </>
      }
      Middle={
        <>
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
            minRows={7}
            maxRows={7}
          />
        </>
      }
    />
  );
};

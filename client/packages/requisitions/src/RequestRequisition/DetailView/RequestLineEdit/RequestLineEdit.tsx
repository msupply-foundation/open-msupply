import React from 'react';
import {
  ItemRowFragment,
  ItemWithPackSizeFragment,
  ItemWithStatsFragment,
  ReasonOptionsSearchInput,
  RequestFragment,
  StockItemSearchInput,
  StockItemSearchInputWithStats,
} from '@openmsupply-client/system';
import {
  useFormatNumber,
  useTranslation,
  BasicTextInput,
  Box,
  InputWithLabelRow,
  NumericTextInput,
  NumUtils,
  ReasonOptionNodeType,
  Switch,
  TextArea,
  usePluginProvider,
  useTheme,
  useWindowDimensions,
  Typography,
} from '@openmsupply-client/common';
import { DraftRequestLine } from './hooks';
import { RequestLineFragment } from '../../api';
import {
  InfoRow,
  RequestLineEditFormLayout,
} from './RequestLineEditFormLayout';

const INPUT_WIDTH = 100;
const LABEL_WIDTH = '150px';

interface RequestLineEditProps {
  requisition: RequestFragment;
  lines: RequestLineFragment[];
  currentItem?: ItemWithPackSizeFragment | null;
  setCurrentItem: (item: ItemWithStatsFragment) => void;
  draft?: DraftRequestLine | null;
  update: (patch: Partial<DraftRequestLine>) => void;
  isPacksEnabled: boolean;
  isPacks: boolean;
  setIsPacks: (isPacks: boolean) => void;
  disabled?: boolean;
  showExtraFields?: boolean;
}

export const RequestLineEdit = ({
  requisition,
  lines,
  draft,
  currentItem,
  setCurrentItem,
  update,
  isPacksEnabled,
  isPacks,
  setIsPacks,
  disabled,
  showExtraFields,
}: RequestLineEditProps) => {
  const t = useTranslation();
  const { plugins } = usePluginProvider();
  const formatNumber = useFormatNumber();

  const line = lines.find(line => line.id === draft?.id);
  const theme = useTheme();
  const originalItemName = lines?.find(
    ({ item }) => item.id === currentItem?.id
  )?.itemName;

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
              onChange={(newItem: ItemWithStatsFragment | null) =>
                newItem && setCurrentItem(newItem)
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
            <InfoRow label={t('label.unit')} value={currentItem?.unitName} />
          ) : null}

          {!!draft?.itemStats.averageMonthlyConsumption ? (
            <InfoRow
              label={t('label.amc/amd')}
              value={formatNumber.round(
                draft?.itemStats.averageMonthlyConsumption,
                2
              )}
            />
          ) : null}
          {!!draft?.itemStats.availableStockOnHand ? (
            <InfoRow
              label={t('label.soh')}
              value={formatNumber.round(
                draft?.itemStats.availableStockOnHand,
                2
              )}
            />
          ) : null}
          {isPacksEnabled ? (
            <InfoRow
              label={t('label.default-pack-size')}
              value={String(currentItem?.defaultPackSize)}
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
                  value={line?.suggestedQuantity ?? 0}
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
                  value={draft?.requestedQuantity ?? 0}
                  disabled={disabled || isPacks}
                  width={100}
                  onChange={q =>
                    update({
                      requestedQuantity: q,
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
                    disabled={disabled || !isPacks}
                    value={NumUtils.round(
                      (draft?.requestedQuantity ?? 0) /
                        currentItem.defaultPackSize,
                      2
                    )}
                    decimalLimit={2}
                    width={100}
                    onChange={quantity => {
                      update({
                        requestedQuantity:
                          (quantity ?? 0) * currentItem.defaultPackSize,
                      });
                    }}
                  />
                }
                labelWidth="750px"
                label={t('label.requested-packs')}
              />
            )}
          </>
        ) : null
      }
      Right={
        <>
          <Typography variant="body1" fontWeight="bold">
            {t('heading.comment')}
          </Typography>
          <TextArea
            value={draft?.comment ?? ''}
            onChange={e => update({ comment: e.target.value })}
            slotProps={{
              input: {
                sx: { backgroundColor: theme => theme.palette.background.menu },
              },
            }}
            disabled={disabled}
            minRows={7}
            maxRows={7}
          />
        </>
      }
    />
  );
};

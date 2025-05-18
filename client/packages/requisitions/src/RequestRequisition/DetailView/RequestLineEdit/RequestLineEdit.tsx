import React, { useMemo } from 'react';
import {
  ItemWithPackSizeFragment,
  ItemWithStatsFragment,
  ReasonOptionsSearchInput,
  RequestFragment,
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
  useWindowDimensions,
  Typography,
} from '@openmsupply-client/common';
import { DraftRequestLine } from './hooks';
import { RequestLineFragment } from '../../api';
import {
  InfoRow,
  RequestLineEditFormLayout,
} from './RequestLineEditFormLayout';

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
  const { width } = useWindowDimensions();

  const line = useMemo(
    () => lines.find(line => line.id === draft?.id),
    [lines, draft?.id]
  );

  const originalItemName = useMemo(
    () => lines?.find(({ item }) => item.id === currentItem?.id)?.itemName,
    [lines, currentItem?.id]
  );

  return (
    <>
      <RequestLineEditFormLayout
        Top={
          <>
            {disabled ? (
              <BasicTextInput
                value={`${currentItem?.code}     ${originalItemName}`}
                disabled
                fullWidth
              />
            ) : (
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

            <InfoRow
              label={t('label.our-soh')}
              value={formatNumber.round(
                draft?.itemStats.availableStockOnHand,
                2
              )}
            />
            {isPacksEnabled ? (
              <InfoRow
                label={t('label.default-pack-size')}
                value={String(currentItem?.defaultPackSize)}
              />
            ) : null}

            {showExtraFields && (
              <>
                <InfoRow
                  label={t('label.incoming-stock')}
                  value={String(draft?.incomingUnits)}
                />
                <InfoRow
                  label={t('label.outgoing')}
                  value={String(draft?.outgoingUnits)}
                />
                <InfoRow
                  label={t('label.losses')}
                  value={String(draft?.lossInUnits)}
                />
                <InfoRow
                  label={t('label.additions')}
                  value={String(draft?.additionInUnits)}
                />
              </>
            )}
            <InfoRow
              label={t('label.amc/amd')}
              value={formatNumber.round(
                draft?.itemStats.averageMonthlyConsumption,
                2
              )}
            />
          </>
        }
        Middle={
          currentItem ? (
            <>
              {isPacksEnabled && (
                <Box
                  display="flex"
                  justifyContent="flex-end"
                  alignItems="center"
                >
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
                    onChange={newValue => {
                      if (draft?.suggestedQuantity === newValue) {
                        update({
                          requestedQuantity: newValue,
                          reason: null,
                        });
                      } else {
                        update({ requestedQuantity: newValue });
                      }
                    }}
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
              {showExtraFields && (
                <>
                  <InfoRow
                    label={t('label.months-of-stock')}
                    value={formatNumber.round(
                      draft?.itemStats.availableMonthsOfStockOnHand ?? 0,
                      2
                    )}
                  />
                  <InfoRow
                    label={t('label.short-expiry')}
                    value={String(draft?.expiringUnits)}
                  />
                  <InfoRow
                    label={t('label.days-out-of-stock')}
                    value={String(draft?.daysOutOfStock)}
                  />
                </>
              )}
            </>
          ) : null
        }
        Right={
          <>
            <InputWithLabelRow
              Input={
                <ReasonOptionsSearchInput
                  value={draft?.reason}
                  onChange={value => {
                    update({ reason: value });
                  }}
                  width={180}
                  type={ReasonOptionNodeType.RequisitionLineVariance}
                  isDisabled={
                    draft?.requestedQuantity === draft?.suggestedQuantity ||
                    disabled
                  }
                />
              }
              sx={{ marginTop: 0 }}
              label={t('label.reason')}
            />
            <Typography variant="body1" fontWeight="bold">
              {t('heading.comment')}
            </Typography>
            <TextArea
              value={draft?.comment ?? ''}
              onChange={e => update({ comment: e.target.value })}
              slotProps={{
                input: {
                  sx: {
                    backgroundColor: theme => theme.palette.background.menu,
                  },
                },
              }}
              disabled={disabled}
              minRows={7}
              maxRows={7}
            />
          </>
        }
      />
      <Box paddingTop={1} maxHeight={200} width={width * 0.48} display="flex">
        {line &&
          plugins.requestRequisitionLine?.editViewInfo?.map((Info, index) => (
            <Info key={index} line={line} requisition={requisition} />
          ))}
        {line &&
          plugins.requestRequisitionLine?.editViewField?.map((Field, index) => (
            <Field key={index} line={line} />
          ))}
      </Box>
    </>
  );
};

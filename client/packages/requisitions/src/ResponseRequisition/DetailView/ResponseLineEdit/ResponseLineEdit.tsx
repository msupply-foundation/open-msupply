import React, { useMemo } from 'react';
import { useTranslation } from '@common/intl';
import {
  ItemWithStatsFragment,
  ReasonOptionsSearchInput,
  StockItemSearchInputWithStats,
  useReasonOptions,
} from '@openmsupply-client/system';
import { DraftResponseLine } from './hooks';
import {
  BasicTextInput,
  Box,
  BufferedTextArea,
  InputWithLabelRow,
  ReasonOptionNodeType,
  RequisitionNodeApprovalStatus,
  Typography,
} from '@openmsupply-client/common';
import { ResponseFragment, ResponseLineFragment, useResponse } from '../../api';
import {
  InfoRow,
  ModalContentLayout,
  RepresentationValue,
} from '../../../common';
import { SupplySelection } from './SuppliedSelection';
import { useStockCalculations } from './utils';
import { createNumericInput } from './ContentLayout';

interface ResponseLineEditProps {
  requisition: ResponseFragment;
  currentItem?: ItemWithStatsFragment;
  onChangeItem: (item: ItemWithStatsFragment) => void;
  lines: ResponseLineFragment[];
  draft?: DraftResponseLine | null;
  update: (patch: Partial<DraftResponseLine>) => void;
  isPacksEnabled: boolean;
  representation: RepresentationValue;
  setRepresentation: (type: RepresentationValue) => void;
  disabled: boolean;
  isUpdateMode?: boolean;
  showExtraFields?: boolean;
}

export const ResponseLineEdit = ({
  requisition,
  currentItem,
  onChangeItem,
  lines,
  draft,
  update,
  isPacksEnabled,
  representation,
  setRepresentation,
  disabled = false,
  isUpdateMode = false,
  showExtraFields = true,
}: ResponseLineEditProps) => {
  const t = useTranslation();
  const { data } = useResponse.line.stats(draft?.id);
  const { data: reasonOptions, isLoading } = useReasonOptions();
  const isDisabled = disabled || !!requisition.linkedRequisition;
  const disableItemSelection = disabled || isUpdateMode;
  const hasApproval =
    requisition.approvalStatus === RequisitionNodeApprovalStatus.Approved;

  const unitName = currentItem?.unitName || t('label.unit');
  const defaultPackSize = currentItem?.defaultPackSize || 1;
  const originalItemName = useMemo(
    () => lines?.find(({ item }) => item.id === currentItem?.id)?.itemName,
    [lines, currentItem?.id]
  );

  const { available, mos } = useStockCalculations(draft);
  const numericInput = createNumericInput(t, {
    defaultPackSize,
    representation,
    unitName,
    disabled: isDisabled,
  });

  return (
    <>
      <ModalContentLayout
        Top={
          <>
            {(disableItemSelection && (
              <BasicTextInput
                value={`${currentItem?.code}     ${originalItemName}`}
                disabled
                fullWidth
              />
            )) || (
              <StockItemSearchInputWithStats
                autoFocus={!currentItem}
                openOnFocus={!currentItem}
                disabled={disabled}
                currentItemId={currentItem?.id}
                onChange={(newItem: ItemWithStatsFragment | null) =>
                  newItem && onChangeItem(newItem)
                }
                extraFilter={item =>
                  !lines.some(line => line.item.id === item.id)
                }
              />
            )}
          </>
        }
        Left={
          draft ? (
            <>
              {currentItem?.unitName && (
                <InfoRow label={t('label.unit')} value={unitName} />
              )}
              {isPacksEnabled && (
                <InfoRow
                  label={t('label.default-pack-size')}
                  value={String(currentItem?.defaultPackSize)}
                />
              )}
              {!showExtraFields ? (
                <>
                  {numericInput(
                    'label.customer-soh',
                    draft?.availableStockOnHand,
                    {
                      onChange: value =>
                        update({ availableStockOnHand: value }),
                      autoFocus: true,
                    }
                  )}
                </>
              ) : (
                <>
                  {numericInput(
                    'label.initial-stock-on-hand',
                    draft?.initialStockOnHandUnits,
                    {
                      onChange: value =>
                        update({ initialStockOnHandUnits: value }),
                      autoFocus: true,
                    }
                  )}
                  {numericInput('label.incoming', draft?.incomingUnits, {
                    onChange: value => update({ incomingUnits: value }),
                  })}
                  {numericInput('label.outgoing', draft?.outgoingUnits, {
                    onChange: value => update({ outgoingUnits: value }),
                  })}
                  {numericInput('label.losses', draft?.lossInUnits, {
                    onChange: value => update({ lossInUnits: value }),
                  })}
                  {numericInput('label.additions', draft?.additionInUnits, {
                    onChange: value => update({ additionInUnits: value }),
                  })}
                  {numericInput(
                    'label.days-out-of-stock',
                    draft?.daysOutOfStock,
                    {
                      onChange: value => update({ daysOutOfStock: value }),
                    }
                  )}
                </>
              )}
            </>
          ) : null
        }
        Middle={
          <>
            {showExtraFields && (
              <>
                {numericInput('label.available', available, {
                  disabledOverride: true,
                })}
              </>
            )}
            {numericInput('label.amc/amd', draft?.averageMonthlyConsumption, {
              onChange: value => update({ averageMonthlyConsumption: value }),
            })}

            {showExtraFields &&
              numericInput('label.months-of-stock', mos, {
                disabledOverride: true,
                endAdornmentOverride: t('label.months'),
              })}

            <Box
              sx={{
                background: theme => theme.palette.background.group,
                pt: 1,
                pb: 0.2,
                borderRadius: 2,
              }}
            >
              {numericInput(
                'label.our-soh',
                data?.responseStoreStats.stockOnHand,
                {
                  disabledOverride: true,
                }
              )}
              {numericInput('label.suggested', draft?.suggestedQuantity, {
                disabledOverride: true,
              })}
              {numericInput('label.requested', draft?.requestedQuantity, {
                onChange: value =>
                  update({ requestedQuantity: value, reason: null }),
              })}
            </Box>
            {showExtraFields && (
              <>
                <InputWithLabelRow
                  label={t('label.reason')}
                  Input={
                    <ReasonOptionsSearchInput
                      value={draft?.reason}
                      onChange={value => {
                        update({ reason: value });
                      }}
                      width={240}
                      type={ReasonOptionNodeType.RequisitionLineVariance}
                      isDisabled={
                        draft?.requestedQuantity === draft?.suggestedQuantity ||
                        disabled
                      }
                      reasonOptions={reasonOptions?.nodes ?? []}
                      isLoading={isLoading}
                    />
                  }
                  sx={{
                    pl: 1,
                    pt: 0.5,
                    pb: 0.5,
                  }}
                />
                {numericInput('label.short-expiry', draft?.expiringUnits, {
                  onChange: value => update({ expiringUnits: value }),
                })}
              </>
            )}
          </>
        }
        Right={
          draft ? (
            <>
              {hasApproval &&
                numericInput('label.approved', draft?.approvedQuantity, {
                  disabledOverride: true,
                  sx: {
                    pt: 1,
                    pl: 0,
                  },
                })}
              <SupplySelection
                disabled={disabled}
                defaultPackSize={defaultPackSize}
                isPacksEnabled={isPacksEnabled}
                draft={draft}
                update={update}
                representation={representation}
                setRepresentation={setRepresentation}
                unitName={unitName}
                showExtraFields={showExtraFields}
              />
              {numericInput(
                'label.remaining-to-supply',
                draft?.remainingQuantityToSupply,
                {
                  disabledOverride: true,
                  sx: {
                    pl: 0,
                  },
                }
              )}
              {numericInput('label.already-issued', draft?.alreadyIssued, {
                disabledOverride: true,
                sx: {
                  pl: 0,
                },
              })}
              <Typography variant="body1" fontWeight="bold" paddingBottom={0}>
                {t('heading.comment')}:
              </Typography>
              <BufferedTextArea
                value={draft?.comment ?? ''}
                onChange={e => update({ comment: e.target.value })}
                slotProps={{
                  input: {
                    sx: {
                      backgroundColor: theme =>
                        disabled
                          ? theme.palette.background.toolbar
                          : theme.palette.background.white,
                    },
                  },
                }}
                disabled={disabled}
                minRows={2}
                maxRows={2}
              />
            </>
          ) : null
        }
      />
    </>
  );
};

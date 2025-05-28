import React, { useMemo } from 'react';
import {
  useTranslation,
  BasicTextInput,
  Box,
  BufferedTextArea,
  InputWithLabelRow,
  ReasonOptionNodeType,
  RequisitionNodeApprovalStatus,
  Typography,
  UserStoreNodeFragment,
} from '@openmsupply-client/common';
import {
  ItemWithStatsFragment,
  ReasonOptionsSearchInput,
  StockItemSearchInputWithStats,
  useReasonOptions,
} from '@openmsupply-client/system';
import { ResponseFragment, ResponseLineFragment } from '../../api';
import {
  InfoRow,
  ModalContentLayout,
  RepresentationValue,
} from '../../../common';
import { DraftResponseLine } from './hooks';
import { SupplySelection } from './SuppliedSelection';
import { useStockCalculations } from './utils';
import { createNumericInput } from './ContentLayout';

interface ResponseLineEditProps {
  store?: UserStoreNodeFragment;
  requisition: ResponseFragment;
  currentItem?: ItemWithStatsFragment;
  onChangeItem: (item: ItemWithStatsFragment) => void;
  lines: ResponseLineFragment[];
  draft?: DraftResponseLine | null;
  update: (patch: Partial<DraftResponseLine>) => void;
  representation: RepresentationValue;
  setRepresentation: (type: RepresentationValue) => void;
  disabled: boolean;
  isUpdateMode?: boolean;
  showExtraFields?: boolean;
}

export const ResponseLineEdit = ({
  store,
  requisition,
  currentItem,
  onChangeItem,
  lines,
  draft,
  update,
  representation,
  setRepresentation,
  disabled = false,
  isUpdateMode = false,
}: ResponseLineEditProps) => {
  const t = useTranslation();
  const { data: reasonOptions, isLoading } = useReasonOptions();
  const hasApproval =
    requisition.approvalStatus === RequisitionNodeApprovalStatus.Approved;
  const isPacksEnabled = !!currentItem?.defaultPackSize;

  const showExtraFields =
    store?.preferences?.extraFieldsInRequisition && !!requisition.program;
  const isDisabled = disabled || !!requisition.linkedRequisition;
  const disableItemSelection = disabled || isUpdateMode;

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
                    onChange: value => update({ availableStockOnHand: value }),
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
        draft ? (
          <>
            {showExtraFields && (
              <>
                {numericInput('label.available', available, {
                  disabledOverride: true,
                })}
                {numericInput(
                  'label.amc/amd',
                  draft?.averageMonthlyConsumption,
                  {
                    onChange: value =>
                      update({ averageMonthlyConsumption: value }),
                  }
                )}

                {numericInput('label.months-of-stock', mos, {
                  disabledOverride: true,
                  endAdornmentOverride: t('label.months'),
                })}
              </>
            )}

            <Box
              sx={{
                background: theme => theme.palette.background.group,
                pt: 1,
                pb: 0.2,
                borderRadius: 2,
              }}
            >
              {numericInput('label.our-soh', draft?.itemStats.stockOnHand, {
                disabledOverride: true,
              })}
              {numericInput('label.suggested', draft?.suggestedQuantity, {
                disabledOverride: true,
              })}
              {numericInput('label.requested', draft?.requestedQuantity, {
                onChange: value => {
                  draft?.suggestedQuantity === value
                    ? update({
                        requestedQuantity: value,
                        reason: null,
                      })
                    : update({ requestedQuantity: value });
                },
              })}
            </Box>
            {showExtraFields && (
              <>
                <InputWithLabelRow
                  label={t('label.reason')}
                  labelWidth={'205px'}
                  Input={
                    <ReasonOptionsSearchInput
                      value={draft?.reason}
                      onChange={value => {
                        update({ reason: value });
                      }}
                      width={145}
                      type={ReasonOptionNodeType.RequisitionLineVariance}
                      isDisabled={
                        draft?.requestedQuantity === draft?.suggestedQuantity ||
                        disabled
                      }
                      reasonOptions={reasonOptions?.nodes ?? []}
                      isLoading={isLoading}
                      sx={{
                        boxShadow: theme =>
                          !disabled ? theme.shadows[2] : 'none',
                        borderRadius: 2,
                      }}
                    />
                  }
                  sx={{
                    pl: 1,
                    pt: 0.5,
                    pb: 0.5,
                  }}
                />
              </>
            )}
          </>
        ) : null
      }
      Right={
        draft ? (
          <>
            {showExtraFields &&
              numericInput('label.short-expiry', draft?.expiringUnits, {
                onChange: value => update({ expiringUnits: value }),
              })}
            <Box
              sx={{
                background: theme => theme.palette.background.group,
                padding: '0px 8px',
                borderRadius: 2,
                paddingBottom: 1,
              }}
            >
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
            </Box>
            <Typography variant="body1" fontWeight="bold" p="4px">
              {t('heading.comment')}:
            </Typography>
            <BufferedTextArea
              value={draft?.comment ?? ''}
              onChange={e => update({ comment: e.target.value })}
              slotProps={{
                input: {
                  sx: {
                    boxShadow: theme => (!disabled ? theme.shadows[2] : 'none'),
                    borderRadius: 2,
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
  );
};

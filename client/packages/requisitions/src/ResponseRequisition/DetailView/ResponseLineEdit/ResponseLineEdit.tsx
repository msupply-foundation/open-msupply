import React, { useMemo } from 'react';
import {
  useTranslation,
  BasicTextInput,
  Box,
  BufferedTextArea,
  ReasonOptionNodeType,
  RequisitionNodeApprovalStatus,
  Typography,
  UserStoreNodeFragment,
  useFormatNumber,
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
  manageVaccinesInDoses?: boolean;
  isReasonsError: boolean;
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
  isReasonsError,
  disabled = false,
  isUpdateMode = false,
  manageVaccinesInDoses = false,
}: ResponseLineEditProps) => {
  const t = useTranslation();
  const { data: reasonOptions, isLoading } = useReasonOptions();
  const { round } = useFormatNumber();

  const hasApproval =
    requisition.approvalStatus === RequisitionNodeApprovalStatus.Approved;
  const isPacksEnabled = !!currentItem?.defaultPackSize;
  const showContent = !!draft && !!currentItem;
  const displayVaccinesInDoses =
    manageVaccinesInDoses && currentItem?.isVaccine;
  const showExtraFields =
    store?.preferences?.extraFieldsInRequisition && !!requisition.program;
  const isDisabled = disabled || !!requisition.linkedRequisition;
  const disableItemSelection = disabled || isUpdateMode;
  const disableReasons =
    draft?.requestedQuantity === draft?.suggestedQuantity || disabled;

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
    showExtraFields,
    displayVaccinesInDoses,
    dosesPerUnit: currentItem?.doses ?? 1,
  });

  const getLeftPanelContent = () => {
    if (!showContent) return null;

    return (
      <>
        {isPacksEnabled && (
          <InfoRow
            label={t('label.default-pack-size')}
            value={round(currentItem?.defaultPackSize)}
          />
        )}
        {displayVaccinesInDoses && currentItem?.doses ? (
          <InfoRow
            label={t('label.doses-per-unit')}
            value={round(currentItem?.doses)}
          />
        ) : null}
        {showExtraFields && (
          <>
            {numericInput(
              'label.initial-stock-on-hand',
              draft?.initialStockOnHandUnits,
              {
                onChange: value => update({ initialStockOnHandUnits: value }),
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
            {numericInput('label.days-out-of-stock', draft?.daysOutOfStock, {
              onChange: value => update({ daysOutOfStock: value }),
              endAdornmentOverride: t('label.days'),
            })}
          </>
        )}
      </>
    );
  };

  const getMiddlePanelContent = () => {
    if (!showContent) return null;

    return (
      <>
        {isPacksEnabled && !showExtraFields && (
          <InfoRow
            label={t('label.default-pack-size')}
            value={round(currentItem?.defaultPackSize)}
          />
        )}
        {displayVaccinesInDoses && currentItem?.doses && !showExtraFields ? (
          <InfoRow
            label={t('label.doses-per-unit')}
            value={round(currentItem?.doses)}
          />
        ) : null}
        <Box
          sx={{
            background: theme => theme.palette.background.group,
            pt: 1,
            pb: 0.2,
            borderRadius: 2,
          }}
        >
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
          {numericInput('label.customer-soh', draft?.availableStockOnHand, {
            onChange: value => update({ availableStockOnHand: value }),
          })}
          {numericInput('label.our-soh', draft?.itemStats.stockOnHand, {
            disabledOverride: true,
          })}
          {numericInput('label.suggested', draft?.suggestedQuantity, {
            disabledOverride: true,
          })}
          {showExtraFields && (
            <Typography
              variant="body1"
              fontWeight="bold"
              sx={{ pl: 1, pb: 0.5 }}
              width={'calc(100% - 10px)'}
            >
              {t('label.reason')}:
              <ReasonOptionsSearchInput
                value={draft?.reason}
                onChange={value => {
                  update({ reason: value });
                }}
                type={ReasonOptionNodeType.RequisitionLineVariance}
                disabled={disableReasons}
                reasonOptions={reasonOptions?.nodes ?? []}
                loading={isLoading}
                inputProps={{
                  error: isReasonsError,
                }}
                textSx={
                  disableReasons
                    ? {
                        backgroundColor: theme =>
                          theme.palette.background.toolbar,
                        boxShadow: 'none',
                      }
                    : {
                        backgroundColor: theme =>
                          theme.palette.background.white,
                        boxShadow: theme => theme.shadows[2],
                      }
                }
              />
            </Typography>
          )}
        </Box>
        {showExtraFields && (
          <>
            {numericInput('label.available', available, {
              disabledOverride: true,
            })}
            {numericInput('label.short-expiry', draft?.expiringUnits, {
              onChange: value => update({ expiringUnits: value }),
            })}
          </>
        )}
      </>
    );
  };

  const getRightPanelContent = () => {
    if (!showContent) return null;

    return (
      <>
        <Box
          sx={{
            background: theme => theme.palette.background.group,
            borderRadius: 2,
            p: 1,
            pb: 0.5,
          }}
        >
          {hasApproval &&
            numericInput('label.approved', draft?.approvedQuantity, {
              disabledOverride: true,
              sx: {
                px: 0,
                mb: 0,
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
            displayVaccinesInDoses={displayVaccinesInDoses}
            dosesPerUnit={currentItem?.doses ?? 1}
          />
          {numericInput(
            'label.remaining-to-supply',
            draft?.remainingQuantityToSupply,
            {
              disabledOverride: true,
              sx: {
                px: 0,
              },
            }
          )}
          {numericInput('label.already-issued', draft?.alreadyIssued, {
            disabledOverride: true,
            sx: {
              px: 0,
            },
          })}
        </Box>
        {!!requisition.linkedRequisition || showExtraFields ? (
          <>
            {numericInput('label.amc/amd', draft?.averageMonthlyConsumption, {
              onChange: value => update({ averageMonthlyConsumption: value }),
              sx: {
                pt: 1,
              },
            })}
            {numericInput('label.months-of-stock', mos, {
              disabledOverride: true,
              endAdornmentOverride: t('label.months'),
              sx: {
                mb: 0,
              },
            })}
          </>
        ) : null}
        <Typography variant="body1" fontWeight="bold" p={1}>
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
          minRows={3}
          maxRows={3}
        />
      </>
    );
  };

  return (
    <ModalContentLayout
      showExtraFields={showExtraFields}
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
              onChange={(newItem: ItemWithStatsFragment | null) => {
                newItem && onChangeItem(newItem);
              }}
              extraFilter={item =>
                !lines.some(line => line.item.id === item.id)
              }
            />
          )}
        </>
      }
      Left={showExtraFields ? getLeftPanelContent() : getMiddlePanelContent()}
      Middle={
        showExtraFields ? getMiddlePanelContent() : getRightPanelContent()
      }
      Right={showExtraFields ? getRightPanelContent() : null}
    />
  );
};

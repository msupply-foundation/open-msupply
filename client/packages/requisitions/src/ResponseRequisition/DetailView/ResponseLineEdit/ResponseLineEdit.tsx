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
  ReasonOptionNodeType,
  RequisitionNodeApprovalStatus,
  Typography,
} from '@openmsupply-client/common';
import { ResponseFragment, ResponseLineFragment, useResponse } from '../../api';
import {
  InfoRow,
  InputRow,
  ModalContentLayout,
  RepresentationValue,
} from '../../../common';
import { SupplySelection } from './SuppliedSelection';

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
  const disableItemSelection = disabled || isUpdateMode;

  const line = useMemo(
    () => lines.find(line => line.id === draft?.id),
    [lines, draft?.id]
  );

  const unitName = currentItem?.unitName || t('label.unit');
  const defaultPackSize = currentItem?.defaultPackSize || 1;
  const originalItemName = useMemo(
    () => lines?.find(({ item }) => item.id === currentItem?.id)?.itemName,
    [lines, currentItem?.id]
  );

  const incomingStock =
    (draft?.incomingUnits ?? 0) + (draft?.additionInUnits ?? 0);
  const outgoingStock = (draft?.lossInUnits ?? 0) + (draft?.outgoingUnits ?? 0);
  const available =
    (draft?.initialStockOnHandUnits ?? 0) + incomingStock - outgoingStock;
  const MOS =
    draft?.averageMonthlyConsumption !== 0
      ? available / (draft?.averageMonthlyConsumption ?? 1)
      : 0;

  const isProgram = !!requisition?.program;
  const hasApproval =
    requisition.approvalStatus === RequisitionNodeApprovalStatus.Approved;

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
              {isProgram ? (
                <InputRow
                  label={t('label.initial-stock-on-hand')}
                  value={draft?.initialStockOnHandUnits ?? 0}
                  onChange={value => update({ initialStockOnHandUnits: value })}
                  disabled={!!requisition.linkedRequisition || disabled}
                  defaultPackSize={defaultPackSize}
                  representation={representation}
                  unitName={unitName}
                  autoFocus={true}
                />
              ) : (
                <InputRow
                  label={t('label.customer-soh')}
                  value={draft?.availableStockOnHand ?? 0}
                  onChange={value => update({ availableStockOnHand: value })}
                  disabled={!!requisition.linkedRequisition || disabled}
                  defaultPackSize={defaultPackSize}
                  representation={representation}
                  unitName={unitName}
                  autoFocus={true}
                />
              )}
              <InputRow
                label={t('label.available')}
                value={available}
                disabled={true}
                defaultPackSize={defaultPackSize}
                representation={representation}
                unitName={unitName}
              />
              <InputRow
                label={t('label.incoming')}
                value={draft?.incomingUnits ?? 0}
                onChange={value =>
                  update({
                    incomingUnits: value,
                  })
                }
                disabled={disabled}
                defaultPackSize={defaultPackSize}
                representation={representation}
                unitName={unitName}
              />
              <InputRow
                label={t('label.outgoing')}
                value={draft?.outgoingUnits ?? 0}
                onChange={value =>
                  update({
                    outgoingUnits: value,
                  })
                }
                disabled={disabled}
                defaultPackSize={defaultPackSize}
                representation={representation}
                unitName={unitName}
              />
              <InputRow
                label={t('label.losses')}
                value={draft?.lossInUnits ?? 0}
                onChange={value =>
                  update({
                    lossInUnits: value,
                  })
                }
                disabled={disabled}
                defaultPackSize={defaultPackSize}
                representation={representation}
                unitName={unitName}
              />
              <InputRow
                label={t('label.additions')}
                value={draft?.additionInUnits ?? 0}
                onChange={value =>
                  update({
                    additionInUnits: value,
                  })
                }
                disabled={disabled}
                defaultPackSize={defaultPackSize}
                representation={representation}
                unitName={unitName}
              />
              <InputRow
                label={t('label.days-out-of-stock')}
                value={draft?.daysOutOfStock ?? 0}
                onChange={value =>
                  update({
                    daysOutOfStock: value,
                  })
                }
                disabled={disabled}
                defaultPackSize={defaultPackSize}
                representation={representation}
                unitName={unitName}
              />
            </>
          ) : null
        }
        Middle={
          <>
            <InputRow
              label={t('label.amc/amd')}
              value={draft?.averageMonthlyConsumption ?? 0}
              onChange={value =>
                update({
                  averageMonthlyConsumption: value,
                })
              }
              disabled={!!requisition.linkedRequisition || disabled}
              defaultPackSize={defaultPackSize}
              representation={representation}
              unitName={unitName}
            />
            <InputRow
              label={t('label.months-of-stock')}
              value={MOS}
              disabled={true}
              defaultPackSize={defaultPackSize}
              representation={representation}
              unitName={unitName}
            />
            <Box
              sx={{
                background: theme => theme.palette.background.group,
                pt: 1,
                pb: 0.2,
                borderRadius: 2,
              }}
            >
              <InputRow
                label={t('label.our-soh')}
                value={data?.responseStoreStats.stockOnHand ?? 0}
                disabled={true}
                defaultPackSize={defaultPackSize}
                representation={representation}
                unitName={unitName}
              />
              <InputRow
                label={t('label.suggested')}
                value={draft?.suggestedQuantity ?? 0}
                disabled={true}
                defaultPackSize={defaultPackSize}
                representation={representation}
                unitName={unitName}
              />
              <InputRow
                label={t('label.requested')}
                value={draft?.requestedQuantity ?? 0}
                onChange={value =>
                  update({ requestedQuantity: value, reason: null })
                }
                disabled={disabled}
                defaultPackSize={defaultPackSize}
                representation={representation}
                unitName={unitName}
              />
            </Box>
            <InputRow
              label={t('label.short-expiry')}
              value={draft?.expiringUnits ?? 0}
              onChange={value =>
                update({
                  expiringUnits: value,
                })
              }
              disabled={disabled}
              defaultPackSize={defaultPackSize}
              representation={representation}
              unitName={unitName}
            />
          </>
        }
        Right={
          draft ? (
            <>
              <InputRow
                label={t('label.approved-quantity')}
                value={draft?.approvedQuantity ?? 0}
                disabled={true}
                defaultPackSize={defaultPackSize}
                representation={representation}
                unitName={unitName}
                sx={{
                  pt: 1,
                  pl: 0,
                }}
              />
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
              <InputRow
                label={t('label.remaining-to-supply')}
                value={Math.max(
                  (draft?.supplyQuantity ?? 0) - (draft?.alreadyIssued ?? 0),
                  0
                )}
                disabled={true}
                defaultPackSize={defaultPackSize}
                representation={representation}
                unitName={unitName}
                sx={{
                  pl: 0,
                }}
              />
              <InputRow
                label={t('label.already-issued')}
                value={draft?.alreadyIssued ?? 0}
                disabled={true}
                defaultPackSize={defaultPackSize}
                representation={representation}
                unitName={unitName}
                sx={{
                  pl: 0,
                }}
              />
              {showExtraFields && (
                <Typography variant="body1" fontWeight="bold" paddingBottom={0}>
                  {t('label.reason')}:
                  <ReasonOptionsSearchInput
                    value={draft?.reason}
                    onChange={value => {
                      update({ reason: value });
                    }}
                    width={360}
                    type={ReasonOptionNodeType.RequisitionLineVariance}
                    isDisabled={
                      draft?.requestedQuantity === draft?.suggestedQuantity ||
                      disabled
                    }
                    reasonOptions={reasonOptions?.nodes ?? []}
                    isLoading={isLoading}
                  />
                </Typography>
              )}
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

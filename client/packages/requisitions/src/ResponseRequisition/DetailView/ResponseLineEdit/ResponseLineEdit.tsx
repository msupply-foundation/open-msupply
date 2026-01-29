import React, { useMemo } from 'react';
import {
  useTranslation,
  BasicTextInput,
  ReasonOptionNodeType,
  RequisitionNodeApprovalStatus,
  Typography,
  UserStoreNodeFragment,
  ModalGridLayout,
  usePreferences,
  Alert,
  ModalPanelArea,
  MultilineTextInput,
  InfoRow,
  RepresentationValue,
} from '@openmsupply-client/common';
import {
  ItemWithStatsFragment,
  ReasonOptionsSearchInput,
  StockItemSearchInputWithStats,
} from '@openmsupply-client/system';
import { ResponseFragment, ResponseLineFragment } from '../../api';
import { DraftResponseLine } from './hooks';
import { SupplySelection } from './SuppliedSelection';
import { useStockCalculations } from './utils';
import { ResponseNumInputRow } from './ResponseNumInputRow';

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
  isReasonsError: boolean;
  setIsEditingSupply: (isEditingSupply: boolean) => void;
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
  setIsEditingSupply,
}: ResponseLineEditProps) => {
  const t = useTranslation();
  const { manageVaccinesInDoses, warningForExcessRequest } = usePreferences();

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

  const commonProps = {
    defaultPackSize,
    representation,
    unitName,
    disabled: isDisabled,
    showExtraFields,
    displayVaccinesInDoses,
    dosesPerUnit: currentItem?.doses ?? 1,
    showEndAdornment: true,
  };

  const getLeftPanelContent = () => {
    if (!showContent) return null;

    return (
      <>
        {isPacksEnabled && (
          <InfoRow
            label={t('label.default-pack-size')}
            value={currentItem?.defaultPackSize}
          />
        )}
        {displayVaccinesInDoses && currentItem?.doses ? (
          <InfoRow
            label={t('label.doses-per-unit')}
            value={currentItem?.doses}
          />
        ) : null}
        {showExtraFields && (
          <>
            <ResponseNumInputRow
              label={t('label.initial-stock-on-hand')}
              value={draft?.initialStockOnHandUnits}
              onChange={value => update({ initialStockOnHandUnits: value })}
              {...commonProps}
            />
            <ResponseNumInputRow
              label={t('label.incoming')}
              value={draft?.incomingUnits}
              onChange={value => update({ incomingUnits: value })}
              {...commonProps}
            />
            <ResponseNumInputRow
              label={t('label.outgoing')}
              value={draft?.outgoingUnits}
              onChange={value => update({ outgoingUnits: value })}
              {...commonProps}
            />
            <ResponseNumInputRow
              label={t('label.losses')}
              value={draft?.lossInUnits}
              onChange={value => update({ lossInUnits: value })}
              {...commonProps}
            />
            <ResponseNumInputRow
              label={t('label.additions')}
              value={draft?.additionInUnits}
              onChange={value => update({ additionInUnits: value })}
              {...commonProps}
            />
            <ResponseNumInputRow
              label={t('label.days-out-of-stock')}
              value={draft?.daysOutOfStock}
              onChange={value => update({ daysOutOfStock: value })}
              endAdornmentOverride={t('label.days')}
              overrideDoseDisplay={false}
              {...commonProps}
            />
          </>
        )}
      </>
    );
  };

  const getMiddlePanelContent = () => {
    if (!showContent) return null;

    const showExcessRequestWarning =
      warningForExcessRequest &&
      (draft?.requestedQuantity ?? 0) - (draft?.suggestedQuantity ?? 0) >= 1;

    return (
      <>
        {isPacksEnabled && !showExtraFields && (
          <InfoRow
            label={t('label.default-pack-size')}
            value={currentItem?.defaultPackSize}
          />
        )}
        {displayVaccinesInDoses && currentItem?.doses && !showExtraFields ? (
          <InfoRow
            label={t('label.doses-per-unit')}
            value={currentItem?.doses}
          />
        ) : null}
        <ModalPanelArea>
          <ResponseNumInputRow
            label={t('label.requested')}
            value={draft?.requestedQuantity}
            onChange={value => {
              draft?.suggestedQuantity === value
                ? update({
                    requestedQuantity: value,
                    reason: null,
                  })
                : update({ requestedQuantity: value });
            }}
            {...commonProps}
          />
          <ResponseNumInputRow
            label={t('label.customer-soh')}
            value={draft?.availableStockOnHand}
            onChange={value => update({ availableStockOnHand: value })}
            {...commonProps}
          />
          <ResponseNumInputRow
            label={t('label.our-soh')}
            value={draft?.itemStats.stockOnHand}
            disabledOverride={true}
            {...commonProps}
          />
          <ResponseNumInputRow
            label={t('label.suggested')}
            value={draft?.suggestedQuantity}
            disabledOverride={true}
            roundUp={true}
            {...commonProps}
          />
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
        </ModalPanelArea>
        {showExcessRequestWarning && (
          <Alert sx={{ mt: 1 }} severity="warning">
            {t('messages.requested-exceeds-suggested')}
          </Alert>
        )}
        {showExtraFields && (
          <>
            <ResponseNumInputRow
              label={t('label.available')}
              value={available}
              disabledOverride={true}
              {...commonProps}
            />
            <ResponseNumInputRow
              label={t('label.short-expiry')}
              value={draft?.expiringUnits}
              onChange={value => update({ expiringUnits: value })}
              {...commonProps}
            />
          </>
        )}
      </>
    );
  };

  const getRightPanelContent = () => {
    if (!showContent) return null;

    return (
      <>
        <ModalPanelArea>
          {hasApproval && (
            <ResponseNumInputRow
              label={t('label.approved')}
              value={draft?.approvedQuantity}
              disabledOverride={true}
              sx={{
                px: 0,
                mb: 0,
              }}
              {...commonProps}
            />
          )}
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
            setIsEditingSupply={setIsEditingSupply}
          />

          <ResponseNumInputRow
            label={t('label.remaining-to-supply')}
            value={draft?.remainingQuantityToSupply}
            disabledOverride={true}
            sx={{
              px: 0,
            }}
            {...commonProps}
          />

          <ResponseNumInputRow
            label={t('label.already-issued')}
            value={draft?.alreadyIssued}
            disabledOverride={true}
            sx={{
              px: 0,
            }}
            {...commonProps}
          />
        </ModalPanelArea>
        {!!requisition.linkedRequisition || showExtraFields ? (
          <>
            <ResponseNumInputRow
              label={t('label.amc/amd')}
              value={draft?.averageMonthlyConsumption}
              onChange={value => update({ averageMonthlyConsumption: value })}
              sx={{
                pt: 1,
              }}
              {...commonProps}
            />
            <ResponseNumInputRow
              label={t('label.months-of-stock')}
              value={mos() ?? 0}
              disabledOverride={true}
              endAdornmentOverride={t('label.months')}
              sx={{
                mb: 0,
              }}
              {...commonProps}
            />
          </>
        ) : null}

        <MultilineTextInput
          label={t('label.comment')}
          value={draft?.comment ?? ''}
          onChange={(value?: string) => update({ comment: value })}
          disabled={disabled}
        />
      </>
    );
  };

  return (
    <ModalGridLayout
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
              filter={{
                id: { notEqualAll: lines.map(line => line.itemId) },
                isVisibleOrOnHand: true,
              }}
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

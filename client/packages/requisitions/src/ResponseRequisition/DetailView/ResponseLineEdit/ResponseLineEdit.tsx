import React, { useMemo } from 'react';
import {
  useTranslation,
  BasicTextInput,
  BufferedTextArea,
  ReasonOptionNodeType,
  RequisitionNodeApprovalStatus,
  Typography,
  UserStoreNodeFragment,
  ModalGridLayout,
  usePreferences,
  ModalPanelArea,
  NumInputRow,
} from '@openmsupply-client/common';
import {
  ItemWithStatsFragment,
  ReasonOptionsSearchInput,
  StockItemSearchInputWithStats,
} from '@openmsupply-client/system';
import { ResponseFragment, ResponseLineFragment } from '../../api';
import { InfoRow, RepresentationValue } from '../../../common';
import { DraftResponseLine } from './hooks';
import { SupplySelection } from './SuppliedSelection';
import { useStockCalculations } from './utils';

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
  const { manageVaccinesInDoses } = usePreferences();

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
            <NumInputRow
              label={t('label.initial-stock-on-hand')}
              value={draft?.initialStockOnHandUnits}
              onChange={value => update({ initialStockOnHandUnits: value })}
              {...commonProps}
            />
            <NumInputRow
              label={t('label.incoming')}
              value={draft?.incomingUnits}
              onChange={value => update({ incomingUnits: value })}
              {...commonProps}
            />
            <NumInputRow
              label={t('label.outgoing')}
              value={draft?.outgoingUnits}
              onChange={value => update({ outgoingUnits: value })}
              {...commonProps}
            />
            <NumInputRow
              label={t('label.losses')}
              value={draft?.lossInUnits}
              onChange={value => update({ lossInUnits: value })}
              {...commonProps}
            />
            <NumInputRow
              label={t('label.additions')}
              value={draft?.additionInUnits}
              onChange={value => update({ additionInUnits: value })}
              {...commonProps}
            />
            <NumInputRow
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
          <NumInputRow
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
          <NumInputRow
            label={t('label.customer-soh')}
            value={draft?.availableStockOnHand}
            onChange={value => update({ availableStockOnHand: value })}
            {...commonProps}
          />
          <NumInputRow
            label={t('label.our-soh')}
            value={draft?.itemStats.stockOnHand}
            disabledOverride={true}
            {...commonProps}
          />
          <NumInputRow
            label={t('label.suggested')}
            value={draft?.suggestedQuantity}
            disabledOverride={true}
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
        {showExtraFields && (
          <>
            <NumInputRow
              label={t('label.available')}
              value={available}
              disabledOverride={true}
              {...commonProps}
            />
            <NumInputRow
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
            <NumInputRow
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

          <NumInputRow
            label={t('label.remaining-to-supply')}
            value={draft?.remainingQuantityToSupply}
            disabledOverride={true}
            sx={{
              px: 0,
            }}
            {...commonProps}
          />

          <NumInputRow
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
            <NumInputRow
              label={t('label.amc/amd')}
              value={draft?.averageMonthlyConsumption}
              onChange={value => update({ averageMonthlyConsumption: value })}
              sx={{
                pt: 1,
              }}
              {...commonProps}
            />
            <NumInputRow
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

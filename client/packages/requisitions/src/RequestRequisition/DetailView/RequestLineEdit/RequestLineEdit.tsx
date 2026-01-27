import React, { useCallback, useMemo } from 'react';
import {
  ItemWithStatsFragment,
  ReasonOptionsSearchInput,
  RequestFragment,
  StockItemSearchInputWithStats,
} from '@openmsupply-client/system';
import {
  useTranslation,
  BasicTextInput,
  Box,
  ReasonOptionNodeType,
  usePluginProvider,
  Typography,
  ModalGridLayout,
  usePreferences,
  Alert,
  ModalPanelArea,
  MultilineTextInput,
  InfoRow,
  ValueInfoRow,
  ValueInfo,
  RepresentationValue,
} from '@openmsupply-client/common';
import { DraftRequestLine } from './hooks';
import { RequestLineFragment } from '../../api';
import { RequestedSelection } from './RequestedSelection';
import { ConsumptionHistory } from './ItemCharts/ConsumptionHistory';
import { StockEvolution } from './ItemCharts/StockEvolution';
import { StockDistribution } from './ItemCharts/StockDistribution';
import {
  getLeftPanel,
  getExtraMiddlePanels,
  getSuggestedRow,
} from './ModalContentPanels';

interface RequestLineEditProps {
  requisition: RequestFragment;
  lines: RequestLineFragment[];
  currentItem?: ItemWithStatsFragment;
  onChangeItem: (item: ItemWithStatsFragment) => void;
  draft?: DraftRequestLine | null;
  update: (patch: Partial<DraftRequestLine>) => void;
  isPacksEnabled: boolean;
  representation: RepresentationValue;
  setRepresentation: (type: RepresentationValue) => void;
  disabled?: boolean;
  isUpdateMode?: boolean;
  showExtraFields?: boolean;
  isReasonsError: boolean;
  setIsEditingRequested: (isEditingRequested: boolean) => void;
  roundUp?: boolean;
}

export const RequestLineEdit = ({
  requisition,
  lines,
  draft,
  currentItem,
  onChangeItem,
  update,
  isPacksEnabled,
  representation,
  setRepresentation,
  disabled,
  isUpdateMode,
  showExtraFields,
  isReasonsError,
  setIsEditingRequested,
  roundUp,
}: RequestLineEditProps) => {
  const t = useTranslation();
  const { plugins } = usePluginProvider();
  const { manageVaccinesInDoses, warningForExcessRequest } = usePreferences();

  const unitName = currentItem?.unitName || t('label.unit');
  const defaultPackSize = currentItem?.defaultPackSize || 1;

  const showContent = !!draft && !!currentItem;
  const displayVaccinesInDoses =
    manageVaccinesInDoses && currentItem?.isVaccine;
  const disableItemSelection = disabled || isUpdateMode;
  const disableReasons =
    draft?.requestedQuantity === draft?.suggestedQuantity || disabled;

  const line = useMemo(
    () => lines.find(line => line.id === draft?.id),
    [lines, draft?.id]
  );
  const originalItemName = useMemo(
    () => lines?.find(({ item }) => item.id === currentItem?.id)?.itemName,
    [lines, currentItem?.id]
  );

  const renderValueInfoRows = useCallback(
    (info: ValueInfo[]) => (
      <>
        {info.map(
          ({
            label,
            value,
            sx,
            endAdornmentOverride,
            displayVaccinesInDoses: showDoses,
            roundUp,
          }) => (
            <ValueInfoRow
              key={label}
              label={label}
              value={value}
              endAdornmentOverride={endAdornmentOverride}
              defaultPackSize={defaultPackSize}
              representation={representation}
              unitName={unitName}
              sx={sx}
              displayVaccinesInDoses={showDoses ?? displayVaccinesInDoses}
              dosesPerUnit={currentItem?.doses}
              decimalLimit={0}
              roundUp={roundUp}
            />
          )
        )}
      </>
    ),
    [
      defaultPackSize,
      representation,
      unitName,
      displayVaccinesInDoses,
      currentItem?.doses,
    ]
  );

  const getMiddlePanelContent = () => {
    if (!showContent) return null;

    return renderValueInfoRows(getExtraMiddlePanels(t, draft));
  };

  const getRightPanelContent = () => {
    if (!showContent) return null;

    const showExcessRequestWarning =
      warningForExcessRequest &&
      draft.requestedQuantity - draft.suggestedQuantity >= 1;

    return (
      <>
        <ModalPanelArea>
          {!showExtraFields && renderValueInfoRows(getSuggestedRow(t, draft))}
          <RequestedSelection
            disabled={disabled}
            defaultPackSize={defaultPackSize}
            isPacksEnabled={isPacksEnabled}
            draft={draft}
            update={update}
            representation={representation}
            setRepresentation={setRepresentation}
            unitName={unitName}
            displayVaccinesInDoses={displayVaccinesInDoses}
            dosesPerUnit={currentItem?.doses}
            setIsEditingRequested={setIsEditingRequested}
          />
          {showExcessRequestWarning && (
            <Alert severity="warning" sx={{ mt: 1 }}>
              {t('warning.requested-exceeds-suggested')}
            </Alert>
          )}
          {showExtraFields && (
            <Typography variant="body1" fontWeight="bold">
              {t('label.reason')}:
              <ReasonOptionsSearchInput
                value={draft?.reason}
                onChange={value => {
                  update({ reason: value });
                }}
                fullWidth
                type={ReasonOptionNodeType.RequisitionLineVariance}
                disabled={disableReasons}
                textSx={
                  disableReasons
                    ? {
                        backgroundColor: theme =>
                          theme.palette.background.toolbar,
                      }
                    : {
                        backgroundColor: theme =>
                          theme.palette.background.white,
                      }
                }
                inputProps={{
                  error: isReasonsError,
                }}
              />
            </Typography>
          )}
          <MultilineTextInput
            label={t('label.comment')}
            value={draft?.comment ?? ''}
            onChange={(value?: string) => update({ comment: value })}
            disabled={disabled}
          />
        </ModalPanelArea>
      </>
    );
  };

  return (
    <>
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
                onChange={(newItem: ItemWithStatsFragment | null) =>
                  newItem && onChangeItem(newItem)
                }
                filter={{
                  id: { notEqualAll: lines.map(line => line.item.id) },
                }}
              />
            )}
          </>
        }
        Left={
          showContent ? (
            <>
              {currentItem?.unitName && (
                <InfoRow label={t('label.unit')} value={unitName} />
              )}
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
              {renderValueInfoRows(getLeftPanel(t, draft, showExtraFields))}
              {line &&
                plugins.requestRequisitionLine?.editViewField?.map(
                  (Field, index) => (
                    <Field
                      key={index}
                      line={line}
                      draft={draft}
                      unitName={unitName}
                    />
                  )
                )}
            </>
          ) : null
        }
        Middle={
          showExtraFields ? getMiddlePanelContent() : getRightPanelContent()
        }
        Right={showExtraFields ? getRightPanelContent() : null}
      />

      {line &&
        plugins.requestRequisitionLine?.editViewInfo?.map((Info, index) => (
          <Info key={index} line={line} requisition={requisition} />
        ))}

      {showContent && line && (
        <Box
          sx={{
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          }}
        >
          <Box
            sx={{
              width: '100%',
              maxWidth: 900,
              mx: 'auto',
              p: '8px 16px',
            }}
          >
            <StockDistribution
              availableStockOnHand={line.itemStats?.availableStockOnHand}
              averageMonthlyConsumption={
                line.itemStats?.averageMonthlyConsumption
              }
              suggestedQuantity={line.suggestedQuantity}
            />
          </Box>
          <Box
            display="flex"
            justifyContent="center"
            gap={2}
            sx={{
              padding: 2,
              flexDirection: {
                xs: 'column',
                md: 'row',
              },
              alignItems: 'center',
            }}
          >
            <ConsumptionHistory id={line.id} />
            <StockEvolution id={line.id} />
          </Box>
        </Box>
      )}
    </>
  );
};

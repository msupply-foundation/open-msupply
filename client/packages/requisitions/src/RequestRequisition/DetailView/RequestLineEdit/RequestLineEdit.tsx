import React, { useCallback, useMemo } from 'react';
import {
  ItemWithAvailableStockFragment,
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
  RepresentationValue,
} from '@openmsupply-client/common';
import { DraftRequestLine } from './hooks';
import { RequestLineFragment } from '../../api';
import { RequestedSelection } from './RequestedSelection';
import { ConsumptionHistory } from './ItemCharts/ConsumptionHistory';
import { StockEvolution } from './ItemCharts/StockEvolution';
import { StockDistribution } from './ItemCharts/StockDistribution';
import {
  CONSUMPTION_HISTORY_INFO,
  FORECAST_QUANTITY_INFO,
  STOCK_DISTRIBUTION_INFO,
  STOCK_EVOLUTION_INFO,
} from '../utils';
import ForecastCalculationDisplay from '../../../common/ForecastCalculationDisplay';
import ForecastMethodPicker from '../../../common/ForecastMethodPicker';

interface RequestLineEditProps {
  requisition: RequestFragment;
  lines: RequestLineFragment[];
  currentItem?: ItemWithAvailableStockFragment;
  onChangeItem: (item: ItemWithStatsFragment) => void;
  draft?: DraftRequestLine | null;
  update: (patch: Partial<DraftRequestLine>) => void;
  save: (overrides?: Partial<DraftRequestLine>) => Promise<unknown>;
  isPacksEnabled: boolean;
  representation: RepresentationValue;
  setRepresentation: (type: RepresentationValue) => void;
  disabled?: boolean;
  isUpdateMode?: boolean;
  showExtraFields?: boolean;
  isReasonsError: boolean;
  setIsEditingRequested: (isEditingRequested: boolean) => void;
}

export const RequestLineEdit = ({
  requisition,
  lines,
  draft,
  currentItem,
  onChangeItem,
  update,
  save,
  isPacksEnabled,
  representation,
  setRepresentation,
  disabled,
  isUpdateMode,
  showExtraFields,
  isReasonsError,
  setIsEditingRequested,
}: RequestLineEditProps) => {
  const t = useTranslation();
  const { plugins } = usePluginProvider();
  const { manageVaccinesInDoses, warningForExcessRequest } = usePreferences();

  const isInfoVisible = useCallback(
    (infoType: string) =>
      !plugins.requestRequisitionLine?.hideInfo?.includes(infoType),
    [plugins.requestRequisitionLine?.hideInfo]
  );

  const unitName = currentItem?.unitName || t('label.unit');
  const defaultPackSize = currentItem?.defaultPackSize || 1;

  const showContent = !!draft && !!currentItem;
  const isDosesEnabled =
    !!manageVaccinesInDoses && !!currentItem?.isVaccine && !!currentItem?.doses;
  const disableItemSelection = disabled || isUpdateMode;
  const disableReasons =
    draft?.requestedQuantity === draft?.suggestedQuantity || disabled;
  // Forecasting UI is shown for any line that has gone through forecast
  // dispatch (i.e. has a method tag) — independent of the legacy population
  // preference and independent of whether the rate happens to be 0.
  const displayForecasting = !!draft?.forecastMethod;

  const line = useMemo(
    () => lines.find(line => line.id === draft?.id),
    [lines, draft?.id]
  );
  const originalItemName = useMemo(
    () => lines?.find(({ item }) => item.id === currentItem?.id)?.itemName,
    [lines, currentItem?.id]
  );

  // Common formatting props shared by every numeric stat row in the modal.
  // Spread directly onto each `<ValueInfoRow>` instead of going through an
  // array-of-objects + render-callback intermediate.
  const valueRowProps = {
    defaultPackSize,
    representation,
    unitName,
    isDosesEnabled,
    dosesPerUnit: currentItem?.doses,
    decimalLimit: 0,
    isFixedValue: false,
  };

  const showExcessRequestWarning =
    warningForExcessRequest &&
    !!draft &&
    draft.requestedQuantity - draft.suggestedQuantity >= 1;

  const middleStatRows = !showContent || !draft ? null : (
    <>
      <ValueInfoRow
        {...valueRowProps}
        label={t('label.suggested')}
        value={draft.suggestedQuantity}
        sx={{
          background: theme => theme.palette.background.group.dark,
          pt: 0.5,
          pb: 0.5,
        }}
        roundUp
      />
      <ValueInfoRow
        {...valueRowProps}
        label={t('label.incoming-stock')}
        value={draft.incomingUnits}
      />
      <ValueInfoRow
        {...valueRowProps}
        label={t('label.outgoing')}
        value={draft.outgoingUnits}
      />
      <ValueInfoRow
        {...valueRowProps}
        label={t('label.losses')}
        value={draft.lossInUnits}
      />
      <ValueInfoRow
        {...valueRowProps}
        label={t('label.additions')}
        value={draft.additionInUnits}
      />
      <ValueInfoRow
        {...valueRowProps}
        label={t('label.days-out-of-stock')}
        value={draft.daysOutOfStock}
        endAdornmentOverride={t('label.days')}
        isFixedValue
      />
    </>
  );

  const rightPanelContent = !showContent || !draft ? null : (
    <ModalPanelArea>
      {!showExtraFields && (
        <ValueInfoRow
          {...valueRowProps}
          label={t('label.suggested')}
          value={draft.suggestedQuantity}
          sx={{ pl: 0, pt: 0.5 }}
          roundUp
        />
      )}
      <RequestedSelection
        disabled={disabled}
        defaultPackSize={defaultPackSize}
        isPacksEnabled={isPacksEnabled}
        draft={draft}
        update={update}
        representation={representation}
        setRepresentation={setRepresentation}
        unitName={unitName}
        isDosesEnabled={isDosesEnabled}
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
            value={draft.reason}
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
                    backgroundColor: theme => theme.palette.background.white,
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
        value={draft.comment ?? ''}
        onChange={(value?: string) => update({ comment: value })}
        disabled={disabled}
      />
    </ModalPanelArea>
  );

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
              {isDosesEnabled && currentItem?.doses ? (
                <InfoRow
                  label={t('label.doses-per-unit')}
                  value={currentItem?.doses}
                />
              ) : null}
              <ValueInfoRow
                {...valueRowProps}
                label={t('label.our-soh')}
                value={draft?.itemStats.availableStockOnHand}
              />
              <ValueInfoRow
                {...valueRowProps}
                label={t(showExtraFields ? 'label.area-amc' : 'label.amc/amd')}
                value={draft?.itemStats.averageMonthlyConsumption}
              />
              <InfoRow
                label={t('label.months-of-stock')}
                value={draft?.itemStats?.availableMonthsOfStockOnHand}
                packagingDisplay={t('label.months')}
              />
              {displayForecasting && line && (
                <ForecastMethodPicker
                  options={line.applicableForecastMethods ?? []}
                  value={draft?.forecastMethod ?? line.forecastMethod}
                  onChange={code => {
                    update({ forecastMethod: code });
                    save({ forecastMethod: code });
                  }}
                  disabled={disabled}
                />
              )}
              {displayForecasting && (
                <ValueInfoRow
                  {...valueRowProps}
                  label={t('label.forecast-monthly-usage')}
                  value={line?.forecastMonthlyUsage}
                  decimalLimit={2}
                />
              )}
              {showExtraFields && (
                <ValueInfoRow
                  {...valueRowProps}
                  label={t('label.short-expiry')}
                  value={draft?.expiringUnits}
                />
              )}
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
        Middle={showExtraFields ? middleStatRows : rightPanelContent}
        Right={showExtraFields ? rightPanelContent : null}
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
            mt: 3,
          }}
        >
          {displayForecasting && isInfoVisible(FORECAST_QUANTITY_INFO) && (
            <ForecastCalculationDisplay
              forecastData={line.forecastData}
              unitName={currentItem?.unitName}
            />
          )}
          {/* Stock distribution chart is AMC-framed (target = max_months ×
              AMC, monthly columns, min/max thresholds). Population and
              AncillaryRatio target stock comes from a different formula
              entirely, so the chart would mislead — hide it for those
              methods. `null` is the legacy/implicit AMC fallback. */}
          {isInfoVisible(STOCK_DISTRIBUTION_INFO) &&
            (line.forecastMethod === 'amc' || line.forecastMethod == null) && (
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
            )}
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
            {isInfoVisible(CONSUMPTION_HISTORY_INFO) && (
              <ConsumptionHistory id={line.id} />
            )}
            {isInfoVisible(STOCK_EVOLUTION_INFO) && (
              <StockEvolution id={line.id} />
            )}
          </Box>
        </Box>
      )}
    </>
  );
};

import React, { useCallback, useMemo } from 'react';
import {
  ItemWithStatsFragment,
  ReasonOptionsSearchInput,
  RequestFragment,
  StockItemSearchInputWithStats,
  useReasonOptions,
} from '@openmsupply-client/system';
import {
  useTranslation,
  BasicTextInput,
  Box,
  ReasonOptionNodeType,
  usePluginProvider,
  Typography,
  BufferedTextArea,
  useFormatNumber,
} from '@openmsupply-client/common';
import { DraftRequestLine } from './hooks';
import { RequestLineFragment } from '../../api';
import { RequestedSelection } from './RequestedSelection';
import { RepresentationValue } from '../../../common';
import { ConsumptionHistory } from './ItemCharts/ConsumptionHistory';
import { StockEvolution } from './ItemCharts/StockEvolution';
import { StockDistribution } from './ItemCharts/StockDistribution';
import {
  InfoRow,
  ModalContentLayout,
  ValueInfoRow,
  ValueInfo,
} from '../../../common';
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
  manageVaccinesInDoses?: boolean;
  isReasonsError: boolean;
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
  manageVaccinesInDoses = false,
  isReasonsError,
}: RequestLineEditProps) => {
  const t = useTranslation();
  const { plugins } = usePluginProvider();
  const { round } = useFormatNumber();
  const { data: reasonOptions, isLoading } = useReasonOptions();
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
        {info.map(({ label, value, sx, endAdornmentOverride }) => (
          <ValueInfoRow
            key={label}
            label={label}
            value={value}
            endAdornmentOverride={endAdornmentOverride}
            defaultPackSize={defaultPackSize}
            representation={representation}
            unitName={unitName}
            sx={sx}
            displayVaccinesInDoses={displayVaccinesInDoses}
            dosesPerUnit={currentItem?.doses}
          />
        ))}
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

    return (
      <>
        <Box
          sx={{
            background: theme => theme.palette.background.group,
            padding: '0px 8px',
            borderRadius: 2,
            pb: 1,
          }}
        >
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
          />
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
                reasonOptions={reasonOptions?.nodes ?? []}
                loading={isLoading}
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
          <Typography variant="body1" fontWeight="bold" pb={0.5}>
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
            minRows={3}
            maxRows={3}
          />
        </Box>
      </>
    );
  };

  return (
    <>
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
          showContent ? (
            <>
              {currentItem?.unitName && (
                <InfoRow label={t('label.unit')} value={unitName} />
              )}
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
              {renderValueInfoRows(getLeftPanel(t, draft, showExtraFields))}
              {line &&
                plugins.requestRequisitionLine?.editViewField?.map(
                  (Field, index) => (
                    <Field key={index} line={line} unitName={unitName} />
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

      {line && (
        <Box padding={'2px 16px 0 16px'}>
          {plugins.requestRequisitionLine?.editViewInfo?.map((Info, index) => (
            <Info key={index} line={line} requisition={requisition} />
          ))}
        </Box>
      )}

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

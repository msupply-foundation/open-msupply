import React, { useMemo } from 'react';
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
  useWindowDimensions,
  Typography,
  BufferedTextArea,
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
import { getLeftPanel, getMiddlePanel } from './ModalContentPanels';

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
}: RequestLineEditProps) => {
  const t = useTranslation();
  const { plugins } = usePluginProvider();
  const { width } = useWindowDimensions();
  const unitName = currentItem?.unitName || t('label.unit');
  const defaultPackSize = currentItem?.defaultPackSize || 1;
  const disableItemSelection = disabled || isUpdateMode;
  const disableReasons =
    draft?.requestedQuantity === draft?.suggestedQuantity || disabled;
  const { data: reasonOptions, isLoading } = useReasonOptions();

  const line = useMemo(
    () => lines.find(line => line.id === draft?.id),
    [lines, draft?.id]
  );
  const originalItemName = useMemo(
    () => lines?.find(({ item }) => item.id === currentItem?.id)?.itemName,
    [lines, currentItem?.id]
  );

  const renderValueInfoRows = useMemo(() => {
    return (info: ValueInfo[]) => (
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
          />
        ))}
      </>
    );
  }, [defaultPackSize, representation, unitName]);

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
              {renderValueInfoRows(getLeftPanel(t, draft, showExtraFields))}
            </>
          ) : null
        }
        Middle={
          draft ? (
            <>
              {renderValueInfoRows(getMiddlePanel(t, draft, showExtraFields))}
            </>
          ) : null
        }
        Right={
          draft ? (
            <>
              <Box
                sx={{
                  background: theme => theme.palette.background.group,
                  padding: '0px 8px',
                  borderRadius: 2,
                  paddingBottom: 1,
                }}
              >
                <RequestedSelection
                  disabled={disabled}
                  defaultPackSize={defaultPackSize}
                  isPacksEnabled={isPacksEnabled}
                  draft={draft}
                  update={update}
                  representation={representation}
                  setRepresentation={setRepresentation}
                  unitName={unitName}
                />
                {showExtraFields && (
                  <Typography variant="body1" fontWeight="bold">
                    {t('label.reason')}:
                    <ReasonOptionsSearchInput
                      value={draft?.reason}
                      onChange={value => {
                        update({ reason: value });
                      }}
                      width={360}
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
              </Box>
            </>
          ) : null
        }
      />
      <Box paddingTop={1} maxHeight={200} width={width * 0.48} display="flex">
        {line &&
          plugins.requestRequisitionLine?.editViewField?.map((Field, index) => (
            <Field key={index} line={line} />
          ))}
      </Box>

      {!!draft && (
        <Box
          display="flex"
          flexDirection="column"
          justifySelf="center"
          width={900}
        >
          <StockDistribution
            availableStockOnHand={draft?.itemStats?.availableStockOnHand}
            averageMonthlyConsumption={
              draft?.itemStats?.averageMonthlyConsumption
            }
            suggestedQuantity={draft?.suggestedQuantity}
          />
        </Box>
      )}

      {line && (
        <Box>
          <Box padding={'2px 16px 0 16px'}>
            {plugins.requestRequisitionLine?.editViewInfo?.map(
              (Info, index) => (
                <Info key={index} line={line} requisition={requisition} />
              )
            )}
          </Box>
          <Box display="flex" sx={{ padding: 2 }} justifyContent="center">
            <ConsumptionHistory id={line.id} />
            <StockEvolution id={line.id} />
          </Box>
        </Box>
      )}
    </>
  );
};

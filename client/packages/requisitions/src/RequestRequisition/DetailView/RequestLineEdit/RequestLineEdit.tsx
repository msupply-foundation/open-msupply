import React, { useMemo } from 'react';
import {
  ItemWithPackSizeFragment,
  ItemWithStatsFragment,
  ReasonOptionsSearchInput,
  RequestFragment,
  StockItemSearchInputWithStats,
} from '@openmsupply-client/system';
import {
  useFormatNumber,
  useTranslation,
  BasicTextInput,
  Box,
  InputWithLabelRow,
  ReasonOptionNodeType,
  usePluginProvider,
  useWindowDimensions,
  Typography,
  BufferedTextArea,
} from '@openmsupply-client/common';
import { DraftRequestLine } from './hooks';
import { RequestLineFragment } from '../../api';
import {
  InfoRow,
  RequestLineEditFormLayout,
} from './RequestLineEditFormLayout';
import { Order } from './Order';
import { getValueInUnitsOrPacks, PackageTypeValue } from './utils';

interface RequestLineEditProps {
  requisition: RequestFragment;
  lines: RequestLineFragment[];
  currentItem?: ItemWithPackSizeFragment | null;
  setCurrentItem: (item: ItemWithStatsFragment) => void;
  draft?: DraftRequestLine | null;
  update: (patch: Partial<DraftRequestLine>) => void;
  isPacksEnabled: boolean;
  packageType: PackageTypeValue;
  setPackageType: (type: PackageTypeValue) => void;
  disabled?: boolean;
  isProgram?: boolean;
  useConsumptionData?: boolean;
}

export const RequestLineEdit = ({
  requisition,
  lines,
  draft,
  currentItem,
  setCurrentItem,
  update,
  isPacksEnabled,
  packageType,
  setPackageType,
  disabled,
  isProgram,
  useConsumptionData,
}: RequestLineEditProps) => {
  const t = useTranslation();
  const { round } = useFormatNumber();
  const { plugins } = usePluginProvider();
  const { width } = useWindowDimensions();
  const unitName = currentItem?.unitName || t('label.unit');
  const defaultPackSize = currentItem?.defaultPackSize || 1;
  const showExtraFields = useConsumptionData && isProgram;

  const line = useMemo(
    () => lines.find(line => line.id === draft?.id),
    [lines, draft?.id]
  );
  const originalItemName = useMemo(
    () => lines?.find(({ item }) => item.id === currentItem?.id)?.itemName,
    [lines, currentItem?.id]
  );

  return (
    <>
      <RequestLineEditFormLayout
        Top={
          <>
            {disabled ? (
              <BasicTextInput
                value={`${currentItem?.code}     ${originalItemName}`}
                disabled
                fullWidth
              />
            ) : (
              <StockItemSearchInputWithStats
                autoFocus={!currentItem}
                openOnFocus={!currentItem}
                width={600}
                disabled={disabled}
                currentItemId={currentItem?.id}
                onChange={(newItem: ItemWithStatsFragment | null) =>
                  newItem && setCurrentItem(newItem)
                }
                extraFilter={item =>
                  !lines.some(line => line.item.id === item.id)
                }
              />
            )}
          </>
        }
        Left={
          <>
            {currentItem && currentItem?.unitName ? (
              <InfoRow label={t('label.unit')} value={unitName} />
            ) : null}
            {isPacksEnabled ? (
              <InfoRow
                label={t('label.default-pack-size')}
                value={String(currentItem?.defaultPackSize)}
              />
            ) : null}
            <InfoRow
              label={t('label.our-soh')}
              value={round(
                getValueInUnitsOrPacks(
                  packageType,
                  defaultPackSize,
                  draft?.itemStats.availableStockOnHand
                ),
                2
              )}
            />
            {showExtraFields && (
              <InfoRow
                label={t('label.months-of-stock')}
                value={round(
                  getValueInUnitsOrPacks(
                    packageType,
                    defaultPackSize,
                    draft?.itemStats.availableMonthsOfStockOnHand
                  ),
                  2
                )}
              />
            )}
            <InfoRow
              label={t('label.amc/amd')}
              value={round(
                getValueInUnitsOrPacks(
                  packageType,
                  defaultPackSize,
                  draft?.itemStats.averageMonthlyConsumption
                ),
                2
              )}
            />
            {showExtraFields && (
              <InfoRow
                label={t('label.short-expiry')}
                value={round(
                  getValueInUnitsOrPacks(
                    packageType,
                    defaultPackSize,
                    draft?.expiringUnits
                  )
                )}
              />
            )}
          </>
        }
        Middle={
          currentItem ? (
            <>
              <InfoRow
                label={t('label.suggested')}
                value={round(
                  getValueInUnitsOrPacks(
                    packageType,
                    defaultPackSize,
                    draft?.suggestedQuantity
                  ),
                  2
                )}
                highlight={true}
              />
              {showExtraFields && (
                <>
                  <InfoRow
                    label={t('label.incoming-stock')}
                    value={round(
                      getValueInUnitsOrPacks(
                        packageType,
                        defaultPackSize,
                        draft?.incomingUnits
                      ),
                      2
                    )}
                  />
                  <InfoRow
                    label={t('label.outgoing')}
                    value={round(
                      getValueInUnitsOrPacks(
                        packageType,
                        defaultPackSize,
                        draft?.outgoingUnits
                      ),
                      2
                    )}
                  />
                  <InfoRow
                    label={t('label.losses')}
                    value={round(
                      getValueInUnitsOrPacks(
                        packageType,
                        defaultPackSize,
                        draft?.lossInUnits
                      ),
                      2
                    )}
                  />
                  <InfoRow
                    label={t('label.additions')}
                    value={round(
                      getValueInUnitsOrPacks(
                        packageType,
                        defaultPackSize,
                        draft?.additionInUnits
                      ),
                      2
                    )}
                  />
                  <InfoRow
                    label={t('label.days-out-of-stock')}
                    value={round(
                      getValueInUnitsOrPacks(
                        packageType,
                        defaultPackSize,
                        draft?.daysOutOfStock
                      ),
                      2
                    )}
                  />
                </>
              )}
            </>
          ) : null
        }
        Right={
          <>
            {isPacksEnabled && (
              <Order
                disabled={disabled}
                draft={draft}
                update={update}
                isPacksEnabled={isPacksEnabled}
                packageType={packageType}
                setPackageType={setPackageType}
                unitName={unitName}
              />
            )}
            {showExtraFields && (
              <>
                <InputWithLabelRow
                  Input={
                    <ReasonOptionsSearchInput
                      value={draft?.reason}
                      onChange={value => {
                        update({ reason: value });
                      }}
                      width={180}
                      type={ReasonOptionNodeType.RequisitionLineVariance}
                      isDisabled={
                        draft?.requestedQuantity === draft?.suggestedQuantity ||
                        disabled
                      }
                    />
                  }
                  sx={{ marginTop: 0 }}
                  label={t('label.reason')}
                />
              </>
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
                    backgroundColor: theme => theme.palette.background.menu,
                  },
                },
              }}
              disabled={disabled}
              minRows={2}
              maxRows={2}
            />
          </>
        }
      />

      <Box paddingTop={1} maxHeight={200} width={width * 0.48} display="flex">
        {line &&
          plugins.requestRequisitionLine?.editViewInfo?.map((Info, index) => (
            <Info key={index} line={line} requisition={requisition} />
          ))}
        {line &&
          plugins.requestRequisitionLine?.editViewField?.map((Field, index) => (
            <Field key={index} line={line} />
          ))}
      </Box>
    </>
  );
};

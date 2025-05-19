import React, { useMemo } from 'react';
import {
  ItemWithPackSizeFragment,
  ItemWithStatsFragment,
  ReasonOptionsSearchInput,
  RequestFragment,
  StockItemSearchInputWithStats,
} from '@openmsupply-client/system';
import {
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
  ValueInfoRow,
} from './RequestLineEditFormLayout';
import { RequestedSelection } from './RequestedSelection';
import { RepresentationValue } from './utils';

interface RequestLineEditProps {
  requisition: RequestFragment;
  lines: RequestLineFragment[];
  currentItem?: ItemWithPackSizeFragment | null;
  setCurrentItem: (item: ItemWithStatsFragment) => void;
  draft?: DraftRequestLine | null;
  update: (patch: Partial<DraftRequestLine>) => void;
  isPacksEnabled: boolean;
  representation: RepresentationValue;
  setRepresentation: (type: RepresentationValue) => void;
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
  representation,
  setRepresentation,
  disabled,
  isProgram,
  useConsumptionData,
}: RequestLineEditProps) => {
  const t = useTranslation();
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
            <ValueInfoRow
              label={t('label.our-soh')}
              value={draft?.itemStats.availableStockOnHand}
              defaultPackSize={defaultPackSize}
              representation={representation}
              unitName={unitName}
            />
            <ValueInfoRow
              label={t('label.amc/amd')}
              value={draft?.itemStats.averageMonthlyConsumption}
              defaultPackSize={defaultPackSize}
              representation={representation}
              unitName={unitName}
            />
            <ValueInfoRow
              label={t('label.months-of-stock')}
              value={draft?.itemStats.availableMonthsOfStockOnHand}
              defaultPackSize={defaultPackSize}
              representation={representation}
              unitName={unitName}
            />
            {showExtraFields && (
              <ValueInfoRow
                label={t('label.short-expiry')}
                value={draft?.expiringUnits}
                defaultPackSize={defaultPackSize}
                representation={representation}
                unitName={unitName}
              />
            )}
          </>
        }
        Middle={
          currentItem ? (
            <>
              <ValueInfoRow
                label={t('label.suggested')}
                value={draft?.suggestedQuantity}
                defaultPackSize={defaultPackSize}
                representation={representation}
                unitName={unitName}
                sx={{
                  background: theme => theme.palette.background.group,
                }}
              />
              {showExtraFields && (
                <>
                  <ValueInfoRow
                    label={t('label.incoming-stock')}
                    value={draft?.incomingUnits}
                    representation={representation}
                    defaultPackSize={defaultPackSize}
                    unitName={unitName}
                  />
                  <ValueInfoRow
                    label={t('label.outgoing')}
                    value={draft?.outgoingUnits}
                    representation={representation}
                    defaultPackSize={defaultPackSize}
                    unitName={unitName}
                  />
                  <ValueInfoRow
                    label={t('label.losses')}
                    value={draft?.lossInUnits}
                    representation={representation}
                    defaultPackSize={defaultPackSize}
                    unitName={unitName}
                  />
                  <ValueInfoRow
                    label={t('label.additions')}
                    value={draft?.additionInUnits}
                    representation={representation}
                    defaultPackSize={defaultPackSize}
                    unitName={unitName}
                  />
                  <ValueInfoRow
                    label={t('label.days-out-of-stock')}
                    value={draft?.daysOutOfStock}
                    representation={representation}
                    defaultPackSize={defaultPackSize}
                    unitName={unitName}
                  />
                </>
              )}
            </>
          ) : null
        }
        Right={
          <>
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

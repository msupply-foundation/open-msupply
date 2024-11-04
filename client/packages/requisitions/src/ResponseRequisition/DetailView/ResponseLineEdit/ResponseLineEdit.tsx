import React from 'react';
import { useTranslation } from '@common/intl';
import {
  ItemRowFragment,
  ReasonOptionsSearchInput,
} from '@openmsupply-client/system';
import { DraftResponseLine } from './hooks';
import {
  Box,
  InputWithLabelRow,
  NumericTextInput,
  ReasonOptionNodeType,
} from '@openmsupply-client/common';
import { Footer } from './Footer';

const INPUT_WIDTH = 100;
const LABEL_WIDTH = '150px';

interface ResponseLineEditProps {
  item?: ItemRowFragment | null;
  hasLinkedRequisition?: boolean | undefined;
  draft?: DraftResponseLine | null;
  update: (patch: Partial<DraftResponseLine>) => void;
  save?: () => void;
  hasNext: boolean;
  next: ItemRowFragment | null;
  hasPrevious: boolean;
  previous: ItemRowFragment | null;
}

export const ResponseLineEdit = ({
  hasLinkedRequisition,
  draft,
  update,
  save,
  hasNext,
  next,
  hasPrevious,
  previous,
}: ResponseLineEditProps) => {
  const t = useTranslation();

  const incomingStock =
    (draft?.incomingUnits ?? 0) + (draft?.additionInUnits ?? 0);
  const outgoingStock = (draft?.lossInUnits ?? 0) + (draft?.outgoingUnits ?? 0);

  const available =
    (draft?.availableStockOnHand ?? 0) + incomingStock - outgoingStock;

  const MOS =
    draft?.averageMonthlyConsumption !== 0
      ? available / (draft?.averageMonthlyConsumption ?? 1)
      : 0;

  return (
    <Box>
      <Box display="flex" justifyContent="space-between">
        <Box paddingLeft={4} paddingRight={7}>
          {/* Left column content */}
          <InputWithLabelRow
            Input={
              <NumericTextInput
                width={INPUT_WIDTH}
                value={draft?.initialStockOnHandUnits}
                onChange={value => update({ initialStockOnHandUnits: value })}
                onBlur={save}
              />
            }
            labelWidth={LABEL_WIDTH}
            label={t('label.initial-stock-on-hand')}
            sx={{ marginBottom: 1 }}
          />
          <InputWithLabelRow
            Input={
              <NumericTextInput
                width={INPUT_WIDTH}
                value={draft?.incomingUnits}
                onChange={value => update({ incomingUnits: value })}
                onBlur={save}
              />
            }
            labelWidth={LABEL_WIDTH}
            label={t('label.incoming-stock')}
            sx={{ marginBottom: 1 }}
          />
          <InputWithLabelRow
            Input={
              <NumericTextInput
                width={INPUT_WIDTH}
                value={draft?.outgoingUnits}
                onChange={value => update({ outgoingUnits: value })}
                onBlur={save}
              />
            }
            labelWidth={LABEL_WIDTH}
            label={t('label.outgoing')}
            sx={{ marginBottom: 1 }}
          />
          <InputWithLabelRow
            Input={
              <NumericTextInput
                width={INPUT_WIDTH}
                value={draft?.lossInUnits}
                onChange={value => update({ lossInUnits: value })}
                onBlur={save}
              />
            }
            labelWidth={LABEL_WIDTH}
            label={t('label.losses')}
            sx={{ marginBottom: 1 }}
          />
          <InputWithLabelRow
            Input={
              <NumericTextInput
                width={INPUT_WIDTH}
                value={draft?.additionInUnits}
                onChange={value => update({ additionInUnits: value })}
                onBlur={save}
              />
            }
            labelWidth={LABEL_WIDTH}
            label={t('label.additions')}
            sx={{ marginBottom: 1 }}
          />
          <InputWithLabelRow
            Input={
              <NumericTextInput
                width={INPUT_WIDTH}
                value={draft?.expiringUnits}
                onChange={value => update({ expiringUnits: value })}
                onBlur={save}
              />
            }
            labelWidth={LABEL_WIDTH}
            label={t('label.short-expiry')}
            sx={{ marginBottom: 1 }}
          />
          <InputWithLabelRow
            Input={
              <NumericTextInput
                width={INPUT_WIDTH}
                value={draft?.daysOutOfStock}
                onChange={value => update({ daysOutOfStock: value })}
                onBlur={save}
              />
            }
            labelWidth={LABEL_WIDTH}
            label={t('label.days-out-of-stock')}
            sx={{ marginBottom: 1 }}
          />
          <InputWithLabelRow
            Input={
              <NumericTextInput
                width={INPUT_WIDTH}
                value={draft?.averageMonthlyConsumption}
                onChange={value => update({ averageMonthlyConsumption: value })}
                onBlur={save}
              />
            }
            labelWidth={LABEL_WIDTH}
            label={t('label.amc')}
            sx={{ marginBottom: 1 }}
          />
          <InputWithLabelRow
            Input={
              <NumericTextInput
                width={INPUT_WIDTH}
                value={MOS}
                disabled
                decimalLimit={2}
              />
            }
            labelWidth={LABEL_WIDTH}
            label={t('label.months-of-stock')}
          />
        </Box>
        <Box>
          {/* Right column content */}
          <InputWithLabelRow
            Input={
              <NumericTextInput
                width={INPUT_WIDTH}
                value={draft?.requestedQuantity}
                onChange={value => update({ requestedQuantity: value })}
                disabled={!!hasLinkedRequisition}
              />
            }
            labelWidth={LABEL_WIDTH}
            label={t('label.requested-quantity')}
            sx={{ marginBottom: 1 }}
          />
          <InputWithLabelRow
            Input={
              <NumericTextInput
                width={INPUT_WIDTH}
                value={available}
                disabled
              />
            }
            labelWidth={LABEL_WIDTH}
            label={t('label.available')}
            sx={{ marginBottom: 1 }}
          />
          <InputWithLabelRow
            Input={
              <NumericTextInput
                width={INPUT_WIDTH}
                value={draft?.alreadyIssued}
                disabled
              />
            }
            labelWidth={LABEL_WIDTH}
            label={t('label.already-issued')}
            sx={{ marginBottom: 1 }}
          />
          <InputWithLabelRow
            Input={
              <NumericTextInput
                width={INPUT_WIDTH}
                value={draft?.suggestedQuantity}
                disabled
              />
            }
            labelWidth={LABEL_WIDTH}
            label={t('label.suggested-quantity')}
            sx={{ marginBottom: 1 }}
          />
          <InputWithLabelRow
            Input={
              <NumericTextInput
                width={INPUT_WIDTH}
                value={draft?.remainingQuantityToSupply}
                disabled
              />
            }
            labelWidth={LABEL_WIDTH}
            label={t('label.remaining-to-supply')}
            sx={{ marginBottom: 1 }}
          />
          <InputWithLabelRow
            Input={
              <NumericTextInput
                width={INPUT_WIDTH}
                value={draft?.supplyQuantity}
                onChange={value => update({ supplyQuantity: value })}
                onBlur={save}
              />
            }
            labelWidth={LABEL_WIDTH}
            label={t('label.supply-quantity')}
            sx={{ marginBottom: 1 }}
          />
          <InputWithLabelRow
            Input={
              <ReasonOptionsSearchInput
                value={draft?.reason}
                onChange={value => {
                  update({ reason: value });
                }}
                width={200}
                type={ReasonOptionNodeType.RequisitionLineVariance}
                isDisabled={
                  draft?.requestedQuantity === draft?.suggestedQuantity
                }
                onBlur={save}
              />
            }
            labelWidth={'60px'}
            label={t('label.reason')}
          />
        </Box>
      </Box>
      <Box>
        <Footer
          hasNext={hasNext}
          next={next}
          hasPrevious={hasPrevious}
          previous={previous}
          requisitionNumber={draft?.requisitionNumber}
        />
      </Box>
    </Box>
  );
};

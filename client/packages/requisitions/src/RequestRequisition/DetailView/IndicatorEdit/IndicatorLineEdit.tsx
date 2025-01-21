import React, { useCallback } from 'react';
import { Footer } from './Footer';
import {
  BasicTextInput,
  Box,
  IndicatorColumnNode,
  IndicatorValueTypeNode,
  InputWithLabelRow,
  NumericTextInput,
  useAuthContext,
  useNotification,
  useTranslation,
} from '@openmsupply-client/common';
import {
  IndicatorLineRowFragment,
  IndicatorLineWithColumnsFragment,
} from '../../api';
import { useDraftIndicatorValue } from './hooks';
import { CustomerIndicatorInfoView } from './CustomerIndicatorInfo';
import { indicatorColumnNameToLocal } from '../../../utils';

interface IndicatorLineEditProps {
  requisitionNumber: number;
  hasNext: boolean;
  next: IndicatorLineRowFragment | null;
  hasPrevious: boolean;
  previous: IndicatorLineRowFragment | null;
  currentLine?: IndicatorLineWithColumnsFragment | null;
  disabled: boolean;
  scrollIntoView: () => void;
}

const INPUT_WIDTH = 185;
const LABEL_WIDTH = '150px';

const InputWithLabel = ({
  autoFocus,
  data,
  disabled,
}: {
  autoFocus: boolean;
  data: IndicatorColumnNode;
  disabled: boolean;
}) => {
  if (!data?.value) {
    return;
  }

  const { draft, update } = useDraftIndicatorValue(data.value);
  const t = useTranslation();
  const { error } = useNotification();

  const errorHandler = useCallback(
    (res: any) => {
      // probably shouldn't be any, but UpdateIndicatorValue doesn't have res.error.__typename
      if (res.__typename === 'UpdateIndicatorValueError') {
        if (res.error?.__typename === 'RecordNotFound') {
          error(t('messages.record-not-found'))();
        } else {
          error(t('error.value-type-not-correct'))();
        }
      }
    },
    [t]
  );

  const sharedProps = {
    disabled,
    autoFocus,
  };

  const inputComponent =
    data.valueType === IndicatorValueTypeNode.Number ? (
      <NumericTextInput
        width={INPUT_WIDTH}
        value={isNaN(Number(draft?.value)) ? 0 : Number(draft?.value)}
        onChange={v => {
          const newValue = isNaN(Number(v)) ? 0 : v;
          update({ value: String(newValue) }).then(errorHandler);
        }}
        {...sharedProps}
      />
    ) : (
      <BasicTextInput
        sx={{ width: '200px' }}
        value={draft?.value}
        onChange={e => {
          update({ value: e.target.value }).then(errorHandler);
        }}
        {...sharedProps}
      />
    );

  return (
    <InputWithLabelRow
      Input={inputComponent}
      labelWidth={LABEL_WIDTH}
      label={indicatorColumnNameToLocal(data.name)}
      sx={{ marginBottom: 1 }}
    />
  );
};

export const IndicatorLineEdit = ({
  requisitionNumber,
  hasNext,
  next,
  hasPrevious,
  previous,
  currentLine,
  disabled,
  scrollIntoView,
}: IndicatorLineEditProps) => {
  const columns =
    currentLine?.columns
      .filter(c => c.value) // Columns may be added to a program after the requisition was made, we want to hide those
      .sort((a, b) => a.columnNumber - b.columnNumber) || [];
  const { store } = useAuthContext();
  const showInfo =
    store?.preferences.useConsumptionAndStockFromCustomersForInternalOrders &&
    !!currentLine?.customerIndicatorInfo;

  return (
    <>
      <Box display="flex" flexDirection="column">
        {columns.map((c, i) => (
          <InputWithLabel
            key={c.value?.id}
            data={c}
            disabled={disabled}
            autoFocus={i === 0}
          />
        ))}
      </Box>
      {showInfo && (
        <Box paddingTop={1} maxHeight={200} width="100%" display="flex">
          <CustomerIndicatorInfoView
            columns={columns}
            customerInfos={currentLine?.customerIndicatorInfo}
          />
        </Box>
      )}
      <Box>
        <Footer
          hasNext={hasNext}
          next={next}
          hasPrevious={hasPrevious}
          previous={previous}
          requisitionNumber={requisitionNumber}
          scrollIntoView={scrollIntoView}
        />
      </Box>
    </>
  );
};

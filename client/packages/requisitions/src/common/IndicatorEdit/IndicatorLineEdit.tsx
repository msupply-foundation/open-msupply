import React, { useCallback } from 'react';
import {
  BasicTextInput,
  Box,
  IndicatorColumnNode,
  IndicatorValueTypeNode,
  InputWithLabelRow,
  NumericTextInput,
  Typography,
  useNotification,
  useTranslation,
} from '@openmsupply-client/common';
import {
  IndicatorLineRowFragment,
  IndicatorLineWithColumnsFragment,
} from '../../RequestRequisition/api';
import { Footer } from './Footer';
import { UseUpdateIndicatorValue, useDraftIndicatorValue } from './hooks';
import { indicatorColumnNameToLocal } from '../../utils';

interface IndicatorLineEditProps {
  hasNext: boolean;
  next: IndicatorLineRowFragment | null;
  hasPrevious: boolean;
  previous: IndicatorLineRowFragment | null;
  currentLine?: IndicatorLineWithColumnsFragment | null;
  disabled: boolean;
  onSelectLine: (id: string) => void;
  scrollIntoView: () => void;
  useUpdateIndicatorValue: UseUpdateIndicatorValue;
  // Request renders a customer-info panel below the inputs; Response doesn't.
  belowInputs?: (
    columns: IndicatorColumnNode[],
    currentLine: IndicatorLineWithColumnsFragment
  ) => React.ReactNode;
}

const INPUT_WIDTH = 185;
const LABEL_WIDTH = '150px';

interface InputWithLabelProps {
  autoFocus: boolean;
  data: IndicatorColumnNode;
  disabled: boolean;
  useUpdateIndicatorValue: UseUpdateIndicatorValue;
}

const InputWithLabel = ({
  autoFocus,
  data,
  disabled,
  useUpdateIndicatorValue,
}: InputWithLabelProps) => {
  const t = useTranslation();
  const { error } = useNotification();

  const { draft, update } = useDraftIndicatorValue(
    data.value ?? {
      __typename: 'IndicatorValueNode',
      id: '',
      value: '',
    },
    useUpdateIndicatorValue
  );

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

  if (!data?.value) {
    return null;
  }

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
    <Box sx={{ marginBottom: 1 }}>
      <InputWithLabelRow
        Input={inputComponent}
        labelWidth={LABEL_WIDTH}
        label={indicatorColumnNameToLocal(data.name, t)}
        sx={{ marginBottom: 1 }}
      />
    </Box>
  );
};

export const IndicatorLineEdit = ({
  hasNext,
  next,
  hasPrevious,
  previous,
  currentLine,
  disabled,
  onSelectLine,
  scrollIntoView,
  useUpdateIndicatorValue,
  belowInputs,
}: IndicatorLineEditProps) => {
  // Columns may be added to a program after the requisition was made; hide
  // those (no stored value). Column order is set by mergeIndicatorLines (base
  // indicator's columns first, HIV's last) so no re-sort here.
  const columns = currentLine?.columns.filter(c => c.value) || [];
  const t = useTranslation();

  const isIndicatorInactive = !currentLine?.line.isActive;

  return (
    <>
      <Box display="flex" flexDirection="column">
        {columns.map(
          (column, i) =>
            column.value != null && (
              <InputWithLabel
                key={column.value?.id}
                data={column}
                disabled={disabled || isIndicatorInactive}
                autoFocus={i === 0}
                useUpdateIndicatorValue={useUpdateIndicatorValue}
              />
            )
        )}
        {isIndicatorInactive && (
          <Typography variant="caption" color="text.secondary" sx={{ pl: 1 }}>
            {t('label.indicator-no-longer-active')}
          </Typography>
        )}
      </Box>
      {currentLine && belowInputs?.(columns, currentLine)}
      <Footer
        hasNext={hasNext}
        next={next}
        hasPrevious={hasPrevious}
        previous={previous}
        onSelectLine={onSelectLine}
        scrollIntoView={scrollIntoView}
      />
    </>
  );
};

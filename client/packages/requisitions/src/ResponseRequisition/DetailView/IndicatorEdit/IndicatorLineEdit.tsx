import React, { useCallback } from 'react';
import { Footer } from './Footer';
import {
  BasicTextInput,
  Box,
  IndicatorColumnNode,
  IndicatorValueTypeNode,
  InputWithLabelRow,
  NumericTextInput,
  useNotification,
  useTranslation,
} from '@openmsupply-client/common';
import { useDraftIndicatorValue } from './hooks';
import {
  IndicatorLineRowFragment,
  IndicatorLineWithColumnsFragment,
} from '../../../RequestRequisition/api';
import { indicatorColumnNameToLocal } from '../../../utils';

interface IndicatorLineEditProps {
  requisitionId: string;
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

interface InputWithLabelProps {
  autoFocus: boolean;
  data: IndicatorColumnNode;
  disabled: boolean;
}

const InputWithLabel = ({ autoFocus, data, disabled }: InputWithLabelProps) => {
  const t = useTranslation();
  const { error } = useNotification();

  const { draft, update } = useDraftIndicatorValue(
    data.value ?? {
      __typename: 'IndicatorValueNode',
      id: '',
      value: '',
    }
  );

  const errorHandler = useCallback(
    (res: any) => {
      // probably shouldn't be any, but UpdateIndicatorValueResponse doesn't have res.error.__typename
      if (res.__typename === 'UpdateIndicatorValueError') {
        if (res.error.__typename === 'RecordNotFound') {
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
    <InputWithLabelRow
      Input={inputComponent}
      labelWidth={LABEL_WIDTH}
      label={indicatorColumnNameToLocal(data.name, t)}
      sx={{ marginBottom: 1 }}
    />
  );
};

export const IndicatorLineEdit = ({
  requisitionId,
  hasNext,
  next,
  hasPrevious,
  previous,
  currentLine,
  disabled,
  scrollIntoView,
}: IndicatorLineEditProps) => {
  const columns = currentLine?.columns
    .filter(c => c.value) // Columns may be added to a program after the requisition was made, we want to hide those
    .sort((a, b) => a.columnNumber - b.columnNumber);

  return (
    <>
      <Box display="flex" flexDirection="column">
        {columns?.map((column, i) => {
          return (
            <InputWithLabel
              key={column.value?.id}
              data={column}
              disabled={disabled}
              autoFocus={i === 0}
            />
          );
        })}
      </Box>
      <Box>
        <Footer
          hasNext={hasNext}
          next={next}
          hasPrevious={hasPrevious}
          previous={previous}
          requisitionId={requisitionId}
          scrollIntoView={scrollIntoView}
        />
      </Box>
    </>
  );
};

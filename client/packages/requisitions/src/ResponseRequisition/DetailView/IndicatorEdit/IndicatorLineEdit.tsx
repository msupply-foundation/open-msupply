import React from 'react';
import { Footer } from './Footer';
import {
  BasicTextInput,
  Box,
  IndicatorValueTypeNode,
  InputWithLabelRow,
  NumericTextInput,
  useNotification,
  useTranslation,
} from '@openmsupply-client/common';
import {
  IndicatorLineRowFragment,
  IndicatorLineWithColumnsFragment,
  useResponse,
} from '../../api';

interface IndicatorLineEditProps {
  requisitionNumber: number;
  indicatorCode?: string;
  hasNext: boolean;
  next: IndicatorLineRowFragment | null;
  hasPrevious: boolean;
  previous: IndicatorLineRowFragment | null;
  currentLine?: IndicatorLineWithColumnsFragment | null;
}

const INPUT_WIDTH = 185;
const LABEL_WIDTH = '150px';

export const IndicatorLineEdit = ({
  requisitionNumber,
  hasNext,
  next,
  hasPrevious,
  previous,
  currentLine,
}: IndicatorLineEditProps) => {
  const columns = currentLine?.columns.sort(
    (a, b) => a.columnNumber - b.columnNumber
  );
  const t = useTranslation();
  const { mutateAsync } = useResponse.document.updateIndicatorValue();
  const { error } = useNotification();
  const errorHandler = (res: any) => {
    // probably shouldn't be any, but UpdateIndicatorValueResponse doesn't have res.error.__typename
    if (res.__typename === 'UpdateIndicatorValueError') {
      if (res.error.__typename === 'RecordNotFound') {
        error(t('messages.record-not-found'))();
      } else {
        error(t('error.value-type-not-correct'))();
      }
    }
  };

  const inputWithLabel = (
    id: string,
    label: string,
    value: string,
    valueType?: IndicatorValueTypeNode | null
  ) => {
    const inputComponent =
      valueType === IndicatorValueTypeNode.Number ? (
        <NumericTextInput
          width={INPUT_WIDTH}
          value={Number(value)}
          onChange={v => {
            mutateAsync({ id, value: String(v) }).then(errorHandler);
          }}
          autoFocus
        />
      ) : (
        <BasicTextInput
          sx={{ width: '200px' }}
          value={value}
          onChange={e => {
            mutateAsync({ id, value: e.target.value }).then(errorHandler);
          }}
          autoFocus
        />
      );

    return (
      <InputWithLabelRow
        Input={inputComponent}
        labelWidth={LABEL_WIDTH}
        label={label}
        sx={{ marginBottom: 1 }}
      />
    );
  };

  return (
    <>
      <Box display="flex" flexDirection="column">
        {columns?.map(c => {
          return inputWithLabel(
            c.value?.id ?? '',
            c.name,
            c.value?.value ?? '',
            c.valueType
          );
        })}
      </Box>
      <Box>
        <Footer
          hasNext={hasNext}
          next={next}
          hasPrevious={hasPrevious}
          previous={previous}
          requisitionNumber={requisitionNumber}
        />
      </Box>
    </>
  );
};

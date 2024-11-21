import React from 'react';
import { Footer } from './Footer';
import {
  BasicTextInput,
  Box,
  IndicatorValueTypeNode,
  InputWithLabelRow,
  NumericTextInput,
} from '@openmsupply-client/common';
import {
  IndicatorLineRowFragment,
  IndicatorLineWithColumnsFragment,
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

  const inputWithLabel = (
    label: string,
    value: string | number,
    valueType?: IndicatorValueTypeNode | null
  ) => {
    const inputComponent =
      valueType === IndicatorValueTypeNode.Number ? (
        <NumericTextInput
          width={INPUT_WIDTH}
          value={Number(value)}
          // onChange={value => update({ availableStockOnHand: value })}
          // onBlur={save}
          autoFocus
        />
      ) : (
        <BasicTextInput
          sx={{ width: '200px' }}
          value={value}
          // onChange={value => update({ availableStockOnHand: value })}
          // onBlur={save}
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
          return inputWithLabel(c.name, c.value?.value ?? '', c.valueType);
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

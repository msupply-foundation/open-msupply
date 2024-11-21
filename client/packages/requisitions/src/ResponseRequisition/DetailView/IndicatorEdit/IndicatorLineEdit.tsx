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
  currentLine: IndicatorLineWithColumnsFragment | null | undefined;
}

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

  return (
    <>
      <Box display="flex" flexDirection="column">
        {columns?.map(c => {
          const valueType = c.valueType || currentLine?.line.valueType;
          console.log(c.valueType, currentLine?.line.valueType);

          const inputComponent =
            valueType === IndicatorValueTypeNode.Number ? (
              <NumericTextInput
                width={500}
                value={Number(c.value)}
                // onChange={value => update({ availableStockOnHand: value })}
                // onBlur={save}
                autoFocus
              />
            ) : (
              <BasicTextInput
                value={Number(c.value)}
                // onChange={value => update({ availableStockOnHand: value })}
                // onBlur={save}
                autoFocus
              />
            );

          return (
            <InputWithLabelRow
              Input={inputComponent}
              labelWidth={'500px'}
              label={c.name}
              sx={{ marginBottom: 1 }}
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
          requisitionNumber={requisitionNumber}
        />
      </Box>
    </>
  );
};

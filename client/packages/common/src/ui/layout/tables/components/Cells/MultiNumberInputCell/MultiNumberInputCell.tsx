/**
 * Table cell component to present a numerical value as a combination of 2 (or
 * more) units, e.g. Years/Months.
 *
 * Units are specified via the `units` prop. The smallest unit (e.g. "Months")
 * should be the unit of the source "value", and the other units should be
 * defined in relation to this, by specifying the ratio (the base unit has a
 * ratio of 1). For example, for years and months we would define units like so:
 *
 * units={[
 *         {
 *           key: 'year',
 *           ratio: 12,
 *           label: "Y"
 *         },
 *         {
 *           key: 'month',
 *           ratio: 1,
 *           label: "M"
 *         },
 *    ]}
 *
 * For hours/minutes/seconds:
 *
 * units={[
 *         {
 *           key: 'hour',
 *           ratio: 3600,
 *           label: "H"
 *         },
 *         {
 *           key: 'minute',
 *           ratio: 60,
 *           label: "M"
 *         },
 *         {
 *           key: 'second',
 *           ratio: 1,
 *           label: "S"
 *         },
 *    ]}
 */

import React from 'react';
import { CellProps } from '../../../columns';
import {
  NumericInputProps,
  NumericTextInput,
  StandardTextFieldProps,
} from '@common/components';
import { Box } from '@openmsupply-client/common';
import { RecordWithId } from '@common/types';
import { useBufferState, useDebounceCallback } from '@common/hooks';

interface Unit {
  key: string;
  ratio: number;
  label: string;
}

export const MultipleNumberInputCell = <T extends RecordWithId>({
  units,
  rowData,
  column,
  rowIndex,
  columnIndex,
  isDisabled = false,
  min = 0,
  max,
  decimalLimit,
  step,
  multiplier,
  defaultValue,
  allowNegative,
  id,
  TextInputProps,
  width,
}: CellProps<T> &
  NumericInputProps & {
    id?: string;
    TextInputProps?: StandardTextFieldProps;
  } & { units: Unit[] }): React.ReactElement<CellProps<T>> => {
  const [buffer, setBuffer] = useBufferState(column.accessor({ rowData }));
  const updater = useDebounceCallback(column.setter, [column.setter], 350);

  const autoFocus = rowIndex === 0 && columnIndex === 0;

  const cellValues = getCellValues(buffer as number | undefined, units);

  return (
    <Box display="flex">
      {units.map((unit, index) => (
        <NumericTextInput
          key={unit.key}
          id={id}
          disabled={isDisabled}
          autoFocus={autoFocus}
          {...TextInputProps}
          InputProps={{
            sx: { '& .MuiInput-input': { textAlign: 'right' } },
            ...TextInputProps?.InputProps,
          }}
          onChange={num => {
            const newValue = num === undefined ? min : num;
            if (cellValues[index] === newValue) return;
            const newValues = [...cellValues];
            newValues[index] = newValue;
            const newTotal = computeTotal(newValues, units);
            setBuffer(newTotal);
            updater({ ...rowData, [column.key]: Number(newTotal) });
          }}
          min={min}
          // Limit smaller units to less than the value of the next highest
          // unit, e.g. "Months" would be limited to 11.999
          max={setMax(units, index, max)}
          decimalLimit={decimalLimit}
          step={step}
          multiplier={multiplier}
          allowNegative={allowNegative}
          defaultValue={defaultValue}
          value={cellValues[index]}
          width={width}
          endAdornment={unit.label}
        />
      ))}
    </Box>
  );
};

export const getCellValues = (value: number | undefined, units: Unit[]) => {
  if (value === undefined) return units.map(_ => 0);

  let remainder = value;
  return units.map((unit, index) => {
    const thisValue =
      index === units.length - 1
        ? remainder
        : Math.floor(remainder / unit.ratio);
    // Rounding required to binary precision problems
    // e.g. 66.6 % 12 => 6.599999999999994
    remainder = parseFloat((remainder % unit.ratio).toFixed(5));
    return thisValue;
  });
};

export const computeTotal = (values: number[], units: Unit[]) =>
  values.reduce((sum, val, index) => {
    const ratio = units[index]?.ratio ?? 1;
    return sum + ratio * val;
  }, 0);

export const setMax = (
  units: Unit[],
  index: number,
  max: number | undefined
) => {
  if (index === 0) return max;
  const thisRatio = (units[index] as Unit).ratio;
  const higherRatio = (units[index - 1] as Unit).ratio;
  // If not the last value, should be limited to the integer below the next
  // highest ratio. But for the last value, we need to be able to accept
  // fractional input right up to the ratio, so we allow a certain amount of
  // decimal precision (can't see needing more than 4 d.p for this kind of
  // thing!)
  const limitReduction = index === units.length - 1 ? 0.0001 : 1;
  return higherRatio / thisRatio - limitReduction;
};

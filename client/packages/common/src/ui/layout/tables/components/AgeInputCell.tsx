import React from 'react';
import {
  NumericTextInput,
  useBufferState,
  useTranslation,
} from '@openmsupply-client/common';
import { MRT_Cell, MRT_RowData } from 'material-react-table';
import { stopPropagationForArrowKeys } from './NumberInputCell';

export const AgeInputCell = <T extends MRT_RowData>({
  cell,
  updateFn,
  ...numericTextProps
}: {
  cell: MRT_Cell<T>;
  updateFn: (value: number) => void;
}) => {
  const { getValue, column, row } = cell;

  const value = column.accessorFn
    ? // Workaround for tanstack bug: https://github.com/TanStack/table/issues/5363
    (column.accessorFn(row.original, row.index) as number)
    : getValue<number>();

  const [year, setYear] = useBufferState(Math.floor(value / 12));
  const [month, setMonth] = useBufferState(value % 12);

  const t = useTranslation();

  return <>
    <NumericTextInput
      decimalLimit={2}
      min={0}
      value={year}
      onChange={num => {
        const newValue = num === undefined ? 0 : num;
        if (newValue === year) return;
        setYear(newValue);
        updateFn(newValue * 12 + month);
      }}
      onKeyDown={stopPropagationForArrowKeys}
      endAdornment={t('label.years-abbreviation')}
      fullWidth
      {...numericTextProps}
    />
    <NumericTextInput
      decimalLimit={2}
      min={0}
      max={11}
      value={month}
      onChange={num => {
        const newValue = num === undefined ? 0 : num;
        if (newValue === month) return;
        setMonth(newValue);
        updateFn(year * 12 + newValue);
      }}
      onKeyDown={stopPropagationForArrowKeys}
      endAdornment={t('label.months-abbreviation')}
      fullWidth
      {...numericTextProps}
    />
  </>;
};


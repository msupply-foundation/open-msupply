import React from 'react';
import {
  CustomErrorValue,
  FormErrorBinding,
  NumericTextInput,
  useBufferState,
  useFormField,
  useTranslation,
} from '@openmsupply-client/common';
import { MRT_Cell, MRT_RowData } from 'material-react-table';
import { stopPropagationForArrowKeys } from './NumberInputCell';

export interface AgeInputCellProps<T extends MRT_RowData> {
  cell: MRT_Cell<T>;
  updateFn: (value: number) => void;
  /**
   * Opt the cell into the form-error system. Registers the *combined*
   * months value as one field (not one per inner input), so both the year
   * and month boxes share an error state.
   */
  formError?: FormErrorBinding;
  customError?: CustomErrorValue;
}

export const AgeInputCell = <T extends MRT_RowData>({
  cell,
  updateFn,
  formError,
  customError,
}: AgeInputCellProps<T>) => {
  const { getValue, column, row } = cell;

  const value = column.accessorFn
    ? // Workaround for tanstack bug: https://github.com/TanStack/table/issues/5363
    (column.accessorFn(row.original, row.index) as number)
    : getValue<number>();

  const [year, setYear] = useBufferState(Math.floor(value / 12));
  const [month, setMonth] = useBufferState(value % 12);

  const t = useTranslation();

  // Register the combined months value once at the cell level. Both inner
  // inputs receive the resulting `error` boolean so they share one red-border
  // state instead of fighting over the same fieldId.
  const { error } = useFormField({
    formId: formError?.formId ?? '',
    fieldId: formError?.fieldId ?? '',
    label: formError?.label ?? '',
    value,
    customError,
  });

  return <>
    <NumericTextInput
      decimalLimit={2}
      min={0}
      value={year}
      error={error}
      onChange={num => {
        const newValue = num === undefined ? 0 : num;
        if (newValue === year) return;
        setYear(newValue);
        updateFn(newValue * 12 + month);
      }}
      onKeyDown={stopPropagationForArrowKeys}
      endAdornment={t('label.years-abbreviation')}
      fullWidth
    />
    <NumericTextInput
      decimalLimit={2}
      min={0}
      max={11}
      value={month}
      error={error}
      onChange={num => {
        const newValue = num === undefined ? 0 : num;
        if (newValue === month) return;
        setMonth(newValue);
        updateFn(year * 12 + newValue);
      }}
      onKeyDown={stopPropagationForArrowKeys}
      endAdornment={t('label.months-abbreviation')}
      fullWidth
    />
  </>;
};

/**
 * Hook to map convenience column definitions (defined by us)
 * to the exact column structure required by MaterialReactTable
 */

import React from 'react';
import { MRT_Cell, MRT_RowData } from 'material-react-table';
import {
  CurrencyValueCell,
  DateUtils,
  NumericTextDisplay,
  UNDEFINED_STRING_VALUE,
  useFormatDateTime,
  PopoverCell,
  useTranslation,
  CircleIcon,
} from '@openmsupply-client/common';

import { ColumnDef } from './types';

export enum ColumnType {
  String = 'string',
  Number = 'number',
  Currency = 'currency',
  Date = 'date',
  Comment = 'comment',
  Boolean = 'boolean',
}

export const useGetColumnTypeDefaults = () => {
  const t = useTranslation();
  const { localisedDate } = useFormatDateTime();

  return <T extends MRT_RowData>(
    column: ColumnDef<T>
  ): Partial<ColumnDef<T>> => {
    switch (column.columnType) {
      case ColumnType.Date:
        return {
          size: 175, // allow for filters
          Cell: ({ cell }: { cell: MRT_Cell<T> }) => {
            const date = cell.getValue();
            if (date === t('multiple')) return date;

            const maybeDate = DateUtils.getDateOrNull(date as string | null);
            return maybeDate ? localisedDate(maybeDate) : '';
          },
          align: 'right',
          filterVariant: 'date-range',
        };

      case ColumnType.Number:
        return {
          align: 'right',
          size: 130,
          Cell: ({ cell }: { cell: MRT_Cell<T> }) => {
            const value = cell.getValue();
            return (
              <NumericTextDisplay
                value={typeof value === 'number' ? value : undefined}
                defaultValue={UNDEFINED_STRING_VALUE}
              />
            );
          },
        };

      case ColumnType.Currency:
        return {
          align: 'right',
          size: 150,
          Cell: CurrencyValueCell,
        };

      case ColumnType.Comment:
        return {
          size: 60,
          enableSorting: false,
          enableColumnFilter: false,
          enableResizing: false,
          enableColumnActions: false,
          // Displays an empty header in the table, but still uses the provided
          // "header" prop for the Column Management menu
          Header: () => <></>,
          Cell: ({ cell, row }) => {
            if ('subRows' in row.original) {
              // Don't show comment icon for grouped rows
              return null;
            }
            const value = cell.getValue<string | null>();
            return <PopoverCell value={value} label={t('label.comment')} />;
          },
        };

      case ColumnType.Boolean:
        return {
          align: 'center',
          Cell: ({ cell }) => {
            const value = cell.getValue<boolean | null>();
            return value ? (
              <CircleIcon
                sx={{
                  // color: ,
                  transform: 'scale(0.5)',
                }}
              />
            ) : null;
          },
        };

      case ColumnType.String:
      case undefined:
        return {};
    }
  };
};

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
  MessageSquareIcon,
  Tooltip,
} from '@openmsupply-client/common';

import { ColumnDef } from './types';

export enum ColumnType {
  String = 'string',
  Number = 'number',
  Currency = 'currency',
  Date = 'date',
  DateTime = 'datetime',
  Comment = 'comment',
  Boolean = 'boolean',
  Percentage = 'percentage',
}

export const useGetColumnTypeDefaults = () => {
  const t = useTranslation();
  const { localisedDate, localisedDateTime } = useFormatDateTime();

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
          muiFilterDatePickerProps: ({ column, rangeFilterIndex }) => {
            const [start, end] =
              (column.getFilterValue() as [
                Date | undefined,
                Date | undefined,
              ]) ?? [];
            // Enforces date range validity, e.g. end date can't be before start
            // date
            switch (rangeFilterIndex) {
              case 0:
                return {
                  maxDate: end ? new Date(end) : undefined,
                };
              case 1:
                return {
                  minDate: start ? new Date(start) : undefined,
                };
              default:
                return {};
            }
          },
        };

      case ColumnType.DateTime:
        return {
          size: 175, // allow for filters
          Cell: ({ cell }: { cell: MRT_Cell<T> }) => {
            const date = cell.getValue();
            if (date === t('multiple')) return date;

            const maybeDate = DateUtils.getDateOrNull(date as string | null);
            return maybeDate ? localisedDateTime(maybeDate) : '';
          },
          align: 'right',
          filterVariant: 'datetime-range',
          muiFilterDateTimePickerProps: ({ column, rangeFilterIndex }) => {
            const [start, end] =
              (column.getFilterValue() as [
                Date | undefined,
                Date | undefined,
              ]) ?? [];
            // Enforces date range validity, e.g. end date can't be before start
            // date
            switch (rangeFilterIndex) {
              case 0:
                return {
                  maxDate: end ? new Date(end) : undefined,
                };
              case 1:
                return {
                  minDate: start ? new Date(start) : undefined,
                };
              default:
                return {};
            }
          },
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
          size: 50,
          enableSorting: false,
          enableColumnFilter: false,
          enableResizing: false,
          enableColumnActions: false,
          // Comment popover is pretty narrow, show icon rather than full label
          Header: () => (
            <Tooltip title={t('label.comment')} placement="top">
              <MessageSquareIcon fontSize="small" />
            </Tooltip>
          ),
          Cell: ({ cell, row }) => {
            if ('subRows' in row.original) {
              // Don't show comment icon for grouped rows
              return null;
            }
            const value = cell.getValue<string | null>();
            return <PopoverCell value={value} label={t('label.comment')} />;
          },
          align: 'left',
        };

      case ColumnType.Boolean:
        return {
          align: 'center',
          Cell: ({ cell }) => {
            const value = cell.getValue<boolean | null>();
            return value ? (
              <CircleIcon sx={{ transform: 'scale(0.5)' }} />
            ) : null;
          },
        };

      case ColumnType.Percentage:
        return {
          align: 'right',
          size: 130,
          Cell: ({ cell }: { cell: MRT_Cell<T> }) => {
            const value = cell.getValue();
            return <>
              <NumericTextDisplay
                value={typeof value === 'number' ? value : undefined}
                defaultValue={UNDEFINED_STRING_VALUE}
              />
              %
            </>;
          },
        };

      case ColumnType.String:
      case undefined:
        return {};
    }
  };
};

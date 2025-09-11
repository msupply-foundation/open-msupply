/**
 * Hook to map convenience column definitions (defined by us)
 * to the exact column structure required by MaterialReactTable
 */

import React, { useMemo } from 'react';
import { MRT_Cell, MRT_RowData } from 'material-react-table';
import {
  CurrencyValueCell,
  DateUtils,
  mergeCellProps,
  NumericTextDisplay,
  useFormatDateTime,
  useSimplifiedTabletUI,
  useTranslation,
} from '@openmsupply-client/common';

import { ColumnDef } from './types';

export const useMaterialTableColumns = <T extends MRT_RowData>(
  omsColumns: ColumnDef<T>[]
) => {
  const simplifiedMobileView = useSimplifiedTabletUI();

  const getColumnTypeDefaults = useGetColumnTypeDefaults();

  const tableDefinition = useMemo(() => {
    const columns = omsColumns
      .filter(col => col.includeColumn !== false)
      .map(col => {
        const columnDefaults = getColumnTypeDefaults(col);

        // Add alignment styling
        const alignment = col.align ?? columnDefaults.align;
        if (alignment) {
          col.muiTableBodyCellProps = params => {
            return mergeCellProps(
              {
                sx:
                  alignment === 'right'
                    ? {
                        justifyContent: 'flex-end',
                        paddingRight: '2em', // Padding to account for header icons
                      }
                    : alignment === 'center'
                      ? // To-DO: Add padding for center aligned cells
                        { justifyContent: 'center' }
                      : {},
              },
              params
            );
          };
        }

        return {
          ...columnDefaults,
          enableColumnFilter: col.enableColumnFilter ?? false,
          ...col,
        };
      });

    const defaultHiddenColumns = simplifiedMobileView
      ? columns.filter(col => col.defaultHideOnMobile).map(columnId)
      : [];

    const defaultColumnPinning = {
      left: [
        'mrt-row-select',
        ...columns.filter(col => col.pin === 'left').map(columnId),
      ],
      right: columns.filter(col => col.pin === 'right').map(columnId),
    };

    return { columns, defaultHiddenColumns, defaultColumnPinning };
  }, [omsColumns]);

  return tableDefinition;
};

const columnId = <T extends MRT_RowData>(column: ColumnDef<T>): string =>
  column.id ?? column.accessorKey ?? '';

const useGetColumnTypeDefaults = () => {
  const t = useTranslation();
  const { localisedDate } = useFormatDateTime();

  return <T extends MRT_RowData>(
    column: ColumnDef<T>
  ): Partial<ColumnDef<T>> => {
    switch (column.columnType) {
      case 'date':
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

      case 'number':
        return {
          align: 'right',
          size: 130,
          Cell: ({ cell }: { cell: MRT_Cell<T> }) => {
            const value = cell.getValue();
            return (
              <NumericTextDisplay
                value={typeof value === 'number' ? value : undefined}
                sx={{}} // default has some padding...
              />
            );
          },
        };

      case 'currency':
        return {
          align: 'right',
          size: 150,
          Cell: CurrencyValueCell,
        };

      case 'string':
      default:
        return {};
    }
  };
};

/**
 * Hook to map convenience column definitions (defined by us)
 * to the exact column structure required by MaterialReactTable
 */

import React, { useMemo } from 'react';
import {
  MRT_Column,
  MRT_RowData,
  MRT_Cell,
  MRT_Row,
  MRT_TableInstance,
} from 'material-react-table';
import {
  defaultAggregationFn,
  mergeCellProps,
  multipleKeys,
  Tooltip,
  useGetColumnTypeDefaults,
  useIntlUtils,
  useTranslation,
} from '@openmsupply-client/common';

import { ColumnDef } from './types';

export const useMaterialTableColumns = <T extends MRT_RowData>(
  omsColumns: ColumnDef<T>[]
) => {
  const t = useTranslation();
  const { isRtl } = useIntlUtils();
  const getColumnTypeDefaults = useGetColumnTypeDefaults();

  const tableDefinition = useMemo(() => {
    const columns: ColumnDef<T>[] = omsColumns
      .filter(col => col.includeColumn !== false)
      .map(col => {
        const columnDefaults = getColumnTypeDefaults(col);

        // TODO: probably these mappings should be in getColumnTypeDefaults,
        // so all the mapping is in one place, easily discoverable?

        // Add alignment styling
        const physicalAlignment = col.align ?? columnDefaults.align;

        // Logical text alignment, for wide/block cell content that fills the
        // column (e.g. item names). Text columns use the logical start edge so
        // they flip naturally with direction. Numeric/date columns instead stay
        // on the physical right in both LTR and RTL, so digits line up by place
        // value for comparison (the units digit is always on the right) — they
        // take whichever logical edge is physically right in each direction.
        const textAlign =
          physicalAlignment === 'right'
            ? isRtl
              ? 'start' // RTL: the start edge is on the right
              : 'end' // LTR: the end edge is on the right
            : physicalAlignment === 'center'
              ? 'center'
              : 'start';

        // Flexbox alignment, for narrow content positioned via justifyContent
        // (numbers, icons). MRT sets every cell to align="right" in RTL,
        // applying flex-direction: row-reverse, which cancels the cell's
        // direction: rtl and leaves the flex main axis physically LTR — so
        // flex-end is physically right in both LTR and RTL.
        const alignment = !isRtl
          ? physicalAlignment
          : physicalAlignment === 'right'
            ? 'right' // numeric/date: stay right in RTL too (place-value line-up)
            : physicalAlignment === 'center'
              ? 'center'
              : 'right'; // text: the start edge is on the right in RTL
        // Build the body-cell-props chain into a LOCAL variable rather than
        // mutating `col`. Mutating the caller's column object leaks the wrapped
        // function back into the (often memoised) source `omsColumns`, so a
        // re-run would double-wrap it, and it gives every render a fresh
        // function identity on shared objects. The final value is spread into
        // the returned column below (after `...col`) so it still wins.
        let bodyCellProps = col.muiTableBodyCellProps;
        if (alignment) {
          // Alignment styling replaces any inherited cell props (this matches
          // the prior behaviour, where the assignment overwrote
          // col.muiTableBodyCellProps before the merge step below).
          bodyCellProps = params => {
            return mergeCellProps(
              {
                sx: {
                  textAlign,
                  ...(alignment === 'right'
                    ? {
                        justifyContent: 'flex-end',
                      }
                    : alignment === 'center'
                      ? // To-DO: Add padding for center aligned cells
                        { justifyContent: 'center' }
                      : {
                          // Left aligned (fallback):
                          // Padding varies based on density
                          paddingLeft:
                            params.table.getState().density === 'compact'
                              ? '0.7em'
                              : '1.2em',
                        }),
                },
              },
              params
            );
          };
        }

        // Merge any custom cell props with defaults
        if (bodyCellProps) {
          const inner = bodyCellProps;
          bodyCellProps = params => {
            return mergeCellProps(inner, params);
          };
        }

        // Default aggregation cell that shows '[multiple]' if there are multiple values, otherwise renders as normal cell
        const DefaultAggregationCell = (props: {
          cell: MRT_Cell<T, unknown>;
          column: MRT_Column<T, unknown>;
          row: MRT_Row<T>;
          table: MRT_TableInstance<T>;
          staticColumnIndex?: number;
          staticRowIndex?: number;
        }) => {
          const cellProps = {
            renderedCellValue: props.cell.renderValue()?.toString(),
            ...props,
          };
          return (
            <>
              {props.cell.getValue() === multipleKeys
                ? // show '[multiple]' if the aggregation function returned it
                  t('multiple')
                : // otherwise render the cell using the column's Cell renderer
                  // would be nice to replace this with an internal MRT component but the most suitable one (MRT_TableBodyCellValue) causes an infinite loop
                  (
                    col.Cell ??
                    // fallback to column type default Cell renderer
                    columnDefaults.Cell ??
                    // fallback to rendering the cell value as a string
                    (({ cell }) => cell.renderValue()?.toString() ?? '')
                  )(cellProps)}
            </>
          );
        };

        return {
          grow: true,
          Header: ColumnHeaderWithTooltip, // can't define this globally for the table unfortunately
          aggregationFn: defaultAggregationFn,
          GroupedCell: DefaultAggregationCell,
          AggregatedCell: DefaultAggregationCell,
          PlaceholderCell: DefaultAggregationCell,
          ...columnDefaults,
          enableGrouping: false, // removes the "group by" option from the column menu
          enableSorting: col.enableSorting ?? false,
          enableColumnFilter: col.enableColumnFilter ?? false,
          ...col,
          // Spread the locally-built cell-props chain last so it overrides the
          // raw `col.muiTableBodyCellProps` (which we intentionally did not
          // mutate above).
          ...(bodyCellProps ? { muiTableBodyCellProps: bodyCellProps } : {}),
        };
      });

    return { columns };
  }, [omsColumns, isRtl]);

  return tableDefinition;
};

// Show full column name on hover, in case it's truncated
// If we can get "click header to open column menu" working, we could probably remove the tooltip
const ColumnHeaderWithTooltip = <T extends MRT_RowData>({
  column,
}: {
  column: MRT_Column<T>;
}) => (
  <Tooltip title={column.columnDef.header} placement="top">
    <div
      style={{
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}
    >
      {column.columnDef.header}
    </div>
  </Tooltip>
);

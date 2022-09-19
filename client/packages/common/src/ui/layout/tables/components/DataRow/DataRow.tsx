import React, { FC, useEffect } from 'react';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import { Column } from '../../columns/types';
import { RecordWithId } from '@common/types';
import {
  useExpanded,
  useIsDisabled,
  useIsFocused,
  useRowStyle,
} from '../../context';
import { Fade, Tooltip } from '@mui/material';

interface DataRowProps<T extends RecordWithId> {
  columns: Column<T>[];
  rows: T[];
  onClick?: (rowData: T) => void;
  rowData: T;
  rowKey: string;
  ExpandContent?: FC<{ rowData: T; isExpanded: boolean }>;
  dense?: boolean;
  rowIndex: number;
  keyboardActivated?: boolean;
  generateRowTooltip: (row: T) => string;
}

export const DataRow = <T extends RecordWithId>({
  columns,
  onClick,
  rowData,
  rowKey,
  rowIndex,
  ExpandContent,
  dense = false,
  rows,
  keyboardActivated,
  generateRowTooltip,
}: DataRowProps<T>): JSX.Element => {
  const hasOnClick = !!onClick;
  const { isExpanded } = useExpanded(rowData.id);
  const { isDisabled } = useIsDisabled(rowData.id);
  const { isFocused } = useIsFocused(rowData.id);
  const { rowStyle } = useRowStyle(rowData.id);

  const onRowClick = () => onClick && onClick(rowData);
  const paddingX = dense ? '12px' : '16px';
  const paddingY = dense ? '4px' : 0;

  useEffect(() => {
    if (isFocused) onRowClick();
  }, [keyboardActivated]);

  return (
    <>
      <Fade in={true} timeout={500}>
        <Tooltip
          title={generateRowTooltip(rowData)}
          followCursor
          placement="bottom-start"
        >
          <TableRow
            sx={{
              '&.MuiTableRow-root': {
                '&:hover': hasOnClick
                  ? { backgroundColor: 'background.menu' }
                  : {},
              },
              color: isDisabled ? 'gray.main' : 'black',
              backgroundColor: isFocused ? 'background.menu' : null,
              alignItems: 'center',
              height: '40px',
              maxHeight: '45px',
              boxShadow: dense
                ? 'none'
                : 'inset 0 0.5px 0 0 rgba(143, 144, 166, 0.5)',
              ...rowStyle,
            }}
            onClick={onRowClick}
          >
            {columns.map((column, columnIndex) => {
              return (
                <TableCell
                  key={`${rowKey}${String(column.key)}`}
                  align={column.align}
                  sx={{
                    borderBottom: 'none',
                    overflow: 'hidden',
                    whiteSpace: 'nowrap',
                    paddingLeft: paddingX,
                    paddingRight: paddingX,
                    paddingTop: paddingY,
                    paddingBottom: paddingY,
                    ...(hasOnClick && { cursor: 'pointer' }),
                    minWidth: column.minWidth,
                    maxWidth: column.maxWidth,
                    width: column.width,
                    color: 'inherit',
                    fontSize: dense ? '12px' : '14px',
                    backgroundColor: column.backgroundColor,
                    fontWeight: 'normal',
                  }}
                >
                  <column.Cell
                    isDisabled={isDisabled}
                    rows={rows}
                    rowData={rowData}
                    columns={columns}
                    column={column}
                    rowKey={rowKey}
                    columnIndex={columnIndex}
                    rowIndex={rowIndex}
                    autocompleteName={column.autocompleteProvider?.(rowData)}
                  />
                </TableCell>
              );
            })}
          </TableRow>
        </Tooltip>
      </Fade>
      {isExpanded && !!ExpandContent ? (
        <tr>
          <td colSpan={columns.length}>
            <ExpandContent rowData={rowData} isExpanded={isExpanded} />
          </td>
        </tr>
      ) : null}
    </>
  );
};

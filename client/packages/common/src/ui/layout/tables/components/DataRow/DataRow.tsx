import React from 'react';
import { Cell } from 'react-table';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';

// eslint-disable-next-line @typescript-eslint/ban-types
interface DataRowProps<T extends object> {
  cells: Cell<T, any>[];
  onClick?: (rowValues: T) => void;
  rowData: T;
}

export const DataRow = <T extends Record<string, unknown>>({
  cells,
  onClick,
  rowData,
}: DataRowProps<T>): JSX.Element => {
  const hasOnClick = !!onClick;

  const onRowClick = () => onClick && onClick(rowData);

  return (
    <TableRow
      sx={{
        alignItems: 'center',
        height: '40px',
        maxHeight: '45px',
        boxShadow: 'inset 0 0.5px 0 0 rgba(143, 144, 166, 0.5)',
        padding: '0px 20px',
        display: 'flex',
        flex: '1 0 auto',
      }}
      onClick={onRowClick}
      hover={hasOnClick}
    >
      {cells.map(cell => {
        const cellProps = cell.getCellProps();
        const { key: cellKey } = cellProps;

        return (
          <TableCell
            key={cellKey}
            align={cell.column.align}
            sx={{
              borderBottom: 'none',
              justifyContent: 'flex-end',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              padding: 0,
              paddingRight: '16px',
              ...(hasOnClick && { cursor: 'pointer' }),
              flex: `${cell.column.width} 0 auto`,
              minWidth: cell.column.minWidth,
              width: cell.column.width,
            }}
          >
            {cell.render('Cell')}
          </TableCell>
        );
      })}
    </TableRow>
  );
};

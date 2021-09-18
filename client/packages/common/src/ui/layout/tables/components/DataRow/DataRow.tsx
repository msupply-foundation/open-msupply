import React from 'react';
import { Cell } from 'react-table';
import TableRow from '@material-ui/core/TableRow';
import TableCell from '@material-ui/core/TableCell';

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
        minWidth: '1000px',
      }}
      onClick={onRowClick}
      hover={hasOnClick}
    >
      {cells.map(cell => {
        const cellProps = cell.getCellProps();
        const { key: cellKey, style: cellStyle } = cellProps;

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
              ...cellStyle,
            }}
          >
            {cell.render('Cell')}
          </TableCell>
        );
      })}
    </TableRow>
  );
};

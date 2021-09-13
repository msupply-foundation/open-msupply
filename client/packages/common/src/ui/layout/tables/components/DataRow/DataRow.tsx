import TableRow from '@material-ui/core/TableRow';
import TableCell from '@material-ui/core/TableCell';
import React from 'react';
import { Cell } from 'react-table';

// eslint-disable-next-line @typescript-eslint/ban-types
interface DataRowProps<T extends object> {
  cells: Cell<T, any>[];
  onClick?: (rowValues: T) => void;
  values: T;
}

export const DataRow = <T extends Record<string, unknown>>({
  cells,
  onClick,
  values,
}: DataRowProps<T>): JSX.Element => {
  const hasOnClick = !!onClick;
  const onRowClick = () => onClick && onClick(values);

  return (
    <TableRow onClick={onRowClick} hover={hasOnClick}>
      {cells.map(cell => {
        const cellProps = cell.getCellProps();
        const { key: cellKey } = cellProps;

        return (
          <TableCell
            key={cellKey}
            align={cell.column.align}
            sx={{
              justifyContent: 'flex-end',
              padding: 0,
              paddingLeft: '16px',
              ...(hasOnClick && { cursor: 'pointer' }),
            }}
          >
            {cell.render('Cell')}
          </TableCell>
        );
      })}
    </TableRow>
  );
};

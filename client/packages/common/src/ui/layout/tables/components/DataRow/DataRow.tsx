import React from 'react';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import { Column } from '../../columns/types';
import { DomainObject } from '../../../../../types';

interface DataRowProps<T extends DomainObject> {
  columns: Column<T>[];
  onClick?: (rowValues: T) => void;
  rowData: T;
  rowKey: string;
}

export const DataRow = <T extends DomainObject>({
  columns,
  onClick,
  rowData,
  rowKey,
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
        display: 'flex',
        flex: '1 0 auto',
      }}
      onClick={onRowClick}
      hover={hasOnClick}
    >
      {columns.map(column => {
        return (
          <TableCell
            key={`${rowKey}${column.key}`}
            align={column.align}
            sx={{
              borderBottom: 'none',
              justifyContent: 'flex-end',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              paddingLeft: '16px',
              paddingRight: '16px',
              ...(hasOnClick && { cursor: 'pointer' }),
              flex: `${column.width} 0 auto`,
              minWidth: column.minWidth,
              width: column.width,
            }}
          >
            <column.Cell
              rowData={rowData}
              columns={columns}
              column={column}
              rowKey={rowKey}
            />
          </TableCell>
        );
      })}
    </TableRow>
  );
};

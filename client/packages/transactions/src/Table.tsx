/* eslint-disable react/jsx-key */
import React from 'react';

import { Column, Row, useTable } from 'react-table';
import clsx from 'clsx';
import {
  makeStyles,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableContainer,
  Table as MuiTable,
} from '@openmsupply-client/common';

const useStyles = makeStyles(theme => ({
  bodyCell: {
    padding: 9.5,
  },
  clickable: {
    cursor: 'pointer',
  },
  headerCell: {
    ...theme.typography.th,
  },
}));

interface TableProps {
  columns: Column[];
  data?: any[];
  onRowClick?: (row: Row) => void;
}

export const Table: React.FC<TableProps> = ({
  columns,
  data = [],
  onRowClick,
}) => {
  // console.log('-------------------------------------------');
  // console.log('re-render');
  // console.log('-------------------------------------------');

  const classes = useStyles();
  const { getTableProps, getTableBodyProps, headerGroups, rows, prepareRow } =
    useTable({
      columns,
      data,
    });

  return (
    <TableContainer>
      <MuiTable stickyHeader {...getTableProps()}>
        <TableHead>
          {headerGroups.map(({ getHeaderGroupProps, headers }) => (
            <TableRow {...getHeaderGroupProps()}>
              {headers.map(column => (
                <TableCell
                  {...column.getHeaderProps()}
                  className={classes.headerCell}
                >
                  {column.render('Header')}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableHead>
        <TableBody {...getTableBodyProps()}>
          {rows.map(row => {
            prepareRow(row);
            return (
              <TableRow
                {...row.getRowProps()}
                onClick={() => onRowClick && onRowClick(row)}
              >
                {row.cells.map(cell => {
                  return (
                    <TableCell
                      {...cell.getCellProps()}
                      className={clsx(
                        classes.bodyCell,
                        onRowClick && classes.clickable
                      )}
                    >
                      {cell.render('Cell')}
                    </TableCell>
                  );
                })}
              </TableRow>
            );
          })}
        </TableBody>
      </MuiTable>
    </TableContainer>
  );
};

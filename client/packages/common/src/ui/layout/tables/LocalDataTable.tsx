/* eslint-disable react/jsx-key */
import React from 'react';

import { Column, ColumnInstance, Row, useSortBy, useTable } from 'react-table';
import clsx from 'clsx';

import {
  Grid,
  makeStyles,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableContainer,
  Table as MuiTable,
} from '@material-ui/core';
import { SortAsc, SortDesc } from '../../icons';

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

const renderSortIcon: React.FC<ColumnInstance> = column => {
  if (!column.isSorted) return null;

  return !!column.isSortedDesc ? <SortDesc /> : <SortAsc />;
};

export const LocalDataTable: React.FC<TableProps> = ({
  columns,
  data = [],
  onRowClick,
}) => {
  // console.log('-------------------------------------------');
  // console.log('re-render');
  // console.log('-------------------------------------------');

  const classes = useStyles();
  const hasRowClick = !!onRowClick;
  const { getTableProps, getTableBodyProps, headerGroups, rows, prepareRow } =
    useTable(
      {
        columns,
        data,
      },
      useSortBy
    );

  return (
    <TableContainer>
      <MuiTable stickyHeader {...getTableProps()}>
        <TableHead>
          {headerGroups.map(({ getHeaderGroupProps, headers }) => (
            <TableRow {...getHeaderGroupProps()}>
              {headers.map(column => (
                <TableCell
                  {...column.getHeaderProps(column.getSortByToggleProps())}
                  className={classes.headerCell}
                >
                  <Grid container>
                    {column.render('Header')}
                    {renderSortIcon(column)}
                  </Grid>
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
                hover={hasRowClick}
              >
                {row.cells.map(cell => {
                  return (
                    <TableCell
                      {...cell.getCellProps()}
                      className={clsx(
                        classes.bodyCell,
                        hasRowClick && classes.clickable
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

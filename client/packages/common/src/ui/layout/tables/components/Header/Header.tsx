import React, { FC } from 'react';
import { TableCell, TableRow, TableSortLabel } from '@mui/material';
import { ObjectWithStringKeys } from '../../../../../types/utility';
import { Column } from '../../columns/types';
import { SortDescIcon } from '../../../../icons';
import { DomainObject } from '../../../../../types';

export const HeaderRow: FC = props => (
  <TableRow
    {...props}
    sx={{
      display: 'flex',
      flex: '1 0 auto',
      height: '60px',
      alignItems: 'center',
      paddingLeft: '16px',
      paddingRight: '16px',
    }}
  />
);

interface HeaderCellProps<T extends DomainObject> {
  column: Column<T>;
}

export const HeaderCell = <T extends ObjectWithStringKeys & DomainObject>({
  column,
}: HeaderCellProps<T>): JSX.Element => {
  const {
    minWidth,
    width,
    onChangeSortBy,
    key,
    sortable,
    align,
    sortBy,
    Header,
  } = column;

  const { direction, key: currentSortKey } = sortBy ?? {};

  const isSorted = key === currentSortKey;

  return (
    <TableCell
      role="columnheader"
      onClick={
        onChangeSortBy &&
        (() => {
          sortable && onChangeSortBy(column);
        })
      }
      align={align}
      padding={'none'}
      sx={{
        backgroundColor: 'transparent',
        borderBottom: '0px',
        padding: 0,
        width,
        minWidth,
        flex: `${width} 0 auto`,
        fontWeight: 'bold',
      }}
      aria-label={String(key)}
      sortDirection={isSorted ? direction : false}
    >
      {sortable ? (
        <TableSortLabel
          hideSortIcon={false}
          active={isSorted}
          direction={direction}
          IconComponent={SortDescIcon}
        >
          <Header column={column} />
        </TableSortLabel>
      ) : (
        <Header column={column} />
      )}
    </TableCell>
  );
};

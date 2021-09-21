import React, { FC, ReactNode } from 'react';
import { TableCell, TableRow, TableSortLabel } from '@mui/material';
import { KeyOf, ObjectWithStringKeys } from '../../../../../types/utility';
import { SortRule } from '../../../../../hooks/useSortBy';
import { SortDesc } from '../../../../icons';

export const HeaderRow: FC = props => (
  <TableRow
    {...props}
    sx={{
      display: 'flex',
      flex: '1 0 auto',
      height: '60px',
      paddingLeft: '20px',
      paddingRight: '20px',
      alignItems: 'center',
    }}
  />
);

interface HeaderCellProps<T extends ObjectWithStringKeys> {
  onSortBy?: (sortBy: SortRule<T>) => void;
  isSortable: boolean;
  isSorted?: boolean;
  align?: 'left' | 'right' | 'center';
  id: KeyOf<T>;
  direction?: 'asc' | 'desc';
  children: ReactNode;
  style: React.CSSProperties;
}

export const HeaderCell = <T extends ObjectWithStringKeys>({
  onSortBy,
  isSortable,
  isSorted,
  align,
  id,
  direction,
  children,
  style,
}: HeaderCellProps<T>): JSX.Element => {
  return (
    <TableCell
      role="columnheader"
      onClick={onSortBy && (() => onSortBy({ key: id }))}
      align={align}
      padding={'none'}
      colSpan={1}
      sx={{
        backgroundColor: 'transparent',
        borderBottom: '0px',
        padding: 0,
        paddingRight: '16px',
        width: style.width,
        maxWidth: style.maxWidth,
        minWidth: style.minWidth,
        flex: style.flex,
        fontWeight: 'bold',
      }}
      aria-label={id}
      sortDirection={isSorted ? direction : false}
    >
      {isSortable ? (
        <TableSortLabel
          hideSortIcon={false}
          active={isSorted}
          direction={direction}
          IconComponent={SortDesc}
        >
          {children}
        </TableSortLabel>
      ) : (
        children
      )}
    </TableCell>
  );
};

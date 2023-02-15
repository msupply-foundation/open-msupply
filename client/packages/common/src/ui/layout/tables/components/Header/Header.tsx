import React, { FC, PropsWithChildren } from 'react';
import { TableCell, TableRow, TableSortLabel, Tooltip } from '@mui/material';
import { Column, ColumnAlign } from '../../columns/types';
import { InfoOutlineIcon, SortDescIcon } from '@common/icons';
import { RecordWithId } from '@common/types';
import { useDebounceCallback } from '@common/hooks';
import { useTranslation } from '@common/intl';

export const HeaderRow: FC<PropsWithChildren<{ dense?: boolean }>> = ({
  dense,
  ...props
}) => (
  <TableRow
    {...props}
    sx={{
      height: !!dense ? '40px' : '60px',
    }}
  />
);

interface HeaderCellProps<T extends RecordWithId> {
  column: Column<T>;
  dense?: boolean;
}

const getDirection = (align: ColumnAlign) => {
  switch (align) {
    case ColumnAlign.Center:
      return 'center';
    case ColumnAlign.Right:
      return 'flex-end';
    default:
      return 'flex-start';
  }
};

export const HeaderCell = <T extends RecordWithId>({
  column,
  dense = false,
}: HeaderCellProps<T>): JSX.Element => {
  const {
    maxWidth,
    minWidth,
    width,
    onChangeSortBy,
    key,
    sortable,
    align,
    sortBy,
    Header,
    description,
  } = column;

  const { direction, key: currentSortKey } = sortBy ?? {};
  const t = useTranslation('common');
  const isSorted = key === currentSortKey;

  const onSort = useDebounceCallback(
    () => onChangeSortBy && sortable && onChangeSortBy(column),
    [column],
    150
  );

  const showTooltip = !!description || sortable;
  const tooltip = showTooltip ? (
    <>
      {!!description && <div>{t(description)}</div>}
      {sortable && <div>{t('label.click-to-sort')}</div>}
    </>
  ) : (
    ''
  );
  const infoIcon = showTooltip ? (
    <InfoOutlineIcon
      sx={{
        color: 'gray.light',
        height: '16px',
        marginLeft: 0.5,
        width: '16px',
      }}
    />
  ) : null;
  const HeaderLabel = sortable ? (
    <TableSortLabel
      sx={{ flexDirection: getDirection(column.align), display: 'flex' }}
      hideSortIcon={false}
      active={isSorted}
      direction={direction}
      IconComponent={SortDescIcon}
    >
      <Header column={column} />
      {infoIcon}
    </TableSortLabel>
  ) : (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: getDirection(column.align),
      }}
    >
      <Header column={column} />
      {infoIcon}
    </div>
  );

  return (
    <TableCell
      role="columnheader"
      onClick={onSort}
      align={align}
      padding={'none'}
      sx={{
        backgroundColor: 'transparent',
        borderBottom: '0px',
        paddingLeft: '16px',
        paddingRight: '16px',
        width,
        minWidth,
        maxWidth,
        fontWeight: 'bold',
        fontSize: dense ? '12px' : '14px',
        flexDirection: 'row',
      }}
      aria-label={String(key)}
      sortDirection={isSorted ? direction : false}
    >
      <Tooltip
        title={tooltip}
        placement="bottom"
        style={{ whiteSpace: 'pre-line' }}
      >
        {HeaderLabel}
      </Tooltip>
    </TableCell>
  );
};

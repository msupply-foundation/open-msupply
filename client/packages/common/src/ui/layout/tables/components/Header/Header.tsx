import React, { FC, PropsWithChildren } from 'react';
import { TableCell, TableRow, TableSortLabel, Tooltip } from '@mui/material';
import { Column } from '../../columns/types';
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
  const t = useTranslation();
  const isSorted = key === currentSortKey;

  // Changes sort key or, if the sort key is already selected, toggles the sort direction.
  const onSort = useDebounceCallback(
    () => {
      if (!onChangeSortBy || !sortable) return;

      if (key !== currentSortKey) {
        // change sort key
        onChangeSortBy(key as string, 'asc');
      } else {
        // toggle sort direction
        const dir = direction === 'desc' ? 'asc' : 'desc';
        onChangeSortBy(key as string, dir);
      }
    },
    [sortable, key, currentSortKey, direction, onChangeSortBy],
    150
  );

  const columnLabel =
    column.label === '' ? '' : t(column.label, column.labelProps);
  const tooltip =
    !description && !sortable && !columnLabel ? null : (
      <>
        {!!description && <div>{t(description)}</div>}
        {sortable ? (
          <div>
            {t('label.click-to-sort')}
            {` ${columnLabel}`}
          </div>
        ) : (
          columnLabel
        )}
      </>
    );

  const infoIcon = !!description ? (
    <InfoOutlineIcon
      sx={{
        color: 'gray.light',
        height: '16px',
        marginLeft: 0.5,
        width: '16px',
      }}
    />
  ) : null;
  const child = (
    <div
      style={{
        flexWrap: 'nowrap',
        alignItems: 'center',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}
    >
      <Header column={column} />
      {infoIcon}
    </div>
  );

  const HeaderLabel = sortable ? (
    <TableSortLabel
      hideSortIcon={false}
      active={isSorted}
      direction={direction}
      IconComponent={SortDescIcon}
      sx={{ maxWidth: maxWidth }}
    >
      {child}
    </TableSortLabel>
  ) : (
    child
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
        verticalAlign: 'bottom',
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

import React, { FC, PropsWithChildren } from 'react';
import {
  SxProps,
  TableCell,
  TableRow,
  TableSortLabel,
  Tooltip,
} from '@mui/material';
import { Column } from '../../columns/types';
import { InfoOutlineIcon, SortDescIcon } from '@common/icons';
import { RecordWithId } from '@common/types';
import { useDebounceCallback } from '@common/hooks';
import {
  LocaleKey,
  useTranslationExistsInLocale,
  useTranslation,
} from '@common/intl';
import { tooltipPlacement } from '../tooltipPlacement';

export const HeaderRow: FC<
  PropsWithChildren<{ dense?: boolean; sx?: SxProps }>
> = ({ dense, sx, ...props }) => (
  <TableRow
    {...props}
    sx={{
      height: !!dense ? '40px' : '60px',
      ...sx,
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

  const labelExistsInLocale = useTranslationExistsInLocale(column.label);
  const columnLabel = labelExistsInLocale
    ? t(column.label as LocaleKey, column.labelProps)
    : column.label;
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
          !description && columnLabel
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
        flexDirection: 'column',
      }}
    >
      <div
        style={{
          display: 'block',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          maxHeight: '3em',
          lineHeight: '1.5em',
        }}
      >
        <Header column={column} />
      </div>
      {infoIcon && (
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          {infoIcon}
        </div>
      )}
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
        placement={tooltipPlacement(align)}
        style={{ whiteSpace: 'pre-line' }}
      >
        {HeaderLabel}
      </Tooltip>
    </TableCell>
  );
};

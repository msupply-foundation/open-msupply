import React, { FC, PropsWithChildren, ReactElement, useEffect } from 'react';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import { alpha } from '@mui/material/styles';
import { Column } from '../../columns/types';
import { RecordWithId } from '@common/types';
import {
  useExpanded,
  useIsDisabled,
  useIsFocused,
  useRowStyle,
} from '../../context';
import { Fade, Tooltip } from '@mui/material';
import { TypedTFunction, LocaleKey } from '@common/intl';

interface DataRowProps<T extends RecordWithId> {
  columns: Column<T>[];
  rows: T[];
  onClick?: (rowData: T) => void;
  rowData: T;
  rowKey: string;
  ExpandContent?: FC<{ rowData: T; isExpanded: boolean }>;
  dense?: boolean;
  rowIndex: number;
  keyboardActivated?: boolean;
  generateRowTooltip: (row: T) => string;
  localisedText: TypedTFunction<LocaleKey>;
  localisedDate: (date: string | number | Date) => string;
  isAnimated: boolean;
}

export const DataRow = <T extends RecordWithId>({
  columns,
  onClick,
  rowData,
  rowKey,
  rowIndex,
  ExpandContent,
  dense = false,
  rows,
  keyboardActivated,
  generateRowTooltip,
  localisedText,
  localisedDate,
  isAnimated,
}: DataRowProps<T>): JSX.Element => {
  const hasOnClick = !!onClick;
  const { isExpanded } = useExpanded(rowData.id);
  const { isDisabled } = useIsDisabled(rowData.id);
  const { isFocused } = useIsFocused(rowData.id);
  const { rowStyle } = useRowStyle(rowData.id);

  const onRowClick = () => onClick && onClick(rowData);
  const paddingX = dense ? '12px' : '16px';
  const paddingY = dense ? '4px' : 0;
  const Animation: FC<PropsWithChildren> = ({ children }) =>
    isAnimated ? (
      <Fade in={true} timeout={500}>
        {children as ReactElement}
      </Fade>
    ) : (
      <>{children}</>
    );

  useEffect(() => {
    if (isFocused) onRowClick();
  }, [keyboardActivated]);

  return (
    <>
      <Animation>
        <Tooltip
          title={generateRowTooltip(rowData)}
          followCursor
          placement="bottom-start"
        >
          <TableRow
            sx={{
              backgroundColor: isFocused
                ? theme => alpha(theme.palette.secondary.main, 0.1)
                : null,
              '&.MuiTableRow-root': {
                '&:nth-of-type(even)': {
                  backgroundColor: 'background.toolbar',
                },
                '&:hover': hasOnClick
                  ? theme => ({
                      backgroundColor: alpha(theme.palette.secondary.main, 0.1),
                    })
                  : {},
              },
              color: isDisabled ? 'gray.main' : 'black',
              alignItems: 'center',
              height: '40px',
              maxHeight: '45px',
              boxShadow: dense
                ? 'none'
                : theme =>
                    `inset 0 0.5px 0 0 ${alpha(theme.palette.gray.main, 0.5)}`,
              ...rowStyle,
            }}
            onClick={onRowClick}
          >
            {columns.map((column, columnIndex) => {
              return (
                <TableCell
                  key={`${rowKey}${String(column.key)}`}
                  align={column.align}
                  sx={{
                    borderBottom: 'none',
                    overflow: 'hidden',
                    whiteSpace: 'nowrap',
                    paddingLeft: paddingX,
                    paddingRight: paddingX,
                    paddingTop: paddingY,
                    paddingBottom: paddingY,
                    ...(hasOnClick && { cursor: 'pointer' }),
                    minWidth: column.minWidth,
                    maxWidth: column.maxWidth,
                    width: column.width,
                    color: 'inherit',
                    fontSize: dense ? '12px' : '14px',
                    backgroundColor: column.backgroundColor,
                    fontWeight: 'normal',
                  }}
                >
                  {
                    <column.Cell
                      isDisabled={isDisabled}
                      rows={rows}
                      rowData={rowData}
                      columns={columns}
                      column={column}
                      rowKey={rowKey}
                      columnIndex={columnIndex}
                      rowIndex={rowIndex}
                      autocompleteName={column.autocompleteProvider?.(rowData)}
                      localisedText={localisedText}
                      localisedDate={localisedDate}
                    />
                  }
                </TableCell>
              );
            })}
          </TableRow>
        </Tooltip>
      </Animation>
      {isExpanded && !!ExpandContent ? (
        <tr>
          <td colSpan={columns.length}>
            <ExpandContent rowData={rowData} isExpanded={isExpanded} />
          </td>
        </tr>
      ) : null}
    </>
  );
};

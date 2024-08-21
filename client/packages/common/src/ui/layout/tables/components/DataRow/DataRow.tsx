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
  onClick?: (rowData: T) => void;
  rowData: T;
  rowKey: string;
  ExpandContent?: FC<{ rowData: T; isExpanded: boolean }>;
  dense?: boolean;
  rowIndex: number;
  keyboardActivated?: boolean;
  generateRowTooltip?: (row: T) => string;
  localisedText: TypedTFunction<LocaleKey>;
  localisedDate: (date: string | number | Date) => string;
  isAnimated: boolean;
}
const Animation: FC<PropsWithChildren<{ isAnimated: boolean }>> = ({
  children,
  isAnimated,
}) =>
  isAnimated ? (
    <Fade in={true} timeout={500}>
      {children as ReactElement}
    </Fade>
  ) : (
    <>{children}</>
  );

const DataRowComponent = <T extends RecordWithId>({
  columns,
  onClick,
  rowData,
  rowKey,
  rowIndex,
  ExpandContent,
  dense = false,
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
  const rowTitle = generateRowTooltip?.(rowData) ?? '';

  useEffect(() => {
    if (isFocused) onRowClick();
  }, [keyboardActivated]);

  return (
    <>
      <Animation isAnimated={isAnimated}>
        <Tooltip title={rowTitle} followCursor placement="bottom-start">
          <TableRow
            key={`tr-${rowKey}`}
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
              const isError = column.getIsError?.(rowData);
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
                    ...(isError
                      ? {
                          borderWidth: '2px',
                          borderStyle: 'solid',
                          borderColor: 'error.main',
                          borderRadius: '8px',
                        }
                      : {}),
                  }}
                >
                  {
                    <column.Cell
                      isDisabled={isDisabled || column.getIsDisabled?.(rowData)}
                      rowData={rowData}
                      columns={columns}
                      isError={isError}
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
        <tr key={`${rowKey}_expando`}>
          <td colSpan={columns.length}>
            <ExpandContent rowData={rowData} isExpanded={isExpanded} />
          </td>
        </tr>
      ) : null}
    </>
  );
};

export const DataRow = React.memo(DataRowComponent) as typeof DataRowComponent;

import React, { MouseEvent, useEffect } from 'react';
import { Box, Paper, Typography, Chip, alpha } from '@mui/material';
import { RecordWithId } from '@common/types';
import { TypedTFunction, LocaleKey } from '@common/intl';
import { Column } from '../../columns/types';
import { useIsDisabled, useIsFocused, useRowStyle } from '../../context';

interface MobileCardListProps<T extends RecordWithId> {
  columns: Column<T>[];
  onClick?: (rowData: T) => void;
  rowData: T;
  rowKey: string;
  rowIndex: number;
  keyboardActivated?: boolean;
  generateRowTooltip?: (row: T) => string;
  localisedText: TypedTFunction<LocaleKey>;
  localisedDate: (date: string | number | Date) => string;
  isAnimated: boolean;
}

export const MobileCardList = <T extends RecordWithId>({
  columns,
  onClick,
  rowData,
  rowKey,
  rowIndex,
  keyboardActivated,
  localisedText: t,
  localisedDate,
  generateRowTooltip,
}: MobileCardListProps<T>): JSX.Element => {
  const hasOnClick = !!onClick;
  const { isDisabled } = useIsDisabled(rowData.id);
  const { isFocused } = useIsFocused(rowData.id);
  const { rowStyle } = useRowStyle(rowData.id);
  const tooltip = generateRowTooltip?.(rowData);

  const handleClick = (e: MouseEvent) => {
    if (onClick) {
      e.stopPropagation();
      onClick(rowData);
    }
  };

  const primaryColumn =
    columns
      .filter(col => col.key !== 'selection')
      .find(
        col =>
          col.key === 'otherPartyName' ||
          col.key === 'title' ||
          col.key === 'name' ||
          col.key === 'code'
      ) ||
    columns.find(col => col.key !== 'selection') ||
    columns[0];

  const statusColumn = columns.find(col => col.key === 'status');

  const displayableColumns = columns
    .filter(
      col =>
        col.Cell &&
        col.key !== primaryColumn?.key &&
        col.key !== statusColumn?.key &&
        col.key !== 'selection'
    )
    .slice(0, 3);

  useEffect(() => {
    if (isFocused && keyboardActivated && onClick) onClick(rowData);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyboardActivated, isFocused]);

  const isEvenRow = rowIndex % 2 === 0;

  return (
    <Paper
      elevation={2}
      role="listitem"
      title={tooltip}
      sx={{
        my: 1.5,
        position: 'relative',
        borderRadius: 2,
        overflow: 'hidden',
        border: '2px solid',
        borderColor: 'divider',
        borderLeft: '2px solid',
        borderLeftColor: 'primary.light',
        opacity: isDisabled ? 0.7 : 1,
        backgroundColor: isFocused
          ? theme => alpha(theme.palette.secondary.light, 0.15)
          : isEvenRow
            ? 'background.paper'
            : 'background.toolbar',
        '&:hover': hasOnClick
          ? {
              backgroundColor: theme =>
                alpha(theme.palette.secondary.main, 0.1),
              transform: 'translateY(-2px)',
              boxShadow: 3,
              borderColor: theme => theme.palette.primary.light,
            }
          : {},
        ...rowStyle,
      }}
    >
      <Box
        onClick={handleClick}
        sx={{
          display: 'flex',
          flexDirection: 'column',
          padding: 2,
          cursor: hasOnClick ? 'pointer' : 'default',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            pb: 1.5,
            borderBottom: '2px solid',
            borderColor: 'divider',
            mb: 1.5,
          }}
        >
          <Typography
            variant="h6"
            fontWeight="medium"
            sx={{
              wordBreak: 'break-word',
              flexGrow: 1,
              pr: statusColumn ? 1 : 0,
            }}
            color="textPrimary"
          >
            {primaryColumn?.Cell && (
              <primaryColumn.Cell
                isDisabled={
                  isDisabled || primaryColumn.getIsDisabled?.(rowData)
                }
                rowData={rowData}
                columns={columns}
                isError={primaryColumn.getIsError?.(rowData)}
                column={primaryColumn}
                rowKey={rowKey}
                columnIndex={0}
                rowIndex={rowIndex}
                autocompleteName={primaryColumn.autocompleteProvider?.(rowData)}
                localisedText={t}
                localisedDate={localisedDate}
                {...primaryColumn.cellProps}
              />
            )}
          </Typography>
          {statusColumn?.Cell && (
            <Chip
              size="small"
              label={
                <statusColumn.Cell
                  isDisabled={
                    isDisabled || statusColumn.getIsDisabled?.(rowData)
                  }
                  rowData={rowData}
                  columns={columns}
                  isError={statusColumn.getIsError?.(rowData)}
                  column={statusColumn}
                  rowKey={rowKey}
                  columnIndex={0}
                  rowIndex={rowIndex}
                  autocompleteName={statusColumn.autocompleteProvider?.(
                    rowData
                  )}
                  localisedText={t}
                  localisedDate={localisedDate}
                  {...statusColumn.cellProps}
                />
              }
              sx={{
                ml: 1,
                border: '1px solid',
                borderColor: 'divider',
                alignSelf: 'flex-start',
              }}
            />
          )}
        </Box>
        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
          {displayableColumns.map((column, index) => (
            <Box
              key={`${rowKey}-${index}`}
              sx={{
                display: 'flex',
                py: 0.75,
                px: 0.5,
                borderBottom:
                  index < displayableColumns.length - 1 ? '1px solid' : 'none',
                borderColor: 'divider',
                position: 'relative',
                ...(column.getIsError?.(rowData) && {
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    left: -8,
                    top: 0,
                    bottom: 0,
                    width: 3,
                    backgroundColor: 'error.main',
                    borderRadius: 4,
                  },
                }),
              }}
            >
              {column.label && (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{
                    width: '35%',
                    flexShrink: 0,
                    fontWeight: 500,
                    pr: 2,
                  }}
                >
                  {t(column.label as LocaleKey)}
                </Typography>
              )}
              <Box sx={{ flexGrow: 1 }}>
                {column.Cell && (
                  <column.Cell
                    isDisabled={isDisabled || column.getIsDisabled?.(rowData)}
                    rowData={rowData}
                    columns={columns}
                    isError={column.getIsError?.(rowData)}
                    column={column}
                    rowKey={rowKey}
                    columnIndex={index + 1}
                    rowIndex={rowIndex}
                    autocompleteName={column.autocompleteProvider?.(rowData)}
                    localisedText={t}
                    localisedDate={localisedDate}
                    {...column.cellProps}
                  />
                )}
              </Box>
            </Box>
          ))}
        </Box>
      </Box>
    </Paper>
  );
};

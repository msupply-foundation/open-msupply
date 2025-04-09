import React, { MouseEvent } from 'react';
import { Box, Paper, Typography, Chip } from '@mui/material';
import { RecordWithId } from '@common/types';
import { TypedTFunction, LocaleKey } from '@common/intl';
import { Column } from '../../columns/types';
import { useIsDisabled, useRowStyle } from '../../context';

interface MobileCardListProps<T extends RecordWithId> {
  columns: Column<T>[];
  onClick?: (rowData: T) => void;
  rowData: T;
  rowKey: string;
  rowIndex: number;
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
  localisedText: t,
  localisedDate,
  generateRowTooltip,
}: MobileCardListProps<T>): JSX.Element => {
  const hasOnClick = !!onClick;
  const { isDisabled } = useIsDisabled(rowData.id);
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
    .slice(0, 4);

  return (
    <Paper
      elevation={1}
      title={tooltip}
      sx={{
        my: 1,
        position: 'relative',
        borderRadius: 1.5,
        overflow: 'hidden',
        border: '1px solid',
        borderColor: 'divider',
        borderLeft: '3px solid',
        borderLeftColor: 'primary.light',
        opacity: isDisabled ? 0.5 : 1,
        ...rowStyle,
      }}
    >
      <Box
        onClick={handleClick}
        sx={{
          display: 'flex',
          flexDirection: 'column',
          padding: 1.25,
          cursor: hasOnClick ? 'pointer' : 'default',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            pb: 1,
            borderBottom: '1px solid',
            borderColor: 'divider',
            mb: 1,
          }}
        >
          <Typography
            variant="subtitle1"
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
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
          }}
        >
          {displayableColumns.map((column, index) => (
            <Box
              key={`${rowKey}-${index}`}
              sx={{
                width: 'calc(50% - 8px)',
                padding: 0.5,
                boxSizing: 'border-box',
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'row',
                  position: 'relative',
                  width: '100%',
                }}
              >
                {column.label && (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{
                      pr: 2,
                      alignSelf: 'center',
                      flexShrink: 0,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {t(column.label as LocaleKey)}:
                  </Typography>
                )}
                <Typography
                  variant="body2"
                  sx={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {column.Cell && (
                    <column.Cell
                      isDisabled={isDisabled || column.getIsDisabled?.(rowData)}
                      rowData={rowData}
                      columns={columns}
                      isError={column.getIsError?.(rowData)}
                      column={column}
                      rowKey={rowKey}
                      columnIndex={index + 1}
                      rowIndex={Math.floor(index / 3)}
                      autocompleteName={column.autocompleteProvider?.(rowData)}
                      localisedText={t}
                      localisedDate={localisedDate}
                      {...column.cellProps}
                    />
                  )}
                </Typography>
              </Box>
            </Box>
          ))}
        </Box>
      </Box>
    </Paper>
  );
};

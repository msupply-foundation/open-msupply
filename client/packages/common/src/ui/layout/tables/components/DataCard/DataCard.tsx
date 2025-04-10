import React, { MouseEvent, useState } from 'react';
import { Box, Collapse, Paper } from '@mui/material';
import { RecordWithId } from '@common/types';
import { TypedTFunction, LocaleKey } from '@common/intl';
import { CardColumnType, Column } from '../../columns/types';
import { useIsDisabled, useRowStyle } from '../../context';
import { CardHeader } from './CardHeader';
import { CardContent } from './CardContent';
import { CardFooter } from './CardFooter';

const COLUMN_LENGTH = 4;

interface DataCardProps<T extends RecordWithId> {
  columns: Column<T>[];
  onClick?: (rowData: T) => void;
  rowData: T;
  rowKey: string;
  rowIndex: number;
  generateRowTooltip?: (row: T) => string;
  localisedText: TypedTFunction<LocaleKey>;
  localisedDate: (date: string | number | Date) => string;
}

export const DataCard = <T extends RecordWithId>({
  columns,
  onClick,
  rowData,
  rowKey,
  rowIndex,
  localisedText,
  localisedDate,
  generateRowTooltip,
}: DataCardProps<T>): JSX.Element => {
  const hasOnClick = !!onClick;
  const { rowStyle } = useRowStyle(rowData.id);
  const tooltip = generateRowTooltip?.(rowData);
  const { isDisabled } = useIsDisabled(rowData.id);
  const [showAllColumns, setShowAllColumns] = useState(false);

  const primaryColumn = columns.find(
    column => column.cardColumnType === CardColumnType.Primary
  );

  const statusColumn = columns.find(
    column => column.cardColumnType === CardColumnType.Status
  );

  const displayableColumns = columns.filter(
    column =>
      column.Cell &&
      column.cardColumnType !== CardColumnType.Primary &&
      column.cardColumnType !== CardColumnType.Status &&
      column.key !== 'selection'
  );

  const initialColumns = displayableColumns.slice(0, COLUMN_LENGTH);
  const extraColumns = displayableColumns.slice(COLUMN_LENGTH);
  const hasMoreColumns = extraColumns.length > 0;

  const handleClick = (e: MouseEvent) => {
    if (onClick) {
      e.stopPropagation();
      onClick(rowData);
    }
  };

  const handleExpandClick = (e: MouseEvent) => {
    e.stopPropagation();
    setShowAllColumns(!showAllColumns);
  };

  return (
    <Paper
      elevation={1}
      title={tooltip}
      sx={{
        my: 1,
        borderRadius: 1.5,
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
          pt: 1.5,
          px: 1.5,
          display: 'flex',
          flexDirection: 'column',
          cursor: hasOnClick ? 'pointer' : 'default',
        }}
      >
        <CardHeader
          rowData={rowData}
          columns={columns}
          primaryColumn={primaryColumn}
          statusColumn={statusColumn}
          rowKey={rowKey}
          rowIndex={rowIndex}
          localisedText={localisedText}
          localisedDate={localisedDate}
          isDisabled={isDisabled}
        />
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
          }}
        >
          {initialColumns.map((column, index) => (
            <CardContent
              key={`${rowKey}-${index}`}
              column={column}
              columns={columns}
              rowData={rowData}
              rowKey={rowKey}
              rowIndex={index}
              isDisabled={isDisabled}
              localisedText={localisedText}
              localisedDate={localisedDate}
            />
          ))}
          {hasMoreColumns && (
            <Collapse in={showAllColumns} timeout={300} sx={{ width: '100%' }}>
              <Box sx={{ display: 'flex', flexWrap: 'wrap' }}>
                {extraColumns.map((column, index) => (
                  <CardContent
                    key={`${rowKey}-${index}`}
                    column={column}
                    columns={columns}
                    rowKey={rowKey}
                    rowIndex={index}
                    rowData={rowData}
                    isDisabled={isDisabled}
                    localisedText={localisedText}
                    localisedDate={localisedDate}
                  />
                ))}
              </Box>
            </Collapse>
          )}
          <CardFooter
            hasMoreColumns={hasMoreColumns}
            showAllColumns={showAllColumns}
            handleExpandClick={handleExpandClick}
          />
        </Box>
      </Box>
    </Paper>
  );
};

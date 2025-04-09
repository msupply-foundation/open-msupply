import React, { MouseEvent, useState } from 'react';
import { Box, Collapse, Paper } from '@mui/material';
import { RecordWithId } from '@common/types';
import { TypedTFunction, LocaleKey } from '@common/intl';
import { Column } from '../../columns/types';
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
  isAnimated: boolean;
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
  const { isDisabled } = useIsDisabled(rowData.id);
  const { rowStyle } = useRowStyle(rowData.id);
  const tooltip = generateRowTooltip?.(rowData);
  const [showAllColumns, setShowAllColumns] = useState(false);

  // Need to manage this information at the useColumn hook
  // e.g. have a column type that tells if it is a primary column or a status column
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

  const displayableColumns = columns.filter(
    col =>
      col.Cell &&
      col.key !== primaryColumn?.key &&
      col.key !== statusColumn?.key &&
      col.key !== 'selection'
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
              rowData={rowData}
              rowKey={rowKey}
              index={index}
              isDisabled={isDisabled}
              localisedText={localisedText}
              localisedDate={localisedDate}
              columns={columns}
            />
          ))}
          {hasMoreColumns && (
            <Collapse in={showAllColumns} timeout={300} sx={{ width: '100%' }}>
              <Box sx={{ display: 'flex', flexWrap: 'wrap' }}>
                {extraColumns.map((column, index) => (
                  <CardContent
                    key={`${rowKey}-${index}`}
                    column={column}
                    rowData={rowData}
                    rowKey={rowKey}
                    index={index}
                    isDisabled={isDisabled}
                    localisedText={localisedText}
                    localisedDate={localisedDate}
                    columns={columns}
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

import React, { ReactElement } from 'react';
import { Typography, Chip, Box } from '@mui/material';
import { Column } from '../../columns/types';
import { RecordWithId } from '@common/types';
import { LocaleKey, TypedTFunction } from '@common/intl';

interface CardHeaderProps<T extends RecordWithId> {
  columns: Column<T>[];
  rowKey: string;
  rowIndex: number;
  rowData: T;
  isDisabled: boolean;
  statusColumn: Column<T> | undefined;
  primaryColumn: Column<T> | undefined;
  localisedText: TypedTFunction<LocaleKey>;
  localisedDate: (date: string | number | Date) => string;
}

export const CardHeader = <T extends RecordWithId>({
  columns,
  rowKey,
  rowData,
  rowIndex,
  isDisabled,
  primaryColumn,
  statusColumn,
  localisedText,
  localisedDate,
}: CardHeaderProps<T>): ReactElement => {
  return (
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
        color="textPrimary"
        sx={{
          flexGrow: 1,
          wordBreak: 'break-word',
          pr: statusColumn ? 1 : 0,
          fontWeight: 'medium',
        }}
      >
        {primaryColumn?.Cell && (
          <primaryColumn.Cell
            column={primaryColumn}
            columns={columns}
            columnIndex={0}
            rowKey={rowKey}
            rowData={rowData}
            rowIndex={rowIndex}
            localisedText={localisedText}
            localisedDate={localisedDate}
            isError={primaryColumn.getIsError?.(rowData)}
            isDisabled={isDisabled || primaryColumn.getIsDisabled?.(rowData)}
            autocompleteName={primaryColumn.autocompleteProvider?.(rowData)}
            {...primaryColumn.cellProps}
          />
        )}
      </Typography>
      {statusColumn?.Cell && (
        <Chip
          size="small"
          label={
            <statusColumn.Cell
              column={statusColumn}
              columns={columns}
              columnIndex={0}
              rowKey={rowKey}
              rowData={rowData}
              rowIndex={rowIndex}
              localisedText={localisedText}
              localisedDate={localisedDate}
              isError={statusColumn.getIsError?.(rowData)}
              isDisabled={isDisabled || statusColumn.getIsDisabled?.(rowData)}
              autocompleteName={statusColumn.autocompleteProvider?.(rowData)}
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
  );
};

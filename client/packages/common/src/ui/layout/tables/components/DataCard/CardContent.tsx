import React, { ReactElement } from 'react';
import { RecordWithId } from '@common/types';
import { Box, Typography } from '@mui/material';
import { LocaleKey, TypedTFunction } from '@common/intl';
import { Column } from '../../columns';

interface CardContentProps<T extends RecordWithId> {
  column: Column<T>;
  columns: Column<T>[];
  rowData: T;
  rowKey: string;
  rowIndex: number;
  isDisabled: boolean;
  localisedText: TypedTFunction<LocaleKey>;
  localisedDate: (date: string | number | Date) => string;
}

export const CardContent = <T extends RecordWithId>({
  column,
  columns,
  rowData,
  rowKey,
  rowIndex,
  isDisabled,
  localisedText: t,
  localisedDate,
}: CardContentProps<T>): ReactElement => {
  return (
    <Box
      key={`${rowKey}-${rowIndex}`}
      sx={{
        p: 0.5,
        width: '50%',
        boxSizing: 'border-box',
      }}
    >
      <Box
        sx={{
          width: '100%',
          display: 'flex',
          flexDirection: 'row',
          position: 'relative',
        }}
      >
        {column.label && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              pr: 2,
              flexShrink: 0,
              fontWeight: 'bold',
              alignSelf: 'center',
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
            whiteSpace: 'nowrap',
            textOverflow: 'ellipsis',
          }}
        >
          {column.Cell && (
            <column.Cell
              column={column}
              columns={columns}
              columnIndex={rowIndex + 1}
              rowKey={rowKey}
              rowData={rowData}
              rowIndex={Math.floor(rowIndex / 3)}
              localisedText={t}
              localisedDate={localisedDate}
              isError={column.getIsError?.(rowData)}
              isDisabled={isDisabled || column.getIsDisabled?.(rowData)}
              autocompleteName={column.autocompleteProvider?.(rowData)}
              {...column.cellProps}
            />
          )}
        </Typography>
      </Box>
    </Box>
  );
};

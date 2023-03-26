import React, { ReactElement } from 'react';
import { CellProps, HeaderProps } from '../columns/types';
import { RecordWithId } from '@common/types';
import { useTranslation } from '@common/intl';
import { Box } from '@mui/material';

export * from './DataRow';
export * from './Cells';
export * from './Header';
export * from './Expand';

export const BasicCell = <T extends RecordWithId>({
  column,
  rowData,
  localisedText,
  localisedDate,
  isError,
}: CellProps<T>): ReactElement => (
  <Box
    sx={{
      border: theme =>
        isError ? `2px solid ${theme.palette.error.main}` : 'none',
      borderRadius: '8px',
      padding: '4px 8px',
    }}
  >
    <div
      style={{
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}
    >
      {column.formatter(column.accessor({ rowData }), {
        t: localisedText,
        d: localisedDate,
      })}
    </div>
  </Box>
);

export const BasicHeader = <T extends RecordWithId>({
  column,
}: HeaderProps<T>): ReactElement => {
  const t = useTranslation();
  const header = column.label === '' ? '' : t(column.label, column.labelProps);
  return <>{header}</>;
};

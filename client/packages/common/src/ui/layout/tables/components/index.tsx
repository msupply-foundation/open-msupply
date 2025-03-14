import React, { FC, PropsWithChildren, ReactElement } from 'react';
import { CellProps, HeaderProps } from '../columns/types';
import { RecordWithId } from '@common/types';
import {
  LocaleKey,
  useTranslationExistsInLocale,
  useTranslation,
} from '@common/intl';
import { Box } from '@mui/material';

export * from './DataRow';
export * from './Cells';
export * from './Header';
export * from './Expand';

export const BasicCellLayout: FC<
  PropsWithChildren<{ isError?: boolean; width?: number }>
> = ({ children, isError, width }) => (
  <Box
    sx={{
      border: theme =>
        isError ? `2px solid ${theme.palette.error.main}` : 'none',
      borderRadius: '8px',
      padding: '4px 8px',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      width,
    }}
  >
    {children}
  </Box>
);

export const BasicCell = <T extends RecordWithId>({
  column,
  rowData,
  localisedText,
  localisedDate,
}: CellProps<T>): ReactElement => (
  <>
    {column.formatter(column.accessor({ rowData }), {
      t: localisedText,
      d: localisedDate,
    })}
  </>
);

export const BasicHeader = <T extends RecordWithId>({
  column,
}: HeaderProps<T>): ReactElement => {
  const t = useTranslation();
  const labelExistsInLocale = useTranslationExistsInLocale(column.label);
  const header = labelExistsInLocale
    ? t(column.label as LocaleKey, column.labelProps)
    : column.label;

  return <>{header}</>;
};

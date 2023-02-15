import React from 'react';
import { styled, Typography } from '@mui/material';
import { AutocompleteOptionRenderer } from './types';
import { RecordWithId } from '@common/types';

export const DefaultAutocompleteItemOption = styled('li')(({ theme }) => ({
  color: theme.palette.gray.main,
  backgroundColor: theme.palette.background.toolbar,
}));

type Option<T> = { label: string } & T;

export type OptionMapper<T extends { [K in keyof T]: T[K] }> = (
  options: T[],
  key: keyof T
) => Option<T>[];

export const defaultOptionMapper = <T extends { [K in keyof T]: T[K] }>(
  options: T[],
  key: keyof T
): Option<T>[] => {
  return options.map(option => ({ label: String(option[key]), ...option }));
};

export const getDefaultOptionRenderer: <T>(
  key: keyof T
) => AutocompleteOptionRenderer<T> = labelKey => (props, item) => {
  const key = (item as unknown as RecordWithId).id;
  return (
    <DefaultAutocompleteItemOption {...props} key={key}>
      <Typography>{String(item?.[labelKey])}</Typography>
    </DefaultAutocompleteItemOption>
  );
};

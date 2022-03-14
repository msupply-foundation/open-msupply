import React from 'react';
import { styled, Typography } from '@mui/material';
import { AutocompleteOptionRenderer } from './types';

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
) => AutocompleteOptionRenderer<T> = key => (props, item) =>
  (
    <DefaultAutocompleteItemOption {...props}>
      <Typography>{String(item?.[key])}</Typography>
    </DefaultAutocompleteItemOption>
  );

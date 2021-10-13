import React from 'react';
import { styled, AutocompleteRenderInputParams } from '@mui/material';
import { BasicTextInput } from '../TextInput';
import { AutocompleteOptionRenderer } from '../../../..';

export const DefaultAutocompleteItemOption = styled('li')(({ theme }) => ({
  color: theme.palette.midGrey,
  backgroundColor: theme.palette.background.toolbar,
}));

type Option<T> = { label: string } & T;

export type OptionMapper<T extends Record<keyof T, unknown>> = (
  options: T[],
  key: keyof T
) => Option<T>[];

export const defaultOptionMapper = <T extends Record<keyof T, unknown>>(
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
      <span>{String(item[key])}</span>
    </DefaultAutocompleteItemOption>
  );

export const DefaultRenderInput = (props: AutocompleteRenderInputParams) => (
  <BasicTextInput {...props} />
);

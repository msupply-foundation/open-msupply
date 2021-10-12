import React from 'react';
import { styled, AutocompleteRenderInputParams } from '@mui/material';
import { BasicTextInput } from '../TextInput';
import { AutocompleteOptionRenderer } from '../../../..';

export const DefaultAutocompleteItemOption = styled('li')(({ theme }) => ({
  color: theme.palette.midGrey,
  backgroundColor: theme.palette.background.toolbar,
}));

export const getDefaultOptionRenderer: <T>(
  key: keyof T
) => AutocompleteOptionRenderer<T> = key => (props, item) =>
  (
    <DefaultAutocompleteItemOption {...props}>
      <span style={{ width: 100 }}>{String(item[key])}</span>
    </DefaultAutocompleteItemOption>
  );

export const DefaultRenderInput = (props: AutocompleteRenderInputParams) => (
  <BasicTextInput {...props} />
);

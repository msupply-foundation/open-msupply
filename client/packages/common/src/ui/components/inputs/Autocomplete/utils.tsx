import React, { useState } from 'react';
import {
  styled,
  Typography,
  Autocomplete as MuiAutocomplete,
} from '@mui/material';
import { AutocompleteOptionRenderer } from './types';
import { RecordWithId } from '@common/types';
import { useKeyboard } from '@common/hooks';

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

type UseOpen = Pick<
  Parameters<typeof MuiAutocomplete>[0],
  'open' | 'onOpen' | 'onClose'
>;
export const useOpenStateWithKeyboard = ({
  open,
  onOpen,
  onClose,
}: UseOpen): UseOpen => {
  const keyboard = useKeyboard();
  const [isComponentOpen, setIsComponentOpen] = useState(false);
  const isKeyboardOpen = keyboard.isEnabled ? keyboard.isOpen : true;

  return {
    // Open should be false if keyboard is not open
    // If keyboard is open then open is either state provided through props (open)
    // or state requested/set by component (isComponentOpen)
    open: isKeyboardOpen && (open ?? isComponentOpen),
    onOpen: (...args) => {
      setIsComponentOpen(true);
      onOpen?.(...args);
    },
    onClose: (...args) => {
      setIsComponentOpen(false);
      onClose?.(...args);
    },
  };
};

import React from 'react';
import {
  DefaultAutocompleteItemOption,
  AutocompleteOptionRenderer,
  Typography,
} from '@openmsupply-client/common';
import { NameRowFragment } from './api';

export interface NameSearchProps {
  open: boolean;
  onClose: () => void;
  onChange: (name: NameRowFragment) => void;
}

export interface NameSearchInputProps {
  onChange: (name: NameRowFragment) => void;
  width?: number;
  value: NameRowFragment | null;
  disabled?: boolean;
}

export const simpleNameOptionRenderer: AutocompleteOptionRenderer<
  NameRowFragment
> = (props, item) => (
  <DefaultAutocompleteItemOption {...props}>
    <Typography sx={{ marginInlineEnd: '10px', fontWeight: 'bold', width: 75 }}>
      {item.code}
    </Typography>
    <Typography>{item.name}</Typography>
  </DefaultAutocompleteItemOption>
);

export const basicFilterOptions = {
  stringify: (name: NameRowFragment) => `${name.code} ${name.name}`,
  limit: 100,
};

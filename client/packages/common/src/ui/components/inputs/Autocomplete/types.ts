import {
  AutocompleteChangeDetails,
  AutocompleteRenderOptionState,
} from '@mui/material';

export type AutocompleteOnChange<T> = (
  event: React.SyntheticEvent,
  value: T | null,
  reason: string,
  details?: AutocompleteChangeDetails<T>
) => void;

export type AutocompleteOptionRenderer<T> = (
  props: React.HTMLAttributes<HTMLLIElement>,
  option: T,
  state: AutocompleteRenderOptionState
) => React.ReactNode;

export type AutocompleteOption<SomeObject> = SomeObject & { label: string };

import { FilterOptionsState, RegexUtils } from '@openmsupply-client/common';
import { NameRowFragment } from './api';

export type NameSearchProps = NameSearchModalProps | NameSearchListProps;

export interface NameSearchModalProps {
  open: boolean;
  onClose: () => void;
  onChange: (name: NameRowFragment) => void;
}

interface NameSearchListProps {
  isList: true;
  onChange: (name: NameRowFragment) => void;
}

export interface NameSearchInputProps {
  onChange: (name: NameRowFragment) => void;
  onInputChange?: (
    event: React.SyntheticEvent,
    value: string,
    reason: string
  ) => void;
  width?: number;
  value: NameRowFragment | null;
  disabled?: boolean;
  clearable?: boolean;
}

export const basicFilterOptions = {
  stringify: (name: NameRowFragment) => `${name.code} ${name.name}`,
  limit: 100,
};

export const filterByNameAndCode = (
  options: NameRowFragment[],
  state: FilterOptionsState<NameRowFragment>
) =>
  options.filter(option =>
    RegexUtils.matchObjectProperties(state.inputValue, option, ['name', 'code'])
  );

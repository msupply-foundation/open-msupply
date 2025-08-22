import {
  FilterOptionsState,
  LocaleKey,
  PurchaseOrderNodeStatus,
  RegexUtils,
  useTranslation,
} from '@openmsupply-client/common';
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
  onChange: (name: NameRowFragment | null) => void;
  onInputChange?: (
    event: React.SyntheticEvent,
    value: string,
    reason: string
  ) => void;
  width?: number;
  value: NameRowFragment | null;
  disabled?: boolean;
  clearable?: boolean;
  currentId?: string;
}

export interface NullableNameSearchInputProps
  extends Omit<NameSearchInputProps, 'onChange'> {
  onChange: (name: NameRowFragment | null) => void;
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

const statusTranslation: Record<PurchaseOrderNodeStatus, LocaleKey> = {
  AUTHORISED: 'label.authorised',
  CONFIRMED: 'label.confirmed',
  FINALISED: 'label.finalised',
  NEW: 'label.new',
};

export const getStatusTranslator =
  (t: ReturnType<typeof useTranslation>) =>
  (currentStatus: PurchaseOrderNodeStatus): string => {
    return t(
      statusTranslation[currentStatus] ??
        statusTranslation[PurchaseOrderNodeStatus.New]
    );
  };

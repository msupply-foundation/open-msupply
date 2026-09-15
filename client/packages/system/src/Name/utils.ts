import {
  FilterBy,
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
  extraFilter?: (item: NameRowFragment) => boolean;
  filterBy?: FilterBy | null;
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
  state: FilterOptionsState<NameRowFragment>,
  extraFilter?: (item: NameRowFragment) => boolean
) =>
  options.filter(option => {
    const matches = RegexUtils.matchObjectProperties(state.inputValue, option, [
      'name',
      'code',
    ]);
    return matches && (!extraFilter || extraFilter(option));
  });

const statusTranslation: Record<PurchaseOrderNodeStatus, LocaleKey> = {
  NEW: 'label.new',
  REQUEST_APPROVAL: 'label.ready-for-approval',
  CONFIRMED: 'label.ready-to-send',
  SENT: 'label.sent',
  FINALISED: 'label.finalised',
};

export const getStatusTranslator =
  (t: ReturnType<typeof useTranslation>) =>
  (currentStatus: PurchaseOrderNodeStatus): string => {
    return t(
      statusTranslation[currentStatus] ??
        statusTranslation[PurchaseOrderNodeStatus.New]
    );
  };

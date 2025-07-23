import React from 'react';
import {
  Autocomplete,
  Tooltip,
  useTranslation,
} from '@openmsupply-client/common';
import { useVvmStatusesEnabled, VvmStatusFragment } from '../../api';
interface VVMStatusSearchInputProps {
  selected: VvmStatusFragment | null;
  onChange: (vvmStatus?: VvmStatusFragment | null) => void;
  disabled?: boolean;
  width?: number | string;
  useDefault?: boolean;
  setDefaultVal?: (defaultValue?: VvmStatusFragment) => void;
}

export const VVMStatusSearchInput = ({
  selected,
  width,
  onChange,
  disabled,
  setDefaultVal,
  useDefault = false,
}: VVMStatusSearchInputProps) => {
  const t = useTranslation();
  const { data, isLoading } = useVvmStatusesEnabled();

  if (!data) return null;

  const defaultOption = useDefault ? getHighestVvmStatusLevel(data) : null;
  if (useDefault && setDefaultVal) {
    const defaultVvm = data.find(status => status.id === defaultOption?.id);
    setDefaultVal(defaultVvm);
  }

  return (
    <Tooltip title={selected?.description ?? ''} placement="top">
      <Autocomplete
        disabled={disabled}
        popperMinWidth={Math.min(Number(width), 200)}
        value={selected ?? defaultOption}
        loading={isLoading}
        onChange={(_, option) => {
          onChange(option);
        }}
        options={data}
        getOptionLabel={option => option.description ?? ''}
        noOptionsText={t('messages.no-vvm-statuses')}
        isOptionEqualToValue={(option, value) => option.id === value?.id}
        clearable={false}
        sx={{
          width: width ? `${width}px` : '100%',
        }}
      />
    </Tooltip>
  );
};

const getHighestVvmStatusLevel = (statuses: VvmStatusFragment[]) => {
  const usableStatuses = statuses.filter(status => !status.unusable);
  usableStatuses.sort((a, b) => a.level - b.level);
  return usableStatuses[usableStatuses.length - 1];
};

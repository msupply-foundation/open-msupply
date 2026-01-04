import React, { useMemo } from 'react';
import { Autocomplete, useTranslation } from '@openmsupply-client/common';
import { useVvmStatusesEnabled, VvmStatusFragment } from '../../api';
interface VVMStatusSearchInputProps {
  selected: VvmStatusFragment | null;
  onChange: (vvmStatus?: VvmStatusFragment | null) => void;
  disabled?: boolean;
  width?: number | string;
  useDefault?: boolean;
  placeholder?: string;
  clearable?: boolean;
}

export const VVMStatusSearchInput = ({
  selected,
  width,
  onChange,
  disabled,
  useDefault = false,
  placeholder,
  clearable = false,
}: VVMStatusSearchInputProps) => {
  const t = useTranslation();
  const { data, isLoading } = useVvmStatusesEnabled();

  const defaultOption =
    useDefault && data ? getHighestVvmStatusPriority(data) : null;
  useMemo(() => {
    if (useDefault && !selected && defaultOption) {
      const defaultVvm = data?.find(status => status.id === defaultOption?.id);
      onChange(defaultVvm);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useDefault, selected, data, defaultOption]);

  if (!data) return null;

  return (
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
      clearable={clearable}
      sx={{
        width: width ? `${width}px` : '100%',
      }}
      placeholder={placeholder}
    />
  );
};

const getHighestVvmStatusPriority = (statuses: VvmStatusFragment[]) => {
  const usableStatuses = statuses.filter(status => !status.unusable);
  usableStatuses.sort((a, b) => a.priority - b.priority);
  return usableStatuses[usableStatuses.length - 1];
};

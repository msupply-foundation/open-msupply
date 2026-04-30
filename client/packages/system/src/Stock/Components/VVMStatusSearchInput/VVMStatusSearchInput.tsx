import React, { useEffect } from 'react';
import { Autocomplete, useTranslation } from '@openmsupply-client/common';
import { useVvmStatusesEnabled, VvmStatusFragment } from '../../api';

interface VVMStatusSearchInputProps {
  selected: VvmStatusFragment | null;
  onChange: (vvmStatus?: VvmStatusFragment | null) => void;
  disabled?: boolean;
  width?: number | string;
  useDefault?: boolean;
  placeholder?: string;
  required?: boolean;
}

export const VVMStatusSearchInput = ({
  selected,
  width,
  onChange,
  disabled,
  useDefault = false,
  placeholder,
  required = false,
}: VVMStatusSearchInputProps) => {
  const t = useTranslation();
  const { data, isLoading } = useVvmStatusesEnabled();

  useEffect(() => {
    if (useDefault && !selected && data) {
      const defaultVvm = getHighestVvmStatusPriority(data);
      if (defaultVvm) onChange(defaultVvm);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  if (!data) return null;

  return (
    <Autocomplete
      disabled={disabled}
      popperMinWidth={Math.min(Number(width), 200)}
      value={selected}
      loading={isLoading}
      onChange={(_, option) => {
        onChange(option);
      }}
      options={data}
      getOptionLabel={option => option.description ?? ''}
      noOptionsText={t('messages.no-vvm-statuses')}
      isOptionEqualToValue={(option, value) => option.id === value?.id}
      clearable
      sx={{
        width: width ? `${width}px` : '100%',
      }}
      placeholder={placeholder}
      required={required}
    />
  );
};

const getHighestVvmStatusPriority = (statuses: VvmStatusFragment[]) => {
  const usableStatuses = statuses.filter(status => !status.unusable);
  usableStatuses.sort((a, b) => a.priority - b.priority);
  return usableStatuses[usableStatuses.length - 1];
};

import React from 'react';
import { Autocomplete, useTranslation } from '@openmsupply-client/common';
import { useActiveVVMStatuses, VvmStatusFragment } from '../../api';

interface VVMStatusSearchInputProps {
  selectedId: string | null;
  onChange: (variantId: string | null) => void;
  disabled?: boolean;
  width?: number | string;
}

export const VVMStatusSearchInput = ({
  selectedId,
  width,
  onChange,
  disabled,
}: VVMStatusSearchInputProps) => {
  const t = useTranslation();
  const { data, isLoading } = useActiveVVMStatuses();

  if (!data) return null;

  const options = data.map((status: VvmStatusFragment) => ({
    id: status?.id,
    code: status?.code,
    description: status?.description,
  }));

  const selected = options.find(option => option.id === selectedId) ?? null;

  return (
    <Autocomplete
      disabled={disabled}
      width={`${width}px`}
      popperMinWidth={Math.min(Number(width), 200)}
      value={selected ?? null}
      loading={isLoading}
      onChange={(_, option) => onChange(option?.id ?? null)}
      options={options}
      getOptionLabel={option => option.description ?? ''}
      noOptionsText={t('messages.no-vvm-statuses')}
      isOptionEqualToValue={(option, value) => option.id === value?.id}
      clearable
    />
  );
};

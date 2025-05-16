import React from 'react';
import { Autocomplete, useTranslation } from '@openmsupply-client/common';
import { VvmStatusFragment } from '../../api';

interface VVMStatusSearchInputProps {
  selectedId: string | null;
  onChange: (variantId: string | null) => void;
  disabled?: boolean;
  width?: number | string;
  vvmStatuses: VvmStatusFragment[];
}

export const VVMStatusSearchInput = ({
  selectedId,
  width,
  onChange,
  disabled,
  vvmStatuses,
}: VVMStatusSearchInputProps) => {
  const t = useTranslation();

  const options = vvmStatuses.map(v => ({
    id: v?.id,
    code: v?.code,
    description: v?.description,
  }));

  const selected = options.find(option => option.id === selectedId) ?? null;

  return (
    <Autocomplete
      disabled={disabled}
      width={`${width}px`}
      popperMinWidth={Math.min(Number(width), 200)}
      value={selected ?? null}
      // loading={isLoading}
      onChange={(_, option) => onChange(option?.id ?? null)}
      options={options}
      getOptionLabel={option => option.description ?? ''}
      noOptionsText={t('messages.no-vvm-statuses')}
      isOptionEqualToValue={(option, value) => option.id === value?.id}
      clearable
    />
  );
};

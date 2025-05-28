import React from 'react';
import {
  Autocomplete,
  Tooltip,
  useTranslation,
} from '@openmsupply-client/common';
import { useVvmStatusesEnabled, VvmStatusFragment } from '../../api';

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
  const { data, isLoading } = useVvmStatusesEnabled();

  if (!data) return null;

  const options = data.map((status: VvmStatusFragment) => ({
    id: status?.id,
    code: status?.code,
    description: status?.description,
  }));

  const selected = options.find(option => option.id === selectedId) ?? null;

  return (
    <Tooltip title={selected?.description ?? ''} placement="top">
      <Autocomplete
        disabled={disabled}
        width="100%"
        popperMinWidth={Math.min(Number(width), 200)}
        value={selected ?? null}
        loading={isLoading}
        onChange={(_, option) => onChange(option?.id ?? null)}
        options={options}
        getOptionLabel={option => option.description ?? ''}
        noOptionsText={t('messages.no-vvm-statuses')}
        isOptionEqualToValue={(option, value) => option.id === value?.id}
        clearable={false} // VVM status shouldn't be cleared once set
      />
    </Tooltip>
  );
};

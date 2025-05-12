import React from 'react';
import { Autocomplete, useTranslation } from '@openmsupply-client/common';
import { useVVMStatus } from '../../api/hooks/useVVMStatus';

interface VVMStatusSearchInputProps {
  selectedId: string | null;
  onChange: (variantId: string | null) => void;
  disabled?: boolean;
  width?: number | string;
  //   getOptionDisabled?:
}

export const VVMStatusSearchInput = ({
  selectedId,
  width,
  onChange,
  disabled,
  //   getOptionDisabled,
}: VVMStatusSearchInputProps) => {
  const t = useTranslation();

  const { data } = useVVMStatus();

  if (!data) return null;

  const selected = data.find(vvmStatus => vvmStatus.id === selectedId);

  return (
    <Autocomplete
      disabled={disabled}
      width={`${width}px`}
      popperMinWidth={Math.min(Number(width), 200)}
      value={selected ?? null}
      //   loading={isLoading}
      onChange={(_, option) => onChange(option?.id ?? null)}
      options={data}
      getOptionLabel={option => option.description ?? ''}
      noOptionsText={t('messages.no-item-variants')}
      isOptionEqualToValue={(option, value) => option.id === value?.id}
      clearable
      //   getOptionDisabled={getOptionDisabled} do we need to include this?
    />
  );
};

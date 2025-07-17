import React from 'react';
import {
  Autocomplete,
  Tooltip,
  useTranslation,
} from '@openmsupply-client/common';
import { useVvmStatusesEnabled, VvmStatusFragment } from '../../api';

type VvmStatusOption = {
  id: string;
  code: string;
  description: string;
  level: number;
  unusable: boolean;
};

interface VVMStatusSearchInputProps {
  selectedId: string | null;
  onChange: (variantId: string | null) => void;
  disabled?: boolean;
  width?: number | string;
  useDefault?: boolean;
  setDefaultVal?: (defaultValue: string) => void;
}

export const VVMStatusSearchInput = ({
  selectedId,
  width,
  onChange,
  disabled,
  setDefaultVal,
  useDefault = false,
}: VVMStatusSearchInputProps) => {
  const t = useTranslation();
  const { data, isLoading } = useVvmStatusesEnabled();

  if (!data) return null;

  const options: VvmStatusOption[] = data.map((status: VvmStatusFragment) => ({
    id: status?.id,
    code: status?.code,
    description: status?.description,
    level: status?.level,
    unusable: status?.unusable,
  }));

  const selected = options.find(option => option.id === selectedId) ?? null;
  const defaultOption = useDefault ? getHighestVvmStatusLevel(options) : null;

  if (useDefault && defaultOption && setDefaultVal) {
    setDefaultVal(defaultOption.id);
  }

  return (
    <Tooltip title={selected?.description ?? ''} placement="top">
      <Autocomplete
        disabled={disabled}
        popperMinWidth={Math.min(Number(width), 200)}
        value={selected ?? defaultOption}
        loading={isLoading}
        onChange={(_, option) => onChange(option?.id ?? null)}
        options={options}
        getOptionLabel={option => option.description ?? ''}
        noOptionsText={t('messages.no-vvm-statuses')}
        isOptionEqualToValue={(option, value) => option.id === value?.id}
        clearable={false}
        sx={{
          width: '100%',
        }}
      />
    </Tooltip>
  );
};

const getHighestVvmStatusLevel = (statuses: VvmStatusOption[]) => {
  const usableStatuses = statuses.filter(status => !status.unusable);
  usableStatuses.sort((a, b) => b.level - a.level);
  return usableStatuses[usableStatuses.length - 1];
};

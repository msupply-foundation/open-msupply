import React, { useMemo } from 'react';
import { Autocomplete, useTranslation } from '@openmsupply-client/common';
import { ItemVariantOptionFragment, useItemVariants } from '../../api';

interface ItemVariantSearchInputProps {
  itemId: string;
  selectedId: string | null;
  onChange: (variantId: string | null) => void;
  disabled?: boolean;
  width?: number | string;
  extraFilter?: (variant: ItemVariantOptionFragment) => boolean;
}

export const ItemVariantSearchInput = ({
  selectedId,
  width,
  onChange,
  disabled,
  itemId,
  extraFilter,
}: ItemVariantSearchInputProps) => {
  const t = useTranslation();
  const { data, isLoading } = useItemVariants(itemId);

  const options = useMemo(
    () => (extraFilter ? (data ?? []).filter(extraFilter) : (data ?? [])),

    [data]
  );

  if (!data) return null;

  const selected = data.find(variant => variant.id === selectedId);

  return (
    <Autocomplete
      disabled={disabled}
      width={`${width}px`}
      popperMinWidth={Number(width)}
      value={selected ?? null}
      loading={isLoading}
      onChange={(_, option) => onChange(option?.id ?? null)}
      options={options}
      noOptionsText={t('messages.no-item-variants')}
      isOptionEqualToValue={(option, value) => option.id === value?.id}
      clearable
    />
  );
};

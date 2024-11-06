import React from 'react';
import { Autocomplete, useTranslation } from '@openmsupply-client/common';
import { ItemVariantOptionFragment, useItemVariants } from '../../api';

interface ItemVariantSearchInputProps {
  itemId: string;
  selectedId: string | null;
  onChange: (variantId: string | null) => void;
  disabled?: boolean;
  width?: number | string;
  getOptionDisabled?: (variant: ItemVariantOptionFragment) => boolean;
}

export const ItemVariantSearchInput = ({
  selectedId,
  width,
  onChange,
  disabled,
  itemId,
  getOptionDisabled,
}: ItemVariantSearchInputProps) => {
  const t = useTranslation();
  const { data, isLoading } = useItemVariants(itemId);

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
      options={data}
      noOptionsText={t('messages.no-item-variants')}
      isOptionEqualToValue={(option, value) => option.id === value?.id}
      clearable
      getOptionDisabled={getOptionDisabled}
    />
  );
};

import React from 'react';
import { Autocomplete, useTranslation } from '@openmsupply-client/common';
import { ItemVariantFragment, useItemVariants } from '../../api';

interface ItemVariantSearchInputProps {
  itemId: string;
  selectedId: string | null;
  onChange: (variant: ItemVariantFragment | null) => void;
  disabled?: boolean;
  width?: number | string;
  getOptionDisabled?: (variant: ItemVariantFragment) => boolean;
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

  const selected = data.variants.find(variant => variant.id === selectedId);

  return (
    <Autocomplete
      disabled={disabled}
      width={`${width}px`}
      popperMinWidth={Math.min(Number(width), 200)}
      value={selected ?? null}
      loading={isLoading}
      onChange={(_, option) => onChange(option)}
      getOptionLabel={getOptionLabel}
      options={data.variants}
      noOptionsText={t('messages.no-item-variants')}
      isOptionEqualToValue={(option, value) => option.id === value?.id}
      clearable
      getOptionDisabled={getOptionDisabled}
    />
  );
};

const getOptionLabel = (option: ItemVariantFragment): string => {
  return `${option.name}`;
};

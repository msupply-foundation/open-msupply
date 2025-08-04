import React from 'react';
import {
  EditIcon,
  TextInputButton,
  ButtonProps,
} from '@openmsupply-client/common';
import { ItemVariantFragment, useItemVariants } from '../../api';
import { ItemVariantSelector } from './ItemVariantSelector';

interface ItemVariantInputProps {
  itemId: string;
  selectedId: string | null;
  onChange: (itemVariant: ItemVariantFragment | null) => void;
  width?: number | string;
  disabled?: boolean;
}

export const ItemVariantInput = ({
  selectedId,
  itemId,
  disabled,
  width,
  onChange,
  ...props
}: ItemVariantInputProps & ButtonProps) => {
  const { data, isLoading } = useItemVariants(itemId);
  const selected = data?.variants.find(variant => variant.id === selectedId);

  const onVariantSelected = (itemVariantId: string | null) => {
    const selectedVariant = data?.variants.find(
      variant => variant.id === itemVariantId
    );
    onChange(selectedVariant ?? null);
  };

  const ItemVariantButton = (
    <TextInputButton
      sx={{ width: disabled ? width : '100%' }}
      endIcon={<EditIcon />}
      disabled={disabled}
      {...props}
    >
      <span>{selected?.name ?? ''}</span>
    </TextInputButton>
  );

  return !disabled ? (
    <div style={{ width }}>
      <ItemVariantSelector
        selectedId={selectedId}
        onVariantSelected={onVariantSelected}
        isLoading={isLoading}
        variants={data?.variants ?? []}
        isVaccine={data?.isVaccine}
      >
        {ItemVariantButton}
      </ItemVariantSelector>
    </div>
  ) : (
    ItemVariantButton
  );
};

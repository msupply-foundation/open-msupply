import React from 'react';
import {
  Typography,
  Box,
  textStyles,
  Tooltip,
} from '@openmsupply-client/common';
import { ItemVariantFragment, useItemVariants } from '../../api';
import { ItemVariantSelector } from './ItemVariantSelector';

interface ItemVariantInputProps {
  itemId: string;
  selectedId: string | null;
  onChange: (itemVariant: ItemVariantFragment | null) => void;
  displayInDoses: boolean;
}

export const ItemVariantInput = ({
  selectedId,
  itemId,
  displayInDoses,
  onChange,
}: ItemVariantInputProps) => {
  const { data, isLoading } = useItemVariants(itemId);
  const selected = data?.find(variant => variant.id === selectedId);

  const onVariantSelected = (itemVariantId: string | null) => {
    const selectedVariant = data?.find(variant => variant.id === itemVariantId);
    onChange(selectedVariant ?? null);
  };

  return (
    <Box display="flex" justifyContent="space-between">
      <Tooltip title={selected?.name}>
        <Typography
          sx={{
            ...textStyles.default,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {selected?.name}
        </Typography>
      </Tooltip>
      <ItemVariantSelector
        selectedId={selectedId}
        variants={data}
        isLoading={isLoading}
        onVariantSelected={onVariantSelected}
        displayInDoses={displayInDoses}
      />
    </Box>
  );
};

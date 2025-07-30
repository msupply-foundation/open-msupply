import React from 'react';
import { IconButton, InfoIcon } from '@openmsupply-client/common';
import { ItemVariantSelector } from './ItemVariantSelector';
import { useItemVariants } from '../..';

interface ItemVariantInfoIconProps {
  includeDoseColumns: boolean;
  itemId: string;
  itemVariantId: string | null;
}

export const ItemVariantInfoIcon = ({
  itemId,
  itemVariantId,
}: ItemVariantInfoIconProps) => {
  const { data } = useItemVariants(itemId);

  return (
    <ItemVariantSelector
      selectedId={itemVariantId}
      variants={data?.variants ?? []}
      disabled
      onVariantSelected={() => {}}
    >
      <IconButton
        icon={<InfoIcon fontSize="inherit" />}
        onClick={() => {}}
        label=""
      />
    </ItemVariantSelector>
  );
};

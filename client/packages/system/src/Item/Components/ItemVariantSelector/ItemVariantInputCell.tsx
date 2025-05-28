import React from 'react';
import {
  RecordWithId,
  CellProps,
  Typography,
  Box,
  textStyles,
  Tooltip,
} from '@openmsupply-client/common';
import { useItemVariants } from '../../api';
import { ItemVariantSelector } from './ItemVariantSelector';

interface ItemVariantInputCellProps {
  itemId: string;
  displayInDoses: boolean;
}

export const ItemVariantInputCell = <T extends RecordWithId>({
  rowData,
  column,
  itemId,
  displayInDoses,
  dense = false,
}: CellProps<T> & ItemVariantInputCellProps) => {
  const selectedId = column.accessor({
    rowData,
  }) as string | null;
  const { data, isLoading } = useItemVariants(itemId);
  const selected = data?.find(variant => variant.id === selectedId);

  const onVariantSelected = (itemVariantId: string | null) => {
    const newSelected = data?.find(variant => variant.id === itemVariantId);
    column.setter({
      ...rowData,
      itemVariantId,
      itemVariant: newSelected ?? null,
    });
  };

  return (
    <Box display="flex" justifyContent="space-between">
      <Tooltip title={selected?.name}>
        <Typography
          sx={{
            ...(dense ? textStyles.dense : textStyles.default),
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

import React from 'react';
import { Stack } from '@mui/material';
import { CardFieldDef } from './types';
import { DataCard } from './DataCard';

interface CardListProps<T extends { id: string }> {
  items: T[];
  fieldDefs: CardFieldDef<T>[];
  disabled: boolean;
  onDelete?: (id: string) => void;
  getCardLabel?: (item: T, index: number) => string;
  maxHeight?: number | string;
}

export const CardList = <T extends { id: string }>({
  items,
  fieldDefs,
  disabled,
  onDelete,
  getCardLabel,
  maxHeight,
}: CardListProps<T>) => (
  <Stack
    spacing={2}
    sx={{
      overflow: 'auto',
      maxHeight,
      padding: 1,
    }}
  >
    {items.map((item, index) => (
      <DataCard
        key={item.id}
        item={item}
        fieldDefs={fieldDefs}
        disabled={disabled}
        headerLabel={getCardLabel?.(item, index)}
        onDelete={onDelete ? () => onDelete(item.id) : undefined}
      />
    ))}
  </Stack>
);

import React from 'react';
import {
  useTranslation,
  Select,
  DateUtils,
  InvoiceLineNodeType,
} from '@openmsupply-client/common';
import { useAllocationContext } from './allocation/useAllocationContext';

export const AllocateIn = () => {
  const t = useTranslation();

  const { allocateIn, setAllocateIn, lines } = useAllocationContext(state => ({
    allocateIn: state.allocateIn,
    setAllocateIn: state.setAllocateIn,
    lines: state.draftStockOutLines,
  }));

  // todo - getting just pack size array from context
  // cancel pack size controller?
  // todo test this ig
  const options = [
    { label: t('label.units'), value: -1 },
    ...lines
      .reduce(
        (packSizes, line) => {
          const packSize = line.packSize;
          if (!packSizes.some(o => o.value === packSize)) {
            if (
              line.type !== InvoiceLineNodeType.UnallocatedStock &&
              !line.stockLine?.onHold &&
              (line?.stockLine?.availableNumberOfPacks ?? 0) > 0 &&
              (!line.expiryDate || !DateUtils.isExpired(line.expiryDate))
            ) {
              packSizes.push({
                label: t('label.packs-of-pack-size', { packSize }),
                value: packSize,
              });
            }
          }
          return packSizes;
        },

        [] as { label: string; value: number }[]
      )
      .sort((a, b) => a.value - b.value),
  ];

  return (
    <Select
      sx={{ width: 150 }}
      options={options}
      value={allocateIn}
      onChange={e => {
        const { value } = e.target;
        setAllocateIn(Number(value));
      }}
    />
  );
};

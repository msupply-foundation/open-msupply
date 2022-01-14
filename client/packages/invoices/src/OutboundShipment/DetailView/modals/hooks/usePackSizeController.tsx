import { useState, useEffect } from 'react';
import {
  useTranslation,
  ifTheSameElseDefault,
} from '@openmsupply-client/common';

export type PackSizeController = ReturnType<typeof usePackSizeController>;

export const usePackSizeController = (
  batches: {
    packSize: number;
    onHold: boolean;
    availableNumberOfPacks: number;
    numberOfPacks: number;
  }[]
) => {
  const t = useTranslation('distribution');
  // Creating a sorted array of distinct pack sizes
  const packSizes = Array.from(
    new Set(
      batches
        .filter(
          ({ onHold, availableNumberOfPacks }) =>
            availableNumberOfPacks > 0 && !onHold
        )
        .reduce((sizes, { packSize }) => [...sizes, packSize], [] as number[])
        .sort((a, b) => a - b)
    )
  );

  const anySize = [];
  if (packSizes.length > 1) {
    anySize.push({ label: t('label.any'), value: -1 });
  }

  const options = anySize.concat(
    packSizes.map(packSize => ({
      label: String(packSize),
      value: packSize,
    }))
  );

  const [selected, setSelected] = useState({ label: '', value: 0 });

  const setPackSize = (newValue: number) => {
    const packSizeOption = options.find(({ value }) => value === newValue);
    if (!packSizeOption) return;
    setSelected(packSizeOption);
  };

  useEffect(() => {
    if (selected.value !== 0) return;

    const selectedPackSize = ifTheSameElseDefault(
      batches.filter(batch => batch.numberOfPacks > 0),
      'packSize',
      0
    );

    const defaultPackSize = (selectedPackSize === 0
      ? options[0]
      : options.find(option => option.value === selectedPackSize)) ?? {
      label: '',
      value: '',
    };

    if (defaultPackSize.value && typeof defaultPackSize.value == 'number') {
      setPackSize(defaultPackSize.value);
    }
    if (packSizes.length === 0) {
      setSelected({ label: '', value: 0 });
    }
  }, [batches]);

  const reset = () => setSelected({ label: '', value: 0 });

  return { selected, setPackSize, options, reset };
};

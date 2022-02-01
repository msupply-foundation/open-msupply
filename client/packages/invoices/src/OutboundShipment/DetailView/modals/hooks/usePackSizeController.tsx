import { useState, useEffect, useMemo } from 'react';
import {
  useTranslation,
  ifTheSameElseDefault,
} from '@openmsupply-client/common';
import { DraftOutboundLine } from '../../../../types';

export type PackSizeController = ReturnType<typeof usePackSizeController>;

const distinctSortedPackSizes = (lines: DraftOutboundLine[]): number[] =>
  Array.from(
    new Set(
      lines
        .filter(
          ({ onHold, availableNumberOfPacks }) =>
            availableNumberOfPacks > 0 && !onHold
        )
        .reduce((sizes, { packSize }) => [...sizes, packSize], [] as number[])
        .sort((a: number, b: number) => a - b)
    )
  );

const usePackSizeOptions = (
  packSizes: number[]
): { label: string; value: number }[] => {
  const t = useTranslation('distribution');

  const options = useMemo(() => {
    const anySize: { label: string; value: number }[] = [];
    if (packSizes.length > 1) {
      anySize.push({ label: t('label.any'), value: -1 });
    }
    return anySize.concat(
      packSizes.map(packSize => ({
        label: String(packSize),
        value: packSize,
      }))
    );
  }, [packSizes]);

  return options;
};

export const usePackSizeController = (lines: DraftOutboundLine[]) => {
  const packSizes = useMemo(() => distinctSortedPackSizes(lines), [lines]);
  const options = usePackSizeOptions(packSizes);

  const [selected, setSelected] = useState({ label: '', value: -1 });

  const setPackSize = (newValue: number) => {
    const packSizeOption = options.find(({ value }) => value === newValue);
    if (!packSizeOption) return;
    setSelected(packSizeOption);
  };

  useEffect(() => {
    // if (selected.value !== 0) return;
    if (packSizes.length < 1) return;
    if (!lines?.length) return;

    const selectedPackSize = ifTheSameElseDefault(
      lines.filter(batch => batch.numberOfPacks > 0),
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
  }, [packSizes, lines, options, setPackSize]);

  const reset = () => setSelected({ label: '', value: 0 });

  return { selected, setPackSize, options, reset };
};

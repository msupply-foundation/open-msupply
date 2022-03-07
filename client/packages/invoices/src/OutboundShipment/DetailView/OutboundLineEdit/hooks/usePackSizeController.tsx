import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  useTranslation,
  InvoiceLineNodeType,
  ifTheSameElseDefault,
  isExpired,
} from '@openmsupply-client/common';
import { DraftOutboundLine } from '../../../../types';

export type PackSizeController = ReturnType<typeof usePackSizeController>;

const distinctSortedPackSizes = (lines: DraftOutboundLine[]): number[] =>
  Array.from(
    new Set(
      lines
        .filter(
          ({ stockLine }) =>
            (stockLine?.availableNumberOfPacks ?? 0) > 0 && !stockLine?.onHold
        )
        .reduce((sizes, { packSize }) => [...sizes, packSize], [] as number[])
        .sort((a: number, b: number) => a - b)
    )
  );

const usePackSizes = (
  lines: DraftOutboundLine[]
): { options: { label: string; value: number }[]; packSizes: number[] } => {
  const t = useTranslation('distribution');
  const packSizes = useMemo(() => distinctSortedPackSizes(lines), [lines]);

  const options = useMemo(() => {
    const anySize: { label: string; value: number }[] = [];
    if (packSizes.length > 1 || !packSizes.length) {
      anySize.push({ label: t('label.any'), value: -1 });
    }
    return anySize.concat(
      packSizes.map(packSize => ({
        label: String(packSize),
        value: packSize,
      }))
    );
  }, [packSizes]);

  // if (!options.length) options.push({ label: 'label.any', value: -1 });

  return { options, packSizes };
};

export const usePackSizeController2 = (lines: DraftOutboundLine[]) => {
  const { options, packSizes } = usePackSizes(lines);

  const [selected, setSelected] = useState<
    | {
        label: string;
        value: number;
      }
    | undefined
  >();

  const items = lines.map(({ item }) => item);
  const itemId = ifTheSameElseDefault(items, 'id', '');
  useEffect(() => {
    setSelected(undefined);
  }, [itemId]);

  const setPackSize = useCallback(
    (newValue: number) => {
      const packSizeOption = options.find(({ value }) => value === newValue);
      if (!packSizeOption) return;
      setSelected(packSizeOption);
    },
    [options, setSelected]
  );

  useEffect(() => {
    // When selected is null, set a default value - either
    // 'any' when there are multiple unique pack sizes
    // in the set of options, or the only option if there is only
    // one.

    if (selected) return;
    let selectedPackSize = ifTheSameElseDefault(
      lines.filter(({ numberOfPacks }) => numberOfPacks > 0),
      'packSize',
      -1
    );

    // on initial selection of an item there will be no packs selected
    // as the filtering above will have filtered out all the lines as none
    // will have a number of packs, so instead, look at all the lines except
    // the placeholder to find either the distinct pack size or use 'any'.
    if (selectedPackSize === -1)
      selectedPackSize = ifTheSameElseDefault(
        lines.filter(
          ({ type }) => type !== InvoiceLineNodeType.UnallocatedStock
        ),
        'packSize',
        -1
      );

    setPackSize(selectedPackSize);
  }, [setPackSize, selected, lines]);

  return { selected, setPackSize, options, packSizes };
};

type PackSizeOption = {
  packSize: number;
  hasAllocated: boolean;
  hasAvailableStock: boolean;

  isPlaceholder: boolean;
  isExpired: boolean;
  isOnHold: boolean | undefined;
  label: string;
  value: number;
};

const isPlaceholder = (line: DraftOutboundLine): boolean =>
  line.type === InvoiceLineNodeType.UnallocatedStock;

const createDistinctPackSizes = (packSizes: PackSizeOption[]) => {
  const packSizeMap: Record<string, PackSizeOption> = {};
  packSizes.forEach(packSizeOption => {
    packSizeMap[String(packSizeOption.packSize)] = packSizeOption;
  });

  return Object.keys(packSizeMap)
    .sort((a, b) => Number(a) - Number(b))
    .reduce((acc, val) => {
      const option = packSizeMap[val];
      if (option) {
        acc.push(option);
        return acc;
      } else return acc;
    }, [] as PackSizeOption[]);
};

const createPackSizeOption =
  (t: ReturnType<typeof useTranslation>) => (line: DraftOutboundLine) => ({
    packSize: !isPlaceholder(line) ? line.packSize : -1,
    hasAllocated: line.numberOfPacks > 0,
    hasAvailableStock: (line?.stockLine?.availableNumberOfPacks ?? 0) > 0,
    isPlaceholder: isPlaceholder(line),
    isExpired: line.expiryDate ? isExpired(new Date(line.expiryDate)) : false,
    isOnHold: line.stockLine?.onHold,
    value: !isPlaceholder(line) ? line.packSize : -1,
    label: !isPlaceholder(line) ? String(line.packSize) : t('label.any'),
  });

const createPlaceholderOption =
  (t: ReturnType<typeof useTranslation>) => () => ({
    packSize: -1,
    hasAllocated: false,
    hasAvailableStock: false,
    isPlaceholder: true,
    isExpired: false,
    isOnHold: undefined,
    value: -1,
    label: t('label.any'),
  });

export const usePackSizeController = (lines: DraftOutboundLine[]) => {
  const t = useTranslation('distribution');
  const [selected, setSelected] = useState<PackSizeOption | undefined>();

  const setPackSize = (packSize: number) => {
    const packSizeOption = options.find(({ value }) => value === packSize);
    if (!packSizeOption) return;
    setSelected(packSizeOption);
  };

  const packSizes = lines.map(createPackSizeOption(t));

  const validPackSizes = createDistinctPackSizes(
    packSizes.filter(
      packSize =>
        (!packSize.isPlaceholder &&
          !packSize.isOnHold &&
          !packSize.isExpired &&
          packSize.hasAvailableStock) ||
        (packSize.hasAllocated && packSize.isPlaceholder)
    )
  );

  const options = [...validPackSizes];
  const placeholder = packSizes.find(packSize => packSize.isPlaceholder);

  if (validPackSizes.length !== 1) {
    const placeholder = validPackSizes.find(packSize => packSize.isPlaceholder);
    if (!placeholder) {
      options.unshift(createPlaceholderOption(t)());
    }
  }

  useEffect(() => {
    if (!selected) {
      if (validPackSizes.length === 0) {
        setSelected(placeholder);
      }

      if (validPackSizes.length === 1) {
        // handle the case where there is only one valid pack size.
        const onlyValidPackSize = validPackSizes[0] as PackSizeOption;
        setSelected(onlyValidPackSize);
      }

      if (validPackSizes.length > 1) {
        const sameAllocated = ifTheSameElseDefault(
          validPackSizes.filter(({ hasAllocated }) => hasAllocated),
          'packSize',
          -1
        );

        setPackSize(sameAllocated);

        // handle the case where there are multiple valid pack sizes.
      }
    }
  }, [options, selected, validPackSizes]);

  return {
    selected: { label: selected?.label, value: selected?.value },
    setPackSize,
    options: options.map(({ label, value }) => ({ label, value })),
    // packSizes: validPackSizes.map(({ packSize }) => packSize),
  };
};

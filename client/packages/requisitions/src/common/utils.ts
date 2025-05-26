import { useMemo } from 'react';
import { LocaleKey, TypedTFunction } from '@common/intl';

export const Representation = {
  PACKS: 'packs',
  UNITS: 'units',
} as const;

export type RepresentationValue =
  (typeof Representation)[keyof typeof Representation];

export const calculateValueInUnitsOrPacks = (
  representation: RepresentationValue,
  defaultPackSize: number,
  value?: number | null
): number => {
  if (!value) return 0;
  return representation === Representation.PACKS
    ? value / defaultPackSize
    : value;
};

export const useValueInUnitsOrPacks = (
  representation: RepresentationValue,
  defaultPackSize: number,
  value?: number | null
): number =>
  useMemo(
    () => calculateValueInUnitsOrPacks(representation, defaultPackSize, value),
    [representation, defaultPackSize, value]
  );

export const useEndAdornment = (
  t: TypedTFunction<LocaleKey>,
  getPlural: (word: string, value: number) => string,
  unitName: string,
  representation: RepresentationValue,
  valueInUnitsOrPacks: number,
  endAdornmentOverride?: string
) =>
  useMemo(
    () =>
      endAdornmentOverride ??
      (representation === Representation.PACKS
        ? getPlural(t('label.pack').toLowerCase(), valueInUnitsOrPacks)
        : getPlural(unitName.toLowerCase(), valueInUnitsOrPacks)),
    [
      t,
      getPlural,
      unitName,
      representation,
      endAdornmentOverride,
      valueInUnitsOrPacks,
    ]
  );

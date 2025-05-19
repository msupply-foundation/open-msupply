export type ValueInfo = {
  label: string;
  value?: number | null;
};

export const Representation = {
  PACKS: 'packs',
  UNITS: 'units',
} as const;

export type RepresentationValue =
  (typeof Representation)[keyof typeof Representation];

export const getValueInUnitsOrPacks = (
  representation: RepresentationValue,
  defaultPackSize: number,
  value?: number | null
): number => {
  if (!value) return 0;

  return representation === Representation.PACKS
    ? value / defaultPackSize
    : value;
};

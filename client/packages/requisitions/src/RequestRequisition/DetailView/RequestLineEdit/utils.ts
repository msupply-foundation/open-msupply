export const PackageType = {
  PACKS: 'packs',
  UNITS: 'units',
} as const;

export type PackageTypeValue = (typeof PackageType)[keyof typeof PackageType];

export const getValueInUnitsOrPacks = (
  packageType: PackageTypeValue,
  defaultPackSize: number,
  value?: number | null
): number => {
  if (!value) return 0;

  return packageType === PackageType.PACKS ? value / defaultPackSize : value;
};

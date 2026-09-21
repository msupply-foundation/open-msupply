import { tPlural } from './intl';

// The measure word a quantity is counted in: the item's own unit name, or the
// localised "unit" / "pack" / "dose" label when the item names none. A unit
// name is free-text catalogue data and is NEVER inflected — its plural form
// will come from the unit's own configuration (#666), not from code.
export type MeasureMode = 'units' | 'packs' | 'doses';

export const measureWord = (
  mode: MeasureMode,
  unitName: string | null,
  count = 2
): string => {
  if (mode === 'packs') return tPlural('label.packs-plural', count);
  if (mode === 'doses') return tPlural('label.doses-plural', count);
  return unitName ?? tPlural('label.units-plural', count);
};

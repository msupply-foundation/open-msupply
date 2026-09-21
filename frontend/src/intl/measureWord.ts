import { tPlural } from './intl';
import { getPlural } from './intlUtils';

// The measure word a quantity is counted in: the item's own unit name (free-text
// catalogue data, inflected by getPlural — English only) or the localised
// "unit" / "pack" / "dose" label when the item has none.
export type MeasureMode = 'units' | 'packs' | 'doses';

export const measureWord = (
  mode: MeasureMode,
  unitName: string | null,
  count = 2
): string => {
  if (mode === 'packs') return tPlural('label.packs-plural', count);
  if (mode === 'doses') return tPlural('label.doses-plural', count);
  return unitName
    ? getPlural(unitName, count)
    : tPlural('label.units-plural', count);
};

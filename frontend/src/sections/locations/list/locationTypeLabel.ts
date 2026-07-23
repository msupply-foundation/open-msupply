import { t } from '../../../intl';

// A location type shown the ONE way the spec names it on screen — name +
// temperature range (spec/locations/ui-surface.md S1 column 3 and the S2
// picker options). Shared by the list column and the modal's autocomplete so
// the two can't drift. (The CSV export deliberately differs: OMS-REG-INV-01.11 pins the
// exported type to the name only.)
export const locationTypeLabel = (
  locationType: {
    name: string;
    minTemperature: number;
    maxTemperature: number;
  } | null
): string =>
  locationType
    ? t('label.location-temperature-range', {
        locationName: locationType.name,
        minTemperature: locationType.minTemperature,
        maxTemperature: locationType.maxTemperature,
      }).trim()
    : '';

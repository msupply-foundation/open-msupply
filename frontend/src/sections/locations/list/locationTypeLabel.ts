import { t } from '../../../intl';

// A location type shown the ONE way the spec names it — name + temperature
// range (spec/locations/ui-surface.md S1 column 3 and the S2 picker options).
// Shared by the list column, the CSV export, and the modal's autocomplete so
// the three can't drift.
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

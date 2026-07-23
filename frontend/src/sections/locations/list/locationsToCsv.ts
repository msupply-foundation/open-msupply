import { t } from '../../../intl';
import { toCsv } from '../../../domain/reportFiles';
import { locationTypeLabel } from './locationTypeLabel';
import type { LocationRow } from './locationEdit';

// The locations list → CSV (spec/locations OMS-REG-INV-01.11): each location's code, name,
// location type, volume, volume-used, and on-hold. Headers are translated;
// the type renders as the list's name + temperature-range label; on-hold as
// Yes/No. Feeds either a direct .csv download or the server's csvToExcel
// conversion (domain/reportFiles), exactly like the reference vertical's
// stocktakesToCsv.
export const locationsToCsv = (rows: LocationRow[]): string => {
  const fields = [
    t('label.code'),
    t('label.name'),
    t('label.location-type'),
    t('label.volume'),
    t('label.volume-used'),
    t('label.on-hold'),
  ];
  const data = rows.map(row => [
    row.code,
    row.name,
    locationTypeLabel(row.locationType),
    row.volume,
    row.volumeUsed,
    row.onHold ? t('messages.yes') : t('messages.no'),
  ]);
  return toCsv(fields, data);
};

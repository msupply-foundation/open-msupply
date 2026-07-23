import { t } from '../../../intl';
import { toCsv } from '../../../domain/reportFiles';
import type { LocationRow } from './locationEdit';

// The locations list → CSV (OMS-REG-INV-01.11–.13). Headers are translated;
// the data values are stable machine formats, not display strings: the type
// column is the type NAME only (no temperature range, unlike the on-screen
// column), and on-hold serializes as lowercase true/false. Feeds either a
// direct .csv download or the server's csvToExcel conversion
// (domain/reportFiles), exactly like the reference vertical's
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
    row.locationType?.name ?? '',
    row.volume,
    row.volumeUsed,
    row.onHold ? 'true' : 'false',
  ]);
  return toCsv(fields, data);
};

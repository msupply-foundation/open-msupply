import { t } from '@/intl';
import { localisedDate } from '@/intl';
import { toCsv } from '@/domain/reportFiles';
import type { StocktakesResult } from './stocktakes.generated';

type StocktakeRow = StocktakesResult['stocktakes']['nodes'][number];

// The stocktakes list → CSV, mirroring OMS's stocktakesToCsv (spec/stocktakes
// S1 "Export CSV"). Columns match the list's visible fields. Headers are
// translated; dates are localised; status uses the same catalog labels as the
// list's status chip. Booleans render as Yes/No. Feeds either a direct .csv
// download or the server's csvToExcel conversion (domain/reportFiles).
export const stocktakesToCsv = (rows: StocktakeRow[]): string => {
  const fields = [
    t('label.number'),
    t('label.status'),
    t('label.description'),
    t('label.comment'),
    t('label.created'),
    t('label.stocktake-date'),
    t('label.locked'),
  ];
  const data = rows.map(row => [
    row.stocktakeNumber,
    row.status === 'FINALISED' ? t('status.finalised') : t('status.new'),
    row.description,
    row.comment,
    localisedDate(row.createdDatetime),
    row.stocktakeDate ? localisedDate(row.stocktakeDate) : '',
    row.isLocked ? t('messages.yes') : t('messages.no'),
  ]);
  return toCsv(fields, data);
};

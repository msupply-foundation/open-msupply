import { t } from '../../../intl';
import { localisedDate } from '../../../intl';
import { toCsv } from '../../../domain/reportFiles';
import type { StockLineRowFragment } from './stock.generated';

// The stock list → CSV (spec/stock AC-L6). Columns match the list's fields
// (spec/stock S1). Headers translated, dates localised, computed units/value
// columns derived (packs × pack size / cost). Master lists join with "; ";
// blank supplier renders the fixed "Inventory adjustment" text (list parity).
// Feeds either a direct .csv download or the server's csvToExcel conversion
// (domain/reportFiles).
export const stockToCsv = (rows: StockLineRowFragment[]): string => {
  const fields = [
    t('label.code'),
    t('label.name'),
    t('label.master-lists'),
    t('label.batch'),
    t('label.expiry-date'),
    t('label.manufacture-date'),
    t('label.vvm-status'),
    t('label.location-code'),
    t('label.location-name'),
    t('label.unit'),
    t('label.pack-size'),
    t('label.pack-qty'),
    t('label.soh'),
    t('label.available-stock'),
    t('label.pack-cost-price'),
    t('label.pack-sell-price'),
    t('label.total'),
    t('label.manufacturer'),
    t('label.supplier'),
  ];
  const data = rows.map(l => [
    l.item.code,
    l.itemName,
    (l.item.masterLists ?? []).map(m => m.name).join('; '),
    l.batch ?? '',
    l.expiryDate ? localisedDate(l.expiryDate) : '',
    l.manufactureDate ? localisedDate(l.manufactureDate) : '',
    l.item.isVaccine ? (l.vvmStatus?.description ?? '') : '',
    l.location?.code ?? '',
    l.location?.name ?? l.locationName ?? '',
    l.item.unitName ?? '',
    l.packSize,
    l.totalNumberOfPacks,
    l.totalNumberOfPacks * l.packSize,
    l.availableNumberOfPacks * l.packSize,
    l.costPricePerPack,
    l.sellPricePerPack,
    l.totalNumberOfPacks * l.costPricePerPack,
    l.manufacturer?.name ?? '',
    l.supplierName && l.supplierName.length > 0
      ? l.supplierName
      : t('label.inventory-adjustment'),
  ]);
  return toCsv(fields, data);
};

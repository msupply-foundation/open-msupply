import { t } from '@/intl';
import { toCsv } from '@/domain/reportFiles';
import type { AssetCatalogueItemsResult } from './catalogue.generated';

export type CatalogueRow =
  AssetCatalogueItemsResult['assetCatalogueItems']['nodes'][number];

// The catalogue list → CSV (spec/asset-catalogue › rules § export, S1): the
// list's seven columns, in the list's order, headed by the columns' keys. The
// specification is not exported.
export const catalogueToCsv = (rows: readonly CatalogueRow[]): string =>
  toCsv(
    [
      t('label.sub-catalogue'),
      t('label.code'),
      t('label.type'),
      t('label.manufacturer'),
      t('label.model'),
      t('label.class'),
      t('label.category'),
    ],
    rows.map(row => [
      row.subCatalogue,
      row.code,
      row.assetType?.name,
      row.manufacturer,
      row.model,
      row.assetClass?.name,
      row.assetCategory?.name,
    ])
  );

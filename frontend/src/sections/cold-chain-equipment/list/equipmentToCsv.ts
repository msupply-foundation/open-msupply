import { exportDate, t, utcDateTime } from '@/intl';
import { toCsv } from '@/domain/reportFiles';
import { statusLabelKey } from '../equipment';
import { parseProperties } from '../detail/assetEdit';
import type { AssetRowFragment } from '../equipment.generated';

// The equipment list → CSV (spec/cold-chain-equipment › rules § export). The
// identity, the catalogue item's code, the four dates, the status, the
// replacement flag, the notes, the timestamps, and one column per specification
// key. On a central server a store column leads.
//
// The rows this is handed are the screen's own — the active filters and the
// destination's store scope, unpaginated (rules › export). Which rows those are
// is the export's doing, not this formatter's — see ExportEquipmentAction.

/**
 * The row shape the export needs. A superset of the list row: the export also
 * carries the warranty dates, the specification and the timestamps, none of
 * which the list shows, so the export query asks for its own selection.
 */
export type ExportRow = AssetRowFragment & {
  warrantyStart?: string | null;
  warrantyEnd?: string | null;
  needsReplacement?: boolean | null;
  createdDatetime: string;
  modifiedDatetime: string;
  properties: string;
  catalogProperties?: string | null;
  catalogueItem?: { code?: string | null } | null;
};

export const equipmentToCsv = (
  rows: readonly ExportRow[],
  propertyKeys: readonly string[],
  isCentral: boolean
): string => {
  // De-duplicated: the property catalogue returns one row per scope, so the
  // same key recurs (contract ⚠️ wire trap).
  const keys = [...new Set(propertyKeys)];

  const fields = [
    'id',
    ...(isCentral ? [t('label.store')] : []),
    t('label.asset-number'),
    t('label.catalogue-item-code'),
    t('label.installation-date'),
    t('label.replacement-date'),
    t('label.warranty-start-date'),
    t('label.warranty-end-date'),
    t('label.serial'),
    t('label.functional-status'),
    t('label.needs-replacement'),
    t('label.asset-notes'),
    t('label.created-datetime-UTC'),
    t('label.modified-datetime-UTC'),
    ...keys,
  ];

  const data = rows.map(row => {
    // The catalogue's value wins where both answer a key, exactly as the
    // Details tab shows it (rules › properties).
    const own = parseProperties(row.properties);
    const catalogue = parseProperties(row.catalogProperties);
    const status = row.statusLog?.status;
    return [
      row.id,
      ...(isCentral ? [row.store?.code ?? ''] : []),
      row.assetNumber ?? '',
      row.catalogueItem?.code ?? '',
      row.installationDate ? exportDate(row.installationDate) : '',
      row.replacementDate ? exportDate(row.replacementDate) : '',
      row.warrantyStart ? exportDate(row.warrantyStart) : '',
      row.warrantyEnd ? exportDate(row.warrantyEnd) : '',
      row.serialNumber ?? '',
      status ? t(statusLabelKey(status)) : '',
      row.needsReplacement ? t('messages.yes') : t('messages.no'),
      row.notes ?? '',
      // These two columns are HEADED "(UTC)", so they carry UTC: a localised
      // time under that header is wrong for every reader outside it.
      utcDateTime(row.createdDatetime),
      utcDateTime(row.modifiedDatetime),
      // A property value may be a boolean or a number; the CSV writer takes
      // strings and numbers, so a flag renders as its own text.
      ...keys.map(key => {
        const value = catalogue[key] ?? own[key];
        return value === null || value === undefined ? '' : String(value);
      }),
    ];
  });

  return toCsv(fields, data);
};

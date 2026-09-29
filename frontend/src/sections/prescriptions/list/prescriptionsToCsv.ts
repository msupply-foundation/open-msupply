import { t } from '../../../intl';
import { exportDate } from '../../../intl';
import { toCsv } from '../../../domain/reportFiles';
// The helper is taken from its own file, not the module's index: this
// serialiser is pure and node-tested, and the index also re-exports the
// custom-field COMPONENTS, which drag SolidJS's client-only APIs in with them.
import { customFieldCsvColumns } from '../../../domain/customFields/customFieldCsvColumns';
import type { CustomFieldDef } from '../../../domain/customFields';
import {
  asPrescriptionStatus,
  prescriptionDateOf,
  statusLabel,
} from '../prescriptionStatus';
import type { PrescriptionsResult } from './prescriptions.generated';

type PrescriptionRow = PrescriptionsResult['invoices']['nodes'][number];

// The prescriptions list → CSV (spec/prescriptions OMS-REG-DIS-03.52): the list's
// columns, every row matching the active filters. Headers are translated;
// the prescription date is the backdated-or-created coalescence the list
// shows; status uses the same catalog labels as the chip. Feeds the direct
// .csv download or the server's csvToExcel conversion (domain/reportFiles).
//
// The configured custom-field columns (S1 › Columns: the trailing `+` row —
// Category and Patient type on the reference store) trail the list's own, in
// the same order and with the same display strings the table renders.
export const prescriptionsToCsv = (
  rows: PrescriptionRow[],
  customFields: CustomFieldDef[] = []
): string => {
  const cf = customFieldCsvColumns(customFields);
  const fields = [
    t('label.name'),
    t('label.status'),
    t('label.invoice-number'),
    t('label.dispensed-date'),
    t('label.reference'),
    t('label.comment'),
    ...cf.fields,
  ];
  const data = rows.map(row => [
    row.otherPartyName,
    statusLabel(asPrescriptionStatus(row.status)),
    row.invoiceNumber,
    exportDate(prescriptionDateOf(row)),
    row.theirReference,
    row.comment,
    ...cf.values(row.customFields),
  ]);
  return toCsv(fields, data);
};

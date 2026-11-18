import { t } from '../../../intl';
import { exportDate } from '../../../intl';
import { localisedTime } from '../../../intl/formatDateTime';
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
import { shownPatientName } from '../patientName';
import { medicinesGiven } from './medicinesGiven';
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
//
// In a store that dispenses on the Simple screen the file carries the list's
// Time and Medicines columns too, after the date (rules › Dispensing records).
export const prescriptionsToCsv = (
  rows: PrescriptionRow[],
  customFields: CustomFieldDef[] = [],
  options: { withMedicines?: boolean } = {}
): string => {
  const cf = customFieldCsvColumns(customFields);
  const simple = options.withMedicines ?? false;
  const fields = [
    t('label.name'),
    t('label.status'),
    t('label.invoice-number'),
    t('label.dispensed-date'),
    ...(simple ? [t('label.time'), t('label.medicines')] : []),
    t('label.reference'),
    t('label.comment'),
    ...cf.fields,
  ];
  const data = rows.map(row => [
    shownPatientName(row.otherPartyName, row.isForUnnamedPatient),
    statusLabel(asPrescriptionStatus(row.status)),
    row.invoiceNumber,
    exportDate(prescriptionDateOf(row)),
    ...(simple
      ? [
          localisedTime(prescriptionDateOf(row)),
          medicinesGiven(row.lines?.nodes ?? []),
        ]
      : []),
    row.theirReference,
    row.comment,
    ...cf.values(row.customFields),
  ]);
  return toCsv(fields, data);
};

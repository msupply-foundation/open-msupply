import { t } from '../../../intl';
import { localisedDate } from '../../../intl';
import { toCsv } from '../../../domain/reportFiles';
import {
  asPrescriptionStatus,
  prescriptionDateOf,
  statusLabel,
} from '../prescriptionStatus';
import type { PrescriptionsResult } from './prescriptions.generated';

type PrescriptionRow = PrescriptionsResult['invoices']['nodes'][number];

// The prescriptions list → CSV (spec/prescriptions AC-L4): the list's
// columns, every row matching the active filters. Headers are translated;
// the prescription date is the backdated-or-created coalescence the list
// shows; status uses the same catalog labels as the chip. Feeds the direct
// .csv download or the server's csvToExcel conversion (domain/reportFiles).
export const prescriptionsToCsv = (rows: PrescriptionRow[]): string => {
  const fields = [
    t('label.name'),
    t('label.status'),
    t('label.invoice-number'),
    t('label.prescription-date'),
    t('label.reference'),
    t('label.comment'),
  ];
  const data = rows.map(row => [
    row.otherPartyName,
    statusLabel(asPrescriptionStatus(row.status)),
    row.invoiceNumber,
    localisedDate(prescriptionDateOf(row)),
    row.theirReference,
    row.comment,
  ]);
  return toCsv(fields, data);
};

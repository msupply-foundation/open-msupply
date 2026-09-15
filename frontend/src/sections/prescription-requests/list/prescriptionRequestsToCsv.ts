import { t } from '../../../intl';
import { exportDate } from '../../../intl';
import { toCsv } from '../../../domain/reportFiles';
// The helper is taken from its own file, not the module's index: this
// serialiser is pure and node-tested, and the index also re-exports the
// custom-field COMPONENTS, which drag SolidJS's client-only APIs in with them.
import { customFieldCsvColumns } from '../../../domain/customFields/customFieldCsvColumns';
import type { CustomFieldDef } from '../../../domain/customFields';
import { asRequestStatus, statusLabel } from '../prescriptionRequestStatus';
import type { PrescriptionRequestsResult } from './prescriptionRequests.generated';

type RequestRow =
  PrescriptionRequestsResult['prescriptionRequests']['nodes'][number];

// The prescription-requests list → CSV (spec/prescription-requests AC-L7):
// the list's columns, every row matching the active filters. Headers are
// translated; dates localised; status uses the same catalog labels as the
// chip; Entered by is the creating account's username, as the column shows.
// Feeds the direct .csv download or the server's csvToExcel conversion
// (domain/reportFiles). Mirrors prescriptionsToCsv.
//
// The configured custom-field columns (S1 › Columns: one per configured
// request-scope field) trail the list's own, in the same order and with the
// same display strings the table renders.
export const prescriptionRequestsToCsv = (
  rows: RequestRow[],
  customFields: CustomFieldDef[] = []
): string => {
  const cf = customFieldCsvColumns(customFields);
  const fields = [
    t('label.number'),
    t('label.patient'),
    t('label.status'),
    t('label.prescription-date'),
    t('label.created'),
    t('label.entered-by'),
    t('label.comment'),
    ...cf.fields,
  ];
  const data = rows.map(row => [
    row.prescriptionRequestNumber,
    row.patient.name,
    statusLabel(asRequestStatus(row.status)),
    exportDate(row.prescriptionDatetime),
    exportDate(row.createdDatetime),
    row.user?.username ?? '',
    row.comment ?? '',
    ...cf.values(row.customFields),
  ]);
  return toCsv(fields, data);
};

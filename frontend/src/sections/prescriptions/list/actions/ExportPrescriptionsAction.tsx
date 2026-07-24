import { createSignal, type Component } from 'solid-js';
import { t } from '../../../../intl';
import { graphqlFetch } from '../../../../api/graphql';
import {
  SplitButton,
  type SplitButtonOption,
} from '../../../../ui/elements/buttons/SplitButton';
import { DownloadIcon } from '../../../../ui/icons';
import {
  csvToExcel,
  downloadBlob,
  fetchReportFile,
  listExportCsvFilename,
  listExportExcelFilename,
} from '../../../../domain/reportFiles';
import { storeCodeOf } from '../../../../auth/authContext';
import { stripEmpty } from '../../../../typeHelpers';
import { Prescriptions } from '../prescriptions.generated';
import type { PrescriptionsVariables } from '../prescriptions.generated';
import type { PrescriptionFilter } from '../listFilters';
import { prescriptionsToCsv } from '../prescriptionsToCsv';

// The prescriptions list Export (spec/prescriptions AC-L4): a split button
// offering CSV or Excel over EVERY row matching the current filter (all
// pages). Filenames follow the shared list-export rule with
// `filename.prescriptions` as the list-name slot (ui-standards/list-views §
// regions). Same self-contained shape as the stocktakes export action.

export interface ExportPrescriptionsActionProps {
  storeId: string;
  /** The list's current filter — the export matches it (all pages). */
  filter: () => PrescriptionFilter;
}

export const ExportPrescriptionsAction: Component<
  ExportPrescriptionsActionProps
> = props => {
  const [busy, setBusy] = createSignal(false);

  const options = (): SplitButtonOption[] => [
    { value: 'csv', label: t('button.export-csv') },
    { value: 'excel', label: t('button.export-excel') },
  ];

  const buildCsv = async (): Promise<string | null> => {
    const variables: PrescriptionsVariables = {
      storeId: props.storeId,
      filter: {
        ...stripEmpty(props.filter()),
        type: { equalTo: 'PRESCRIPTION' },
      },
      // One sort key only (contract wire trap): the list's default order —
      // prescription date, newest first.
      sort: [{ key: 'invoiceDatetime', desc: true }],
    };
    const result = await graphqlFetch(Prescriptions, variables);
    if (result.kind !== 'success') return null;
    const nodes = result.data.invoices.nodes;
    return nodes.length ? prescriptionsToCsv(nodes) : null;
  };

  const run = async (format: string): Promise<void> => {
    if (busy()) return;
    setBusy(true);
    try {
      const csv = await buildCsv();
      if (!csv) return; // nothing to export
      const storeCode = storeCodeOf(props.storeId);
      const listName = t('filename.prescriptions');
      if (format === 'excel') {
        const generated = await csvToExcel({
          storeId: props.storeId,
          csvData: csv,
          filename: listExportExcelFilename(storeCode, listName),
          sheetName: storeCode,
        });
        if (generated.kind !== 'fileId') return;
        const file = await fetchReportFile(generated.fileId);
        if (file.kind === 'success') downloadBlob(file.blob, file.filename);
      } else {
        downloadBlob(
          new Blob([csv], { type: 'text/csv;charset=utf-8;' }),
          listExportCsvFilename(storeCode, listName, new Date())
        );
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <SplitButton
      icon={<DownloadIcon />}
      options={options()}
      testId="export-csv"
      menuLabel={t('button.export')}
      onAction={format => void run(format)}
    />
  );
};

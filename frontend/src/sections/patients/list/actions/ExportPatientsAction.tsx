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
import { Patients, type PatientsVariables } from '../patients.generated';
import type { PatientFilter } from '../listFilters';
import { patientsToCsv } from '../patientsToCsv';

// The patient list Export action (spec/patients S1 "Export CSV"): a split button
// offering CSV or Excel, exporting EVERY patient matching the current filter
// (not just the page). CSV downloads directly; Excel round-trips the CSV through
// the server converter. Self-contained (kdd/action-modal), owning its own fetch
// + busy state; failures fall through the global error modal.

export interface ExportPatientsActionProps {
  storeId: string;
  /** The list's current filter — the export matches it (all pages). */
  filter: () => PatientFilter;
}

export const ExportPatientsAction: Component<
  ExportPatientsActionProps
> = props => {
  const [busy, setBusy] = createSignal(false);

  const options = (): SplitButtonOption[] => [
    { value: 'csv', label: t('button.export-csv') },
    { value: 'excel', label: t('button.export-excel') },
  ];

  const buildCsv = async (): Promise<string | null> => {
    const variables: PatientsVariables = {
      storeId: props.storeId,
      filter: stripEmpty(props.filter()),
      sort: [{ key: 'createdDatetime', desc: true }],
    };
    const result = await graphqlFetch(Patients, variables);
    if (result.kind !== 'success') return null;
    const nodes = result.data.patients.nodes;
    return nodes.length ? patientsToCsv(nodes) : null;
  };

  const run = async (format: string): Promise<void> => {
    if (busy()) return;
    setBusy(true);
    try {
      const csv = await buildCsv();
      if (!csv) return; // nothing to export
      // Filenames per the shared list-export rule
      // (ui-standards/list-views § regions).
      const storeCode = storeCodeOf(props.storeId);
      const listName = t('filename.patients');
      if (format === 'excel') {
        const generated = await csvToExcel({
          storeId: props.storeId,
          csvData: csv,
          filename: listExportExcelFilename(storeCode, listName),
          sheetName: storeCode,
        });
        if (generated.kind !== 'fileId') return; // error already surfaced
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

import { createSignal, Show, type Component } from 'solid-js';
import { t } from '../../../intl';
import {
  SplitButton,
  type SplitButtonOption,
} from '../../../ui/elements/buttons/SplitButton';
import { Alert } from '../../../ui/elements/feedback/Alert';
import { DownloadIcon } from '../../../ui/icons';
import {
  csvToExcel,
  downloadBlob,
  fetchReportFile,
  listExportCsvFilename,
  listExportExcelFilename,
} from '../../../domain/reportFiles';
import { currentStoreId } from '../../../store/storeContext';
import { storeCodeOf } from '../../../auth/authContext';
import {
  masterListsToCsv,
  type MasterListExportRow,
} from '../masterListExport';

// The list-index Export action (spec/master-lists S1 › export). A split button
// (Export CSV primary · Excel in the menu) exporting the CURRENTLY-LOADED page
// only (AC-E1) — the rows are handed in, never re-fetched. CSV downloads
// directly; Excel round-trips the CSV through the shared server converter
// (domain/reportFiles). With no rows, the "No data available" message shows
// instead of a download (AC-E3). Downloads are silent — no toast (captured
// as-is; D21).
export const ExportMasterListsAction: Component<{
  rows: () => MasterListExportRow[];
}> = props => {
  const [busy, setBusy] = createSignal(false);
  const [noData, setNoData] = createSignal(false);

  const options = (): SplitButtonOption[] => [
    { value: 'csv', label: t('button.export-csv') },
    { value: 'excel', label: t('button.export-excel') },
  ];

  const run = async (format: string): Promise<void> => {
    if (busy()) return;
    const rows = props.rows();
    if (rows.length === 0) {
      setNoData(true); // AC-E3
      return;
    }
    setNoData(false);
    setBusy(true);
    try {
      const csv = masterListsToCsv(rows, {
        code: t('label.code'),
        name: t('label.name'),
        description: t('heading.description'),
      });
      const storeId = currentStoreId();
      if (!storeId) return; // store-scoped route always has one; guard for the type

      // Filenames per the shared list-export rule
      // (ui-standards/list-views § regions).
      const storeCode = storeCodeOf(storeId);
      const listName = t('filename.master-lists');
      if (format === 'excel') {
        const generated = await csvToExcel({
          storeId,
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
    <>
      <SplitButton
        icon={<DownloadIcon />}
        options={options()}
        testId="export-csv"
        menuLabel={t('button.export')}
        onAction={format => void run(format)}
      />
      <Show when={noData()}>
        <Alert severity="error">{t('error.no-data')}</Alert>
      </Show>
    </>
  );
};

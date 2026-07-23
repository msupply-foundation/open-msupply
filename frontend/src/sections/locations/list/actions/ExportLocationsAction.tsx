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
import { stripEmpty } from '../../../../typeHelpers';
import { storeCodeOf } from '../../../../auth/authContext';
import { LocationsList } from '../locations.generated';
import type { LocationsListVariables } from '../locations.generated';
import type { LocationFilter } from '../listFilters';
import { locationsToCsv } from '../locationsToCsv';

// The locations list Export action (spec/locations S1, AC-L5): a split button
// offering CSV or Excel, exporting EVERY location matching the current filter
// — all pages, not just the visible one (list-views § regions, D12). CSV
// downloads directly; Excel round-trips the CSV through the server's
// csvToExcel converter. Mirrors the reference vertical's
// ExportStocktakesAction: a self-contained action owning its own fetch + busy
// state; failures fall through the global error modal (the helpers never
// throw).

export interface ExportLocationsActionProps {
  storeId: string;
  /** The list's current filter — the export matches it (all pages). */
  filter: () => LocationFilter;
}

export const ExportLocationsAction: Component<
  ExportLocationsActionProps
> = props => {
  const [busy, setBusy] = createSignal(false);

  // An accessor read in JSX, so the labels re-translate on a language switch.
  const options = (): SplitButtonOption[] => [
    { value: 'csv', label: t('button.export-csv') },
    { value: 'excel', label: t('button.export-excel') },
  ];

  // Fetch every matching location (no page cap) and build the CSV. Returns
  // null when there's nothing to export. Sorted like the list's default (name
  // ascending — AC-L2) so the file reads like the screen.
  const buildCsv = async (): Promise<string | null> => {
    const variables: LocationsListVariables = {
      storeId: props.storeId,
      filter: stripEmpty(props.filter()),
      sort: [{ key: 'name' }],
    };
    const result = await graphqlFetch(LocationsList, variables);
    if (result.kind !== 'success') return null;
    const nodes = result.data.locations.nodes;
    return nodes.length ? locationsToCsv(nodes) : null;
  };

  const run = async (format: string): Promise<void> => {
    if (busy()) return;
    setBusy(true);
    try {
      const csv = await buildCsv();
      if (!csv) return; // nothing to export
      // Filenames per the shared list-export rule (AC-L5 →
      // ui-standards/list-views § regions).
      const storeCode = storeCodeOf(props.storeId);
      const listName = t('filename.locations');
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

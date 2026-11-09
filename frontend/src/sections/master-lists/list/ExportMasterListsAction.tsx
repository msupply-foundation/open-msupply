import { createSignal, Show, type Component } from 'solid-js';
import { t } from '@/intl';
import { Alert } from '@/ui/elements/feedback/Alert';
import { ListExportAction } from '@/domain/reportFiles/ListExportAction';
import { currentStoreId } from '@/store/storeContext';
import {
  masterListsToCsv,
  type MasterListExportRow,
} from '../masterListExport';

// The list-index Export action (spec/master-lists S1 › export): the shared
// CSV/Excel split button, exporting the CURRENTLY-LOADED page only
// (OMS-REG-CAT-07.26) — the rows are handed in, never re-fetched. Delivery, the
// busy state and the outcome report live in ListExportAction; the empty-list
// notice (.29) is this vertical's own, since "nothing to export" is a distinct
// outcome from a failed export.
export const ExportMasterListsAction: Component<{
  rows: () => MasterListExportRow[];
}> = props => {
  const [noData, setNoData] = createSignal(false);

  const buildCsv = (): Promise<string | null> => {
    const rows = props.rows();
    setNoData(rows.length === 0); // OMS-REG-CAT-07.29
    // No store on a store-scoped route is impossible; the guard is for the type
    // (and stops the export before storeId below is read).
    if (rows.length === 0 || !currentStoreId()) return Promise.resolve(null);
    return Promise.resolve(
      masterListsToCsv(rows, {
        code: t('label.code'),
        name: t('label.name'),
        description: t('heading.description'),
      })
    );
  };

  return (
    <>
      <ListExportAction
        storeId={currentStoreId() ?? ''}
        buildCsv={buildCsv}
        listName={t('filename.master-lists')}
      />
      <Show when={noData()}>
        <Alert severity="error">{t('error.no-data')}</Alert>
      </Show>
    </>
  );
};

import { createResource, createSignal, Match, Show, Switch } from 'solid-js';
import type { Component } from 'solid-js';
import { t, tPlural } from '@/intl';
import { graphqlFetch } from '@/api/graphql';
import { gated } from '@/api/gated';
import { generateUUID } from '@/uuid';
import { saveBlob } from '@/platform/openDocument';
import { parseCsv, readCsvFile } from '@/domain/reportFiles';
import { CSV_ACCEPT, isCsvFileName } from '@/domain/csvImport';
import { Dialog } from '@/ui/elements/feedback/Dialog';
import { Alert } from '@/ui/elements/feedback/Alert';
import { Button } from '@/ui/elements/buttons/Button';
import { CancelButton } from '@/ui/elements/buttons/StandardButtons';
import { UploadZone } from '@/ui/elements/inputs/UploadZone';
import { ProgressList, type ProgressStep } from '@/ui/sync/ProgressList';
import {
  DataTable,
  type Column,
  type SortState,
} from '@/ui/elements/table/DataTable';
import { sortRows } from '@/list/sortRows';
import { ArrowRightIcon, ExportIcon, ImportIcon } from '@/ui/icons';
import { AssetCategories, AssetTypes } from '../catalogue/catalogue.generated';
import {
  AssetClasses,
  AssetProperties,
  InsertAssetCatalogueItem,
} from './catalogueImport.generated';
import {
  canStartImport,
  errorMessage,
  importFilename,
  insertRefusal,
  parseCatalogueRows,
  rowsCsv,
  runImport,
  templateCsv,
  toInsertInput,
  type CatalogueLookups,
  type ImportRow,
  type ParsedFile,
  type RunProgress,
} from './catalogueImport';
import { refusalReason } from '../refusals';

// The catalogue import (spec/asset-catalogue S2 · rules § bulk import):
// upload → review → import. The upload checks block a file with any failing
// row; the run adds each row on its own and returns the refused rows to review
// with their reasons, downloadable to correct and upload again. A clean run
// closes the modal — closure plus the list refreshing is the confirmation.

export interface ImportCatalogueModalProps {
  storeId: string;
  onClose: () => void;
  /** Something was added — refresh the list. */
  onImported: () => void;
}

type Step = 'upload' | 'review' | 'import';

/** A review row: the parsed row and the one message it shows. */
type ReviewRow = { id: string; row: ImportRow; message: string };

type ReviewKey =
  | 'subCatalogue'
  | 'code'
  | 'type'
  | 'manufacturer'
  | 'model'
  | 'class'
  | 'category'
  | 'errorMessage';

export const ImportCatalogueModal: Component<
  ImportCatalogueModalProps
> = props => {
  const [step, setStep] = createSignal<Step>('upload');
  const [file, setFile] = createSignal<ParsedFile>();
  const [invalidFile, setInvalidFile] = createSignal(false);
  // After a run: the refused rows with their reasons (undefined before one).
  const [refused, setRefused] = createSignal<ReviewRow[]>();
  const [progress, setProgress] = createSignal<RunProgress>();
  const [saveError, setSaveError] = createSignal<string>();
  const [sort, setSort] = createSignal<SortState<ReviewKey>>();

  // What a file's names resolve against — fetched once, when the modal opens.
  const [lookups] = createResource(
    async (): Promise<CatalogueLookups | undefined> => {
      const [classes, categories, types, properties] = await Promise.all([
        graphqlFetch(AssetClasses, {}),
        graphqlFetch(AssetCategories, {}),
        graphqlFetch(AssetTypes, {}),
        graphqlFetch(AssetProperties, {}),
      ]);
      if (
        classes.kind !== 'success' ||
        categories.kind !== 'success' ||
        types.kind !== 'success' ||
        properties.kind !== 'success'
      )
        return undefined;
      return {
        classes: classes.data.assetClasses.nodes,
        categories: categories.data.assetCategories.nodes,
        types: types.data.assetTypes.nodes,
        properties: properties.data.assetProperties.nodes,
      };
    }
  );
  const ready = () => gated(lookups);

  const running = () => step() === 'import';
  const uploadFailed = () =>
    refused() === undefined &&
    (file()?.rows.some(row => row.errors.length > 0) ?? false);

  const reviewRows = (): ReviewRow[] => {
    const rows =
      refused() ??
      (file()?.rows ?? []).map((row, index) => ({
        id: String(index),
        row,
        message: errorMessage(row.errors),
      }));
    const s = sort();
    return s ? sortRows(rows, s, (r, key) => reviewValue(r, key)) : rows;
  };

  const download = async (csv: string, name: string) => {
    setSaveError(undefined);
    const saved = await saveBlob(
      new Blob([csv], { type: 'text/csv;charset=utf-8;' }),
      importFilename(name, new Date())
    );
    if (!saved.ok) setSaveError(saved.message);
  };

  const downloadTemplate = () => {
    const known = ready();
    if (known)
      void download(
        templateCsv(known.properties),
        t('filename.asset-import-example')
      );
  };

  const exportRows = () => {
    const header = file()?.header ?? [];
    void download(
      rowsCsv(
        header,
        reviewRows().map(r => ({ cells: r.row.cells, message: r.message }))
      ),
      t('filename.failed-import-rows')
    );
  };

  const onFiles = async (files: File[]) => {
    const picked = files[0];
    const known = ready();
    if (!picked || !known) return;
    setRefused(undefined);
    setSort(undefined);
    if (!isCsvFileName(picked.name)) {
      setFile(undefined);
      setInvalidFile(true);
      return;
    }
    setInvalidFile(false);
    const table = parseCsv(await readCsvFile(picked));
    setFile(parseCatalogueRows(table, known));
    setStep('review');
  };

  // Back to the upload step: the file is discarded.
  const restart = () => {
    setFile(undefined);
    setRefused(undefined);
    setInvalidFile(false);
    setStep('upload');
  };

  const insertOne = async (row: ImportRow): Promise<string | undefined> => {
    const result = await graphqlFetch(
      InsertAssetCatalogueItem,
      { storeId: props.storeId, input: toInsertInput(row, generateUUID()) },
      { returnGraphqlErrors: true }
    );
    if (result.kind === 'success')
      return insertRefusal(
        result.data.centralServer.assetCatalogue.insertAssetCatalogueItem
      );
    if (result.kind === 'graphqlError') return refusalReason(result.errors);
    return t('messages.unknown-error');
  };

  const startImport = async () => {
    const parsed = file();
    if (!parsed || !canStartImport(parsed.rows) || running()) return;
    setStep('import');
    setProgress({ sent: 0, total: parsed.rows.length, refused: 0 });
    const failures = await runImport(parsed.rows, insertOne, setProgress);
    if (failures.length < parsed.rows.length) props.onImported();
    if (failures.length === 0) {
      props.onClose();
      return;
    }
    setRefused(
      failures.map((failure, index) => ({
        id: `refused-${index}`,
        row: failure.row,
        message: failure.reason,
      }))
    );
    setSort(undefined);
    setStep('review');
  };

  const steps = (): ProgressStep[] => {
    const current = step();
    const run = progress();
    return [
      {
        label: t('label.upload'),
        started: true,
        finished: current !== 'upload',
        testId: 'import-step-upload',
      },
      {
        label: t('label.review'),
        started: current !== 'upload',
        finished: current === 'import',
        testId: 'import-step-review',
      },
      {
        label: t('label.import'),
        started: current === 'import',
        finished: false,
        done: current === 'import' ? run?.sent : undefined,
        total: current === 'import' ? run?.total : undefined,
        testId: 'import-step-import',
      },
    ];
  };

  const columns = (): Column<ReviewRow, ReviewKey>[] => [
    reviewColumn('subCatalogue', 'label.sub-catalogue'),
    reviewColumn('code', 'label.code'),
    reviewColumn('type', 'label.type'),
    reviewColumn('manufacturer', 'label.manufacturer'),
    reviewColumn('model', 'label.model'),
    reviewColumn('class', 'label.class'),
    reviewColumn('category', 'label.category'),
    reviewColumn('errorMessage', 'label.error-message'),
  ];

  return (
    <Dialog
      open
      size="full"
      onClose={props.onClose}
      dismissable={!running()}
      icon={<ImportIcon />}
      title={t('label.import')}
      testId="import-catalogue-modal"
      actions={
        <>
          <Show when={!running()}>
            <CancelButton
              data-testid="dialog-button-cancel"
              onClick={props.onClose}
            />
          </Show>
          <Button
            variant="secondary"
            icon={<ExportIcon />}
            data-testid="dialog-button-export"
            disabled={
              running() || !(uploadFailed() || (refused()?.length ?? 0) > 0)
            }
            onClick={exportRows}
          >
            {t('button.export')}
          </Button>
          <Button
            icon={<ArrowRightIcon />}
            confirms="plain"
            data-testid="dialog-button-next-and-ok"
            loading={running()}
            disabled={
              step() !== 'review' ||
              refused() !== undefined ||
              !canStartImport(file()?.rows ?? [])
            }
            onClick={() => void startImport()}
          >
            {t('button.ok-and-next')}
          </Button>
        </>
      }
    >
      <ProgressList steps={steps()} testId="import-steps" />
      <Switch>
        <Match when={invalidFile()}>
          <Alert severity="error" testId="import-outcome">
            {t('messages.invalid-file')}
          </Alert>
        </Match>
        <Match when={refused() !== undefined}>
          <Alert severity="error" testId="import-outcome">
            {t('messages.import-error-assets')}
          </Alert>
        </Match>
        <Match when={uploadFailed()}>
          <Alert severity="error" testId="import-outcome">
            {t('messages.import-error-on-upload')}
          </Alert>
        </Match>
      </Switch>
      <Show when={saveError()}>
        {message => (
          <Alert severity="error">
            {t('messages.cannot-save-file')} {message()}
          </Alert>
        )}
      </Show>
      <Switch>
        <Match when={step() === 'upload'}>
          <UploadZone
            accept={CSV_ACCEPT}
            multiple={false}
            disabled={!ready()}
            inputTestId="import-file-input"
            onFiles={files => void onFiles(files)}
            // The zone filters by `accept`, so a non-CSV file arrives here as
            // a rejection, never through onFiles — refuse it just the same
            // (rules § bulk import: not named .csv → invalid file).
            onRejected={() => {
              setFile(undefined);
              setRefused(undefined);
              setInvalidFile(true);
            }}
          />
          <p>
            {t('messages.template-download-text')}
            <Button
              variant="ghost"
              size="small"
              data-testid="download-template-button"
              disabled={!ready()}
              onClick={downloadTemplate}
            >
              {t('heading.download-example')}
            </Button>
          </p>
        </Match>
        <Match when={step() === 'review'}>
          {/* The step indicator is not navigable, so returning to Upload —
              to fix a blocked file, or re-upload corrected refused rows — is
              this action (BUILD_REPORT › refinements). */}
          <Button
            variant="ghost"
            size="small"
            data-testid="import-upload-again"
            onClick={restart}
          >
            {t('button.upload-a-new-one')}
          </Button>
          <DataTable
            columns={columns()}
            rows={reviewRows()}
            rowKey={r => r.id}
            sort={sort()}
            onSort={(key, desc) => setSort({ key, desc })}
          />
        </Match>
        <Match when={step() === 'import'}>
          <p data-testid="import-refused-count">
            <Show when={(progress()?.refused ?? 0) > 0}>
              {tPlural('messages.error-generic', progress()?.refused ?? 0)}
            </Show>
          </p>
        </Match>
      </Switch>
    </Dialog>
  );
};

/** A review column: text off the row, sortable in place. */
const reviewColumn = (
  key: ReviewKey,
  label: Parameters<typeof t>[0]
): Column<ReviewRow, ReviewKey> => ({
  c: { accessor: row => reviewValue(row, key), id: key },
  sortKey: key,
  header: () => t(label),
});

const reviewValue = (r: ReviewRow, key: ReviewKey): string => {
  switch (key) {
    case 'errorMessage':
      return r.message;
    case 'class':
      return r.row.className;
    default:
      return r.row[key];
  }
};

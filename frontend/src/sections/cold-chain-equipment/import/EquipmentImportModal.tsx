import { createMemo, createSignal, Show, type Component } from 'solid-js';
import { graphqlFetch } from '@/api/graphql';
import { t } from '@/intl';
import { generateUUID } from '@/uuid';
import { saveBlob } from '@/platform/openDocument';
import { Dialog } from '@/ui/elements/feedback/Dialog';
import { CancelButton } from '@/ui/elements/buttons/StandardButtons';
import { Button } from '@/ui/elements/buttons/Button';
import { Alert } from '@/ui/elements/feedback/Alert';
import { Text } from '@/ui/elements/typography/Text';
import { Stack } from '@/ui/layout/Stack/Stack';
import { ProgressList } from '@/ui/sync/ProgressList';
import { UploadZone } from '@/ui/elements/inputs/UploadZone';
import { DownloadIcon } from '@/ui/icons';
import { DataTable, type Column } from '@/ui/elements/table/DataTable';
import { getFlagCell, getTextCell } from '@/ui/elements/table/tableHelpers';
import { remToPx } from '@/ui/utils/rem';
import { CCE_CLASS_ID, statusLabelKey } from '../equipment';
import { InsertAsset, InsertAssetLog } from '../equipment.generated';
import {
  AssetCatalogueItemsList,
  AssetPropertiesList,
} from '../catalogue.generated';
import { storePageFetcher } from '@/domain/store';
import { buildCreatedLogInput } from '../list/createAsset';
import { applicableProperties, type PropertyDefinition } from '../detail/assetProperties';
import {
  CSV_ACCEPT,
  IMPORT_BATCH_SIZE,
  buildTemplateCsv,
  canImport,
  failedRowsToCsv,
  hasErrors,
  hasWarnings,
  isCsvFileName,
  parseImportFile,
  rowToInsertInput,
  type ImportRow,
} from './importParse';

/*
 * S4 — the equipment CSV import (spec/cold-chain-equipment § bulk import,
 * ui-surface S4). Three steps — Upload · Review · Import — and the user cannot
 * skip ahead: review is reachable only once a file has parsed, and the import
 * step never by clicking. The step indicator is a DISPLAY, not a set of
 * controls.
 *
 * Nothing about the import is server-side: every row is validated here, then
 * created with one insertAsset (+ its opening status entry) per row, a hundred
 * at a time, with no transaction across them. Partial application is the
 * contract — which is why a run with any failure returns to Review carrying
 * exactly the failed rows and their reasons (AC-I10).
 */

type Step = 'upload' | 'review' | 'import';

export interface EquipmentImportModalProps {
  storeId: string;
  /** Central + Manage only: the file may then name a store per row. */
  isCentral: boolean;
  onClose: () => void;
  /** Rows were created — the list re-queries so they appear. */
  onImported: () => void;
}

export const EquipmentImportModal: Component<
  EquipmentImportModalProps
> = props => {
  const [step, setStep] = createSignal<Step>('upload');
  const [rows, setRows] = createSignal<ImportRow[]>([]);
  const [uploadError, setUploadError] = createSignal<string>();
  const [importError, setImportError] = createSignal<string>();
  const [importing, setImporting] = createSignal(false);
  const [done, setDone] = createSignal(0);

  /*
   * The catalogue the rows are matched against, fetched at most once per open
   * and cached as a PROMISE rather than a resource — nothing here reads it
   * during render, so it never touches a Suspense boundary and can never
   * remount the open dialog (kdd/solid-reactivity-pitfalls § no remounts on
   * interaction).
   */
  let cataloguePromise:
    | Promise<{
        catalogueItems: { id: string; code: string }[];
        stores: { id: string; code?: string | null }[];
        properties: PropertyDefinition[];
      }>
    | undefined;

  const loadCatalogue = () =>
    (cataloguePromise ??= (async () => {
      const [items, properties, stores] = await Promise.all([
        graphqlFetch(
          AssetCatalogueItemsList,
          { filter: { classId: { equalTo: CCE_CLASS_ID } } },
          { background: true }
        ),
        graphqlFetch(AssetPropertiesList, {}, { background: true }),
        // Every store, for the file's optional store-code column. The shared
        // paginated fetcher's first page is enough for the codes a file names
        // in practice; a code beyond it reads as no match, which is the same
        // outcome as a typo (AC-I5 sibling).
        props.isCentral ? storePageFetcher()('', 0) : Promise.resolve(undefined),
      ]);
      return {
        catalogueItems:
          items.kind === 'success'
            ? items.data.assetCatalogueItems.nodes.map(node => ({
                id: node.id,
                code: node.code,
              }))
            : [],
        properties:
          properties.kind === 'success'
            ? applicableProperties(properties.data.assetProperties.nodes)
            : [],
        stores: stores?.nodes ?? [],
      };
    })());

  const downloadTemplate = async () => {
    const { properties } = await loadCatalogue();
    const csv = buildTemplateCsv(
      properties.map(property => property.key),
      props.isCentral
    );
    await saveBlob(
      new Blob([csv], { type: 'text/csv;charset=utf-8;' }),
      `${t('filename.cce')}.csv`
    );
  };

  const onFile = async (file: File) => {
    setUploadError(undefined);
    setImportError(undefined);
    // Judged by the file's NAME, before anything is parsed (AC-I1).
    if (!isCsvFileName(file.name))
      return setUploadError(t('messages.invalid-file'));
    try {
      const [text, catalogue] = await Promise.all([
        file.text(),
        loadCatalogue(),
      ]);
      const parsed = parseImportFile(text, {
        ...catalogue,
        isCentral: props.isCentral,
        newId: () => generateUUID(),
      });
      if (parsed.length === 0) return setUploadError(t('messages.invalid-file'));
      setRows(parsed);
      // Review is reachable only NOW — once a file has parsed (AC-I2).
      setStep('review');
    } catch (error) {
      setUploadError(String(error));
    }
  };

  /*
   * Import. Rows are created INDEPENDENTLY, a hundred at a time, so rows that
   * succeed are created even when others fail (AC-I9/AC-I10). Each created
   * asset also opens its status history at the row's own status.
   */
  const runImport = async () => {
    setImporting(true);
    setImportError(undefined);
    setDone(0);
    setStep('import');
    const storeId = props.storeId;
    const attempted = rows();
    const failures: ImportRow[] = [];

    for (let at = 0; at < attempted.length; at += IMPORT_BATCH_SIZE) {
      const batch = attempted.slice(at, at + IMPORT_BATCH_SIZE);
      const settled = await Promise.all(
        batch.map(async row => {
          const inserted = await graphqlFetch(
            InsertAsset,
            {
              storeId,
              input: rowToInsertInput(row, CCE_CLASS_ID),
            },
            { background: true, returnGraphqlErrors: true }
          );
          if (inserted.kind !== 'success') {
            return {
              ...row,
              errors: [t('messages.unknown-error')],
            } satisfies ImportRow;
          }
          // The opening status entry, at the status the row named.
          await graphqlFetch(
            InsertAssetLog,
            {
              storeId,
              input: buildCreatedLogInput(
                row.id,
                generateUUID(),
                t('message.asset-created'),
                row.status
              ),
            },
            { background: true }
          );
          return null;
        })
      );
      settled.forEach(failed => failed && failures.push(failed));
      setDone(Math.min(at + batch.length, attempted.length));
    }

    setImporting(false);
    // Whatever happened, the list must re-read: the successes are created.
    props.onImported();

    if (failures.length === 0) {
      props.onClose();
      return;
    }
    // A failed run stays open on Review, showing exactly the rows that failed
    // with the reason each was refused (AC-I10).
    setImportError(t('messages.import-error'));
    setRows(failures);
    setStep('review');
  };

  const exportFailed = async () => {
    const { properties } = await loadCatalogue();
    const csv = failedRowsToCsv(
      rows(),
      properties.map(property => property.key),
      props.isCentral
    );
    await saveBlob(
      new Blob([csv], { type: 'text/csv;charset=utf-8;' }),
      `${t('filename.cce-failed-uploads')}.csv`
    );
  };

  const steps = () => {
    const current = step();
    return [
      { label: t('label.upload'), started: true, finished: current !== 'upload' },
      {
        label: t('label.review'),
        started: current !== 'upload',
        finished: current === 'import',
      },
      {
        label: t('label.import'),
        started: current === 'import',
        finished: current === 'import' && !importing(),
      },
    ];
  };

  // One column per specification key the parsed rows actually carry — the file
  // decides which, so the review table follows it rather than the catalogue.
  const propertyKeys = createMemo(() => [
    ...new Set(rows().flatMap(row => Object.keys(row.properties))),
  ]);

  const columns = (): Column<ImportRow, never>[] => [
    ...(props.isCentral
      ? [
          {
            c: { key: 'storeCode' as const },
            header: () => t('label.store'),
            ...getTextCell<ImportRow>(),
            size: remToPx(7),
          } as Column<ImportRow, never>,
        ]
      : []),
    {
      c: { key: 'assetNumber' },
      header: () => t('label.asset-number'),
      ...getTextCell(),
      size: remToPx(8),
    },
    {
      c: { key: 'catalogueItemCode' },
      header: () => t('label.catalogue-item-code'),
      ...getTextCell(),
      size: remToPx(10),
    },
    {
      c: { accessor: row => row.installationDate ?? '', id: 'installationDate' },
      header: () => t('label.installation-date'),
      ...getTextCell(),
      size: remToPx(8),
    },
    {
      c: { accessor: row => row.replacementDate ?? '', id: 'replacementDate' },
      header: () => t('label.replacement-date'),
      ...getTextCell(),
      size: remToPx(8),
    },
    {
      c: { accessor: row => row.warrantyStart ?? '', id: 'warrantyStart' },
      header: () => t('label.warranty-start-date'),
      ...getTextCell(),
      size: remToPx(8),
    },
    {
      c: { accessor: row => row.warrantyEnd ?? '', id: 'warrantyEnd' },
      header: () => t('label.warranty-end-date'),
      ...getTextCell(),
      size: remToPx(8),
    },
    {
      c: { key: 'serialNumber' },
      header: () => t('label.serial'),
      ...getTextCell(),
      size: remToPx(8),
    },
    {
      c: { accessor: row => t(statusLabelKey(row.status)), id: 'status' },
      header: () => t('label.functional-status'),
      ...getTextCell(),
      size: remToPx(10),
    },
    {
      c: { key: 'needsReplacement' },
      header: () => t('label.needs-replacement'),
      ...getFlagCell<ImportRow>(t('label.needs-replacement')),
      size: remToPx(8),
    },
    {
      c: { key: 'notes' },
      header: () => t('label.asset-notes'),
      ...getTextCell(),
      size: remToPx(10),
    },
    // One column per specification key the file carries, headed by the key.
    ...propertyKeys().map(
      (key): Column<ImportRow, never> => ({
        c: {
          accessor: row => String(row.properties[key] ?? ''),
          id: `property-${key}`,
        },
        header: () => key,
        ...getTextCell(),
        size: remToPx(9),
      })
    ),
    // Shown only when some row warned / failed (ui-surface S4 § review).
    ...(hasWarnings(rows())
      ? [
          {
            c: { accessor: row => row.warnings.join(' '), id: 'warningMessage' },
            header: () => t('label.warning-message'),
            ...getTextCell<ImportRow>(),
            size: remToPx(14),
          } as Column<ImportRow, never>,
        ]
      : []),
    ...(hasErrors(rows())
      ? [
          {
            c: { accessor: row => row.errors.join(' '), id: 'errorMessage' },
            header: () => t('label.error-message'),
            ...getTextCell<ImportRow>(),
            size: remToPx(14),
          } as Column<ImportRow, never>,
        ]
      : []),
  ];

  return (
    <Dialog
      open
      onClose={props.onClose}
      title={t('label.import-cce')}
      // The widest content measure: the review table carries one column per
      // specification key and must be readable without horizontal scrolling
      // wherever it can be (ui-surface S4 § layout).
      width="wide"
      testId="import-equipment-modal"
      dismissable={!importing()}
      actions={
        <>
          <CancelButton
            onClick={props.onClose}
            disabled={importing()}
            data-testid="dialog-button-cancel"
          />
          {/* Enabled only once rows have FAILED — there is nothing to export
              from a clean file (ui-surface S4 § footer). */}
          <Button
            variant="secondary"
            icon={<DownloadIcon />}
            disabled={!hasErrors(rows()) || importing()}
            onClick={() => void exportFailed()}
            data-testid="dialog-button-export"
          >
            {t('button.export')}
          </Button>
          {/* Disabled until at least one row has parsed with no errors
              (AC-I2/AC-I3). */}
          <Button
            variant="primary"
            confirms="plain"
            loading={importing()}
            disabled={!canImport(rows()) || importing()}
            onClick={() => void runImport()}
            data-testid="dialog-button-ok"
          >
            {t('button.ok-and-next')}
          </Button>
        </>
      }
    >
      <Stack>
        <ProgressList steps={steps()} error={!!importError()} />

        <Show when={uploadError()}>
          {message => (
            <Alert severity="error" testId="import-upload-error">
              {message()}
            </Alert>
          )}
        </Show>
        <Show when={importError()}>
          {message => (
            <Alert severity="error" testId="import-outcome">
              {message()}
            </Alert>
          )}
        </Show>
        {/* Any row error blocks the import; warnings do not (AC-I3/AC-I6). */}
        <Show when={!importError() && rows().length > 0 && hasErrors(rows())}>
          <Alert severity="error">{t('messages.import-error-on-upload')}</Alert>
        </Show>
        <Show
          when={
            !importError() && rows().length > 0 && !hasErrors(rows()) &&
            hasWarnings(rows())
          }
        >
          <Alert severity="warning">
            {t('messages.import-warning-on-upload')}
          </Alert>
        </Show>

        <Show when={step() === 'upload'}>
          <Stack>
            <UploadZone
              accept={CSV_ACCEPT}
              multiple={false}
              inputTestId="import-file-input"
              onFiles={files => files[0] && void onFile(files[0])}
            />
            <Text>
              {t('messages.template-download-text')}
              <Button
                variant="ghost"
                icon={<DownloadIcon />}
                data-testid="download-template-button"
                onClick={() => void downloadTemplate()}
              >
                {t('heading.download-example')}
              </Button>
            </Text>
          </Stack>
        </Show>

        <Show when={step() !== 'upload'}>
          <Show when={step() === 'import'}>
            <Text>
              {t('messages.import-generic', { count: done() })} ({done()}/
              {rows().length})
            </Text>
          </Show>
          <DataTable
            columns={columns()}
            rows={rows()}
            rowKey={row => row.id}
            emptyMessage={t('error.no-items-to-display')}
          />
        </Show>
      </Stack>
    </Dialog>
  );
};

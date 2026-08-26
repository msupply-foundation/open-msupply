import { createMemo, createSignal, Show, type Component } from 'solid-js';
import { graphqlFetch } from '@/api/graphql';
import { t, tPlural } from '@/intl';
import { Dialog } from '@/ui/elements/feedback/Dialog';
import { CancelButton } from '@/ui/elements/buttons/StandardButtons';
import { Button } from '@/ui/elements/buttons/Button';
import { Alert } from '@/ui/elements/feedback/Alert';
import { Text } from '@/ui/elements/typography/Text';
import { Stack } from '@/ui/layout/Stack/Stack';
import { HStack } from '@/ui/layout/Stack/HStack';
import { ProgressList } from '@/ui/sync/ProgressList';
import { UploadZone } from '@/ui/elements/inputs/UploadZone';
import { DownloadIcon } from '@/ui/icons';
import {
  DataTable,
  type Column,
  type SortState,
} from '@/ui/elements/table/DataTable';
import {
  getCellDefinition,
  getTextCell,
} from '@/ui/elements/table/tableHelpers';
import { remToPx } from '@/ui/utils/rem';
import { saveBlob } from '@/platform/openDocument';
import {
  Facilities,
  UpdateFacilityProperties,
} from './facilityRegister.generated';
import {
  buildTemplateVariables,
  type FacilityRow,
} from './facilityRegisterLogic';
import {
  applicableRows,
  batches,
  buildTemplateCsv,
  CSV_ACCEPT,
  isCsvFileName,
  outcomeSucceeded,
  parseImportFile,
  summariseOutcome,
  type ImportOutcome,
  type ImportRow,
  type PropertyDefinition,
  type RowOutcome,
} from './propertyImport';

/*
 * S6 — IMPORT FACILITY PROPERTIES (spec/names § importing facility properties):
 * a spreadsheet of facilities and their property values, applied one facility
 * at a time. It writes the same property values the facility editor writes, for
 * many facilities at once.
 *
 * Three steps — Upload · Review · Import — and the user cannot skip ahead:
 * review is reachable only once a file has parsed, apply only from review
 * (`.34`). The step indicator is a DISPLAY, never a set of controls, so there
 * is no click path to a step at all; the footer's confirm is the only way
 * forward and it is disabled until at least one row has been parsed.
 *
 * Nothing about the import is server-side (contract § importing facility
 * properties): every row is validated here, then written with one
 * `updateNameProperties` per row, ten in flight at a time, with no transaction
 * across them. Partial application is the contract — which is exactly why the
 * outcome banner must say whether the run succeeded (`.42`, DIVERGENCES D97:
 * the current app shows the success string in both cases).
 */

type Step = 'upload' | 'review' | 'import';
type ReviewSortKey = 'code' | 'name';

export interface ImportPropertiesModalProps {
  storeId: string;
  /**
   * The configured property definitions — non-empty (the register gates on
   * it).
   */
  definitions: PropertyDefinition[];
  onClose: () => void;
  /**
   * A run in which EVERY row succeeded: the modal closes and the register
   * reports how many facilities were written (`.43`). Feedback belongs in the
   * surface that initiated the action, never a toast (controls § action
   * feedback) — and the modal is gone by the time it is read.
   */
  onSucceeded: (written: number) => void;
}

export const ImportPropertiesModal: Component<
  ImportPropertiesModalProps
> = props => {
  const [step, setStep] = createSignal<Step>('upload');
  const [rows, setRows] = createSignal<ImportRow[]>([]);
  const [uploadError, setUploadError] = createSignal<string>();
  const [outcome, setOutcome] = createSignal<ImportOutcome>();
  const [applying, setApplying] = createSignal(false);
  const [sort, setSort] = createSignal<SortState<ReviewSortKey>>({
    key: 'code',
    desc: false,
  });

  /*
   * The register's whole row set, in ONE deliberately unpaginated request: the
   * template's rows come from it (`.12`/`.36`), and so does the code → facility
   * matching that gives each uploaded row its id and its existing property
   * document. Fetched at most once per open and cached as a PROMISE rather than
   * a resource — nothing here reads it during render, so it never touches a
   * Suspense boundary and can never remount the open dialog
   * (kdd/solid-reactivity-pitfalls § no remounts on interaction).
   */
  let facilitiesPromise: Promise<FacilityRow[]> | undefined;
  const loadFacilities = (): Promise<FacilityRow[]> =>
    (facilitiesPromise ??= graphqlFetch(
      Facilities,
      buildTemplateVariables(props.storeId),
      { background: true }
    ).then(result =>
      result.kind === 'success' ? result.data.names.nodes : []
    ));

  const downloadTemplate = async () => {
    const facilities = await loadFacilities();
    const csv = buildTemplateCsv(props.definitions, facilities);
    await saveBlob(
      new Blob([csv], { type: 'text/csv;charset=utf-8;' }),
      `${t('label.import-facility-properties')}.csv`
    );
  };

  const onFile = async (file: File) => {
    setUploadError(undefined);
    setOutcome(undefined);
    // Judged by the file's NAME, before anything is parsed (`.35`).
    if (!isCsvFileName(file.name))
      return setUploadError(t('messages.invalid-file'));
    try {
      const [text, facilities] = await Promise.all([
        file.text(),
        loadFacilities(),
      ]);
      const parsed = parseImportFile(text, props.definitions, facilities);
      if (parsed.length === 0) {
        return setUploadError(
          t('messages.upload-error', { error: t('error.no-data') })
        );
      }
      setRows(parsed);
      // Review is reachable only NOW — once a file has parsed (`.34`).
      setStep('review');
    } catch (error) {
      setUploadError(t('messages.upload-error', { error: String(error) }));
    }
  };

  /*
   * Apply. Rows the review flagged are never submitted; the rest go out ten at
   * a time and are written INDEPENDENTLY, so rows that succeed are saved even
   * when others fail (`.40`). Afterwards the table is reduced to exactly the
   * failed rows with the reason each was refused (`.41`) — the server's own
   * "Record does not exist" for a code that matched no facility (`.39`).
   */
  const apply = async () => {
    setApplying(true);
    setStep('import');
    // Read once: the run is a single unit of work, and the active store cannot
    // meaningfully change under it mid-flight.
    const storeId = props.storeId;
    const attempted = rows();
    const submittable = applicableRows(attempted);
    const outcomes = new Map<ImportRow, RowOutcome>();

    for (const batch of batches(submittable)) {
      const settled = await Promise.all(
        batch.map(async row => {
          const result = await graphqlFetch(
            UpdateFacilityProperties,
            { storeId, id: row.id, properties: row.properties },
            { background: true, returnGraphqlErrors: true }
          );
          if (result.kind !== 'success') {
            return [
              row,
              { kind: 'refused', reason: t('error.problem-saving') },
            ] as const;
          }
          const response = result.data.updateNameProperties;
          return [
            row,
            response.__typename === 'NameNode'
              ? ({ kind: 'written' } as const)
              : // Verbatim what the server said — there is no import-specific
                // wording (contract § importing facility properties).
                ({
                  kind: 'refused',
                  reason: response.error.description,
                } as const),
          ] as const;
        })
      );
      settled.forEach(([row, result]) => outcomes.set(row, result));
    }

    const summary = summariseOutcome(attempted, outcomes);
    setApplying(false);
    setOutcome(summary);
    if (outcomeSucceeded(summary)) {
      // A successful run closes the modal, and the register states the count
      // (`.43`; controls § dialog lifecycle).
      props.onSucceeded(summary.written);
      return;
    }
    // A failed run stays open on Review, showing exactly the rows that failed.
    setRows(summary.failed);
    setStep('review');
  };

  const failedAtReview = () => rows().some(row => row.errors.length > 0);

  const steps = () => {
    const current = step();
    return [
      {
        label: t('label.upload'),
        started: true,
        finished: current !== 'upload',
      },
      {
        label: t('label.review'),
        started: current !== 'upload',
        finished: current === 'import',
      },
      {
        label: t('label.import'),
        started: current === 'import',
        finished: current === 'import' && !applying(),
      },
    ];
  };

  // The review table is LOCAL-only: sorted in place, never paginated and never
  // selectable (ui-surface § S6). Sorting is client-side because the rows came
  // from a file, not from a query.
  const sortedRows = createMemo(() => {
    const { key, desc } = sort();
    return [...rows()].sort((a, b) => {
      const compared = a[key].localeCompare(b[key], undefined, {
        sensitivity: 'base',
      });
      return desc ? -compared : compared;
    });
  });

  const columns = (): Column<ImportRow, ReviewSortKey>[] => [
    {
      c: { key: 'code' },
      sortKey: 'code',
      header: () => t('label.code'),
      ...getCellDefinition('code'),
    },
    {
      c: { key: 'name' },
      sortKey: 'name',
      header: () => t('label.name'),
      ...getCellDefinition('name'),
    },
    // One column per configured property, headed by that property's OWN
    // display name — data, not app copy (`.37`).
    ...props.definitions.map(
      (definition): Column<ImportRow, ReviewSortKey> => ({
        c: {
          accessor: row => row.cells[definition.property.key] ?? '',
          id: `property-${definition.property.key}`,
        },
        header: () => definition.property.name,
        ...getTextCell(),
        size: remToPx(10),
      })
    ),
    {
      // Every reason this row failed, together (`.38`).
      c: { accessor: row => row.errors.join(' '), id: 'errorMessage' },
      header: () => t('label.error-message'),
      ...getTextCell(),
      size: remToPx(18),
    },
  ];

  return (
    <Dialog
      open
      onClose={props.onClose}
      title={t('label.import-facility-properties')}
      // The widest content measure: the review table carries one column per
      // property and must be readable without horizontal scrolling wherever it
      // can be (ui-surface § S6 layout).
      width="wide"
      testId="import-facility-properties"
      dismissable={!applying()}
      actions={
        <>
          <CancelButton
            onClick={props.onClose}
            disabled={applying()}
            data-testid="dialog-button-cancel"
          />
          {/* The confirm that applies the file — disabled until at least one
              row has been parsed. */}
          <Button
            variant="primary"
            confirms="plain"
            loading={applying()}
            disabled={rows().length === 0 || applying()}
            onClick={() => void apply()}
            data-testid="dialog-button-ok"
          >
            {t('button.import')}
          </Button>
        </>
      }
    >
      <Stack>
        <ProgressList steps={steps()} />

        <Show when={uploadError()}>
          {message => (
            <Alert severity="error" testId="import-upload-error">
              {message()}
            </Alert>
          )}
        </Show>

        {/* The outcome banner. `.42` / D97: a run in which ANY row failed
            reports a FAILURE — never the success string. */}
        <Show when={outcome()}>
          {result => (
            <Alert severity="error" testId="import-outcome">
              {t('messages.import-facilities-failed', {
                count: result().failed.length,
                total: result().attempted,
              })}
              <Show when={result().written > 0}>
                {' '}
                {tPlural(
                  'messages.import-facilities-updated',
                  result().written
                )}
              </Show>
            </Alert>
          )}
        </Show>

        {/* The review's own banner, when the file itself carried bad rows. */}
        <Show
          when={
            step() === 'review' && outcome() === undefined && failedAtReview()
          }
        >
          <Alert severity="warning" testId="import-review-error">
            {t('messages.import-error-on-upload')}
          </Alert>
        </Show>

        <Show
          when={step() !== 'upload'}
          fallback={
            <Stack gap="sm">
              <UploadZone
                accept={CSV_ACCEPT}
                multiple={false}
                onFiles={files => {
                  const file = files[0];
                  if (file) void onFile(file);
                }}
                onRejected={() => setUploadError(t('messages.invalid-file'))}
              />
              <HStack gap="sm">
                {/* The template link (`.12`, `.13`, `.36`) — a facility row for
                    every facility on the server, with its CURRENT values. */}
                <Button
                  variant="ghost"
                  icon={<DownloadIcon />}
                  data-testid="download-properties-template"
                  onClick={() => void downloadTemplate()}
                >
                  {t('messages.properties-download-example')}
                </Button>
                <Text variant="subtitle">
                  {t('messages.properties-template-download-text')}
                </Text>
              </HStack>
            </Stack>
          }
        >
          <DataTable
            columns={columns()}
            rows={sortedRows()}
            // The file's rows have no server id, and a failed row is identified
            // by its position in the file.
            rowKey={row => `${row.code}-${row.name}`}
            sort={sort()}
            onSort={(key, desc) => setSort({ key, desc })}
            loading={applying()}
            rowTone={row => (row.errors.length > 0 ? 'error' : undefined)}
            emptyMessage={t('error.no-data')}
            minBodyRem={16}
          />
        </Show>
      </Stack>
    </Dialog>
  );
};

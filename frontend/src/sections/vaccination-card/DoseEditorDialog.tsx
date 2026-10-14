import {
  createEffect,
  createMemo,
  createResource,
  createSignal,
  Match,
  on,
  onMount,
  Show,
  Switch,
  untrack,
  type Component,
} from 'solid-js';
import { createStore } from 'solid-js/store';
import { gated } from '@/api/gated';
import { reportPermissionDenied } from '@/api/graphql';
import { t } from '@/intl';
import { localisedDate } from '@/intl/formatDateTime';
import { authUser } from '@/auth/authContext';
import { Dialog } from '@/ui/elements/feedback/Dialog';
import { ConfirmDialog } from '@/ui/elements/feedback/ConfirmDialog';
import { Alert } from '@/ui/elements/feedback/Alert';
import { Spinner } from '@/ui/elements/feedback/Spinner';
import { EmptyState } from '@/ui/elements/feedback/EmptyState';
import { Button } from '@/ui/elements/buttons/Button';
import {
  CancelButton,
  DialogSaveButton,
} from '@/ui/elements/buttons/StandardButtons';
import { RadioGroup } from '@/ui/elements/inputs/RadioGroup';
import { DateField } from '@/ui/elements/inputs/DateField';
import { TextField } from '@/ui/elements/inputs/TextField';
import { TextArea } from '@/ui/elements/inputs/TextArea';
import { ToggleSwitch } from '@/ui/elements/inputs/ToggleSwitch';
import { FieldRow } from '@/ui/elements/inputs/FieldRow';
import { Select } from '@/ui/elements/selectors/Select';
import { Combobox } from '@/ui/elements/selectors/Combobox';
import { DataTable, type Column } from '@/ui/elements/table/DataTable';
import {
  getExpiryDateCell,
  getNumberCell,
} from '@/ui/elements/table/tableHelpers';
import { RecordLink } from '@/ui/elements/typography/RecordLink';
import { Stack } from '@/ui/layout/Stack/Stack';
import { localTodayIso } from '@/ui/elements/inputs/dateTimeConvert';
import { ClinicianSelect, cliniciansResource } from '@/domain/clinician';
import {
  confirmsSkip,
  doseEditorDescription,
  isEditable,
  NOT_GIVEN_REASONS,
  wouldSkip,
  type CardRow,
} from './cardModel';
import {
  batchChoosable,
  batchDoses,
  batchRows,
  chooseGiven,
  confirmations,
  draftDiffers,
  givenAtOtherStore,
  initialDraft,
  isOtherFacility,
  missingFields,
  OTHER_FACILITY,
  presetBatch,
  showsBatch,
  switchLabel,
  type Confirmation,
  type DoseDraft,
  type DraftContext,
} from './doseDraft';
import { fetchBatches, fetchDose, saveDose } from './cardApi';

export interface DoseEditorDialogProps {
  storeId: string;
  encounterId: string;
  encounterClinicianId: string | null;
  /** The dose opened, and the card it is on (for order and editability). */
  row: CardRow;
  rows: CardRow[];
  onClose: () => void;
  /** A save landed: the caller closes the editor and refreshes the card. */
  onSaved: () => void;
  /**
   * The server refused a save: the card may be out of date (another user
   * recorded the dose meanwhile), so the caller refreshes it once the editor
   * closes.
   */
  onRefused?: () => void;
}

/*
 * S3 — the dose editor (spec/vaccination-card ui-surface § S3), with the save
 * confirmations (§ S4). Opened from the card inside an immunisation encounter.
 * One dialog from open to close: its body is a spinner while the dose and its
 * vaccination load — an interaction under the encounter screen's boundary, so
 * every read here is gated — then the form, mounted once with the loaded
 * record, or a not-found state when the read settles with nothing.
 */
export const DoseEditorDialog: Component<DoseEditorDialogProps> = props => {
  const [loaded] = createResource(
    () => ({
      storeId: props.storeId,
      doseId: props.row.vaccineCourseDoseId,
      vaccinationId: props.row.vaccinationId,
    }),
    fetchDose
  );
  const data = () => gated(loaded);
  const store = () =>
    authUser()?.stores.nodes.find(s => s.id === props.storeId);

  // The form's handle once it has mounted: the dialog's footer and its
  // dismissal read it, so the chrome stays one dialog across the load.
  const [form, setForm] = createSignal<DoseEditorHandle>();
  const saving = () => form()?.saving() ?? false;

  const title = () =>
    data()
      ? t('heading.course-dose', {
          course: data()?.dose.vaccineCourse.name ?? '',
          dose: props.row.label,
        })
      : props.row.label || t('label.vaccination');

  return (
    <Dialog
      open
      onClose={props.onClose}
      title={title()}
      description={form()?.description()}
      width="form"
      closeButton
      // A save in flight holds the editor open: closing it there would leave
      // the dose recorded, stock included, behind a closed editor.
      dismissable={!saving()}
      testId="dose-editor"
      actions={
        <>
          <Show when={!saving()}>
            <CancelButton
              data-testid="dialog-button-cancel"
              onClick={props.onClose}
            />
          </Show>
          <Show when={form()?.offersSave() && form()}>
            {handle => (
              <Show
                when={handle().recorded}
                fallback={
                  <Button
                    variant="primary"
                    confirms="plain"
                    loading={saving()}
                    disabled={saving()}
                    data-testid="dialog-button-record"
                    onClick={() => handle().save()}
                  >
                    {t('button.record-dose')}
                  </Button>
                }
              >
                <DialogSaveButton
                  data-testid="dialog-button-save"
                  loading={saving()}
                  disabled={saving()}
                  onClick={() => handle().save()}
                />
              </Show>
            )}
          </Show>
        </>
      }
    >
      <Switch>
        <Match when={data()}>
          {loadedData => (
            <DoseEditorForm
              {...props}
              dose={loadedData().dose}
              ctx={{
                vaccination: loadedData().vaccination,
                storeId: props.storeId,
                storeNameId: store()?.nameId ?? '',
                encounterClinicianId: props.encounterClinicianId,
                courseItemIds: (
                  loadedData().dose.vaccineCourse.vaccineCourseItems ?? []
                ).map(i => i.itemId),
                today: localTodayIso(),
              }}
              storeName={store()?.name ?? ''}
              onReady={setForm}
            />
          )}
        </Match>
        <Match when={loaded.loading}>
          <Spinner center />
        </Match>
        {/* The read settled with no dose: say so rather than spin forever. */}
        <Match when={true}>
          <EmptyState message={t('messages.record-not-found')} />
        </Match>
      </Switch>
    </Dialog>
  );
};

/** What the dialog's chrome reads from the form once it has mounted. */
interface DoseEditorHandle {
  description: () => string;
  saving: () => boolean;
  offersSave: () => boolean;
  /** The dose has a record: the footer's action is Save, not Record dose. */
  recorded: boolean;
  /** Save pressed: check the fields, ask the questions, then save. */
  save: () => void;
}

type LoadedDose = NonNullable<Awaited<ReturnType<typeof fetchDose>>>['dose'];

const DoseEditorForm: Component<
  DoseEditorDialogProps & {
    dose: LoadedDose;
    ctx: DraftContext;
    storeName: string;
    onReady: (handle: DoseEditorHandle) => void;
  }
> = props => {
  // Fixed for this open: the record the editor opened with.
  const ctx = untrack(() => props.ctx);
  const initial = initialDraft(ctx);
  const [draft, setDraft] = createStore<DoseDraft>({ ...initial });
  const draftContext = () => ctx;

  // An earlier recorded dose opens read-only; a dose given at another store
  // opens with only its comment open (rules § which doses open).
  const rowEditable = () => isEditable(props.rows, props.row);
  const locked = () => !rowEditable() || givenAtOtherStore(ctx);
  const skipping = () => wouldSkip(props.rows, props.row);
  const other = () => isOtherFacility(draft, draftContext());

  // Field checks show once Save has been pressed (form submits validate on
  // click), and then live.
  const [checked, setChecked] = createSignal(false);
  const missing = () => (checked() ? missingFields(draft) : []);
  const fieldError = (field: ReturnType<typeof missingFields>[number]) =>
    missing().includes(field) ? t('error.field-required') : undefined;

  const [saving, setSaving] = createSignal(false);
  const [refusal, setRefusal] = createSignal<string>();
  const [asking, setAsking] = createSignal<Confirmation[]>([]);

  // Batches of the chosen item, while the batch picker shows — fetched on an
  // interaction (choosing given, an item, a date), so read gated.
  // Keyed by the item alone, so a change to any other field the picker's
  // visibility reads (the date, the switch) refetches nothing.
  const batchItem = createMemo(() =>
    showsBatch(draft, draftContext()) ? draft.itemId : null
  );
  const [batchData] = createResource(() => {
    const itemId = batchItem();
    return itemId ? { storeId: props.storeId, itemId } : false;
  }, fetchBatches);
  // Only the chosen item's batches: while another item's load, the gated read
  // still holds the previous item's, which must neither show nor be preset.
  const batches = () => {
    const loaded = gated(batchData);
    return loaded && loaded.itemId === draft.itemId ? loaded : undefined;
  };

  // A newly given dose gets the only batch holding a dose (OMS-REG-DIS-06.46),
  // once per item — clearing it again is the user's choice to keep.
  const newlyGiven = !ctx.vaccination || !ctx.vaccination.given;
  let presetFor: string | null = null;
  createEffect(
    on(batches, loadedBatches => {
      if (!newlyGiven || !loadedBatches || draft.itemId === null) return;
      if (presetFor === draft.itemId || draft.stockLineId !== null) return;
      presetFor = draft.itemId;
      const id = presetBatch(loadedBatches.dosesPerUnit, loadedBatches.batches);
      if (id) setDraft('stockLineId', id);
    })
  );

  const itemOptions = () => {
    const items = (props.dose.vaccineCourse.vaccineCourseItems ?? []).map(
      i => ({ value: i.itemId, label: i.name })
    );
    const held = ctx.vaccination?.item;
    return held && !items.some(i => i.value === held.id)
      ? [...items, { value: held.id, label: held.name }]
      : items;
  };

  const facilityOptions = () => {
    const options = [{ value: ctx.storeNameId, label: props.storeName }];
    const enteredAt = ctx.vaccination?.facilityNameId;
    if (enteredAt && enteredAt !== ctx.storeNameId)
      options.push({
        value: enteredAt,
        label: ctx.vaccination?.facilityName ?? '',
      });
    options.push({ value: OTHER_FACILITY, label: t('heading.other') });
    return options;
  };

  const hasClinicians = () => cliniciansResource.noSuspense().length > 0;

  const label = () => switchLabel(draft, draftContext());
  const offersSave = () =>
    rowEditable() && (!ctx.vaccination || draftDiffers(draft, initial));

  const save = async () => {
    setRefusal(undefined);
    setSaving(true);
    const outcome = await saveDose({
      draft: { ...draft },
      ctx,
      encounterId: props.encounterId,
      vaccineCourseDoseId: props.row.vaccineCourseDoseId,
    });
    setSaving(false);
    if (outcome.kind === 'saved') props.onSaved();
    else if (outcome.kind === 'notMostRecentGivenDose')
      setRefusal(t('error.not-most-recent-given-dose'));
    else if (outcome.kind === 'refused') setRefusal(t('error.something-wrong'));
    // The app's permission-denied notice; the editor keeps the draft.
    else if (outcome.kind === 'forbidden')
      reportPermissionDenied(outcome.permissions);
    if (outcome.kind !== 'saved' && outcome.kind !== 'failed')
      props.onRefused?.();
  };

  const onSavePressed = () => {
    setChecked(true);
    if (missingFields(draft).length > 0) return;
    const asks = confirmations(draft, draftContext(), {
      confirmsSkip: confirmsSkip(props.rows, props.row),
      suggestedDate: props.row.suggestedDate,
    });
    if (asks.length === 0) void save();
    else setAsking(asks);
  };

  // The confirmation dialog's OK calls onConfirm and then onClose. The close
  // that follows a confirm must not drop the questions still to ask
  // (VC-20261013-F1): only a Cancel or Escape empties the queue.
  let confirmed = false;
  const confirmOne = () => {
    confirmed = true;
    const [, ...rest] = asking();
    setAsking(rest);
    if (rest.length === 0) void save();
  };
  const cancelAsking = () => {
    if (confirmed) {
      confirmed = false;
      return;
    }
    setAsking([]);
  };

  const confirmMessage = (ask: Confirmation): string => {
    if (ask === 'skip') return t('messages.confirm-skip-dose');
    if (ask === 'early')
      return t('messages.confirm-early-vaccination', {
        date: localisedDate(props.row.suggestedDate ?? ''),
      });
    return t('messages.no-batch-selected');
  };

  const choose = (value: string) =>
    setDraft(chooseGiven(draft, ctx, value === 'given'));

  const description = createMemo(() => doseEditorDescription(props.row));

  onMount(() =>
    props.onReady({
      description,
      saving,
      offersSave,
      recorded: !!ctx.vaccination,
      save: onSavePressed,
    })
  );

  return (
    <>
      <Stack gap="md">
        <Show
          when={ctx.vaccination?.given}
          fallback={
            <Alert severity="warning">
              {t('warning.check-before-vaccinating')}
            </Alert>
          }
        >
          <Alert severity="success">
            {t('messages.vaccination-was-given', {
              date: localisedDate(ctx.vaccination?.vaccinationDate ?? ''),
            })}{' '}
            <Show
              when={
                ctx.vaccination?.invoice &&
                ctx.vaccination.givenStoreId === props.storeId &&
                ctx.vaccination.invoice
              }
            >
              {invoice => (
                <RecordLink
                  href={`/${props.storeId}/dispensary/dispensing/${invoice().id}`}
                  testId="dose-editor-prescription-link"
                >
                  {t('button.view-prescription')}
                </RecordLink>
              )}
            </Show>
          </Alert>
        </Show>

        <Show when={refusal()}>
          {message => (
            <Alert severity="error" testId="dose-editor-refusal">
              {message()}
            </Alert>
          )}
        </Show>

        <Stack gap="sm">
          <RadioGroup
            label={t('label.vaccination')}
            orientation="horizontal"
            options={[
              {
                value: 'given',
                label: t('label.vaccine-given'),
                testId: 'dose-editor-given',
              },
              ...(skipping()
                ? []
                : [
                    {
                      value: 'notGiven',
                      label: t('label.vaccine-not-given'),
                      testId: 'dose-editor-not-given',
                    },
                  ]),
            ]}
            value={
              draft.given === undefined
                ? undefined
                : draft.given
                  ? 'given'
                  : 'notGiven'
            }
            onChange={choose}
            disabled={locked()}
            error={fieldError('given')}
            errorTestId="dose-editor-given-error"
          />
          <Show when={skipping() && draft.given === true}>
            <Alert severity="warning" compact>
              {t('messages.skip-dose-warning')}
            </Alert>
          </Show>
        </Stack>

        <DateField
          label={t('label.date')}
          value={draft.date}
          onChange={value => setDraft('date', value ?? ctx.today)}
          max={ctx.today}
          helperText={t('messages.dose-date-not-future')}
          disabled={locked()}
          testId="dose-editor-date"
        />

        <FieldRow label={t('label.facility')} align="first-line">
          <Stack gap="sm">
            <Combobox
              label={t('label.facility')}
              hideLabel
              items={facilityOptions()}
              itemToString={o => o.label}
              itemToValue={o => o.value}
              value={draft.facility}
              onChange={o => o && setDraft('facility', o.value)}
              clearable={false}
              disabled={locked()}
              inputTestId="dose-editor-facility"
            />
            <Show when={draft.facility === OTHER_FACILITY}>
              <TextField
                label={t('label.facility')}
                hideLabel
                placeholder={t('placeholder.enter-facility-name')}
                value={draft.facilityFreeText}
                onInput={e =>
                  setDraft('facilityFreeText', e.currentTarget.value)
                }
                error={fieldError('facilityFreeText')}
                disabled={locked()}
                data-testid="dose-editor-facility-name"
              />
            </Show>
          </Stack>
        </FieldRow>

        <Show when={!other() && hasClinicians()}>
          <FieldRow label={t('label.clinician')}>
            <ClinicianSelect
              label={t('label.clinician')}
              hideLabel
              value={draft.clinicianId ?? undefined}
              onChange={c => setDraft('clinicianId', c?.id ?? null)}
              disabled={locked()}
              inputTestId="dose-editor-clinician"
            />
          </FieldRow>
        </Show>

        <Show when={draft.given === true}>
          <Show
            when={itemOptions().length > 0}
            fallback={
              <Alert severity="info" compact>
                {t('messages.no-vaccine-items-configured')}
              </Alert>
            }
          >
            <FieldRow label={t('label.vaccine-item')}>
              <Select
                label={t('label.vaccine-item')}
                hideLabel
                options={itemOptions()}
                value={draft.itemId ?? undefined}
                onValueChange={value =>
                  setDraft({ itemId: value, stockLineId: null })
                }
                clearable
                onClear={() => setDraft({ itemId: null, stockLineId: null })}
                disabled={locked()}
                testId="dose-editor-item"
              />
            </FieldRow>
          </Show>
        </Show>

        <Show when={!locked() && showsBatch(draft, draftContext())}>
          <Show
            when={batches()}
            fallback={
              // Spinner while the item's batches load; a read that settles
              // with nothing is an error, not an empty store.
              <Show when={batchData.loading} fallback={<BatchReadFailed />}>
                <Spinner />
              </Show>
            }
          >
            {loadedBatches => {
              // The listed batches, with the record's own batch kept on the
              // list when it has run out (OMS-REG-DIS-06.55) — so "no stock"
              // means nothing to show, recorded batch included.
              const rows = () =>
                batchRows(
                  loadedBatches().batches,
                  draft,
                  ctx.vaccination?.stockLine
                );
              return (
                <Show
                  when={rows().length > 0}
                  fallback={
                    <Alert severity="info" compact>
                      {t('messages.no-stock-available')}
                    </Alert>
                  }
                >
                  <BatchTable
                    rows={rows()}
                    dosesPerUnit={loadedBatches().dosesPerUnit}
                    chosen={draft.stockLineId}
                    onChoose={id => setDraft('stockLineId', id)}
                  />
                </Show>
              );
            }}
          </Show>
        </Show>

        <Show when={!locked() && label()}>
          {key => (
            <ToggleSwitch
              label={t(key())}
              checked={draft.createTransactions}
              onChange={value => setDraft('createTransactions', value)}
              testId="dose-editor-stock-switch"
            />
          )}
        </Show>

        <Show when={draft.given === false}>
          <FieldRow label={t('label.reason')} required>
            <Select
              label={t('label.reason')}
              hideLabel
              required
              options={NOT_GIVEN_REASONS.map(r => ({
                value: r.value,
                label: t(r.key),
              }))}
              value={draft.notGivenReason ?? undefined}
              onValueChange={value => setDraft('notGivenReason', value)}
              error={fieldError('notGivenReason')}
              disabled={locked()}
              testId="dose-editor-reason"
            />
          </FieldRow>
        </Show>

        <Show when={draft.given !== undefined}>
          <TextArea
            label={t('label.comment')}
            rows={3}
            value={draft.comment}
            onInput={e => setDraft('comment', e.currentTarget.value)}
            disabled={!rowEditable()}
            data-testid="dose-editor-comment"
          />
        </Show>
      </Stack>

      <ConfirmDialog
        open={asking().length > 0}
        title={t('heading.are-you-sure')}
        message={confirmMessage(asking()[0] ?? 'skip')}
        onConfirm={confirmOne}
        onClose={cancelAsking}
      />
    </>
  );
};

type Batch = NonNullable<
  Awaited<ReturnType<typeof fetchBatches>>
>['batches'][number];

/** The item's batches read failed: the list cannot say what stock there is. */
const BatchReadFailed: Component = () => (
  <Alert severity="error" compact>
    {t('error.something-wrong')}
  </Alert>
);

/*
 * The batch list: a batch is chosen by selecting its row, and selecting the
 * chosen row again clears it. A batch under one dose cannot be chosen, unless
 * it is the chosen one — a recorded batch that has run down stays chosen and
 * can still be cleared (rules § zero doses; ui-surface § S3).
 */
const BatchTable: Component<{
  rows: Batch[];
  dosesPerUnit: number;
  chosen: string | null;
  onChoose: (id: string | null) => void;
}> = props => {
  const choosable = (batch: Batch) => batchChoosable(props.dosesPerUnit, batch);
  const selectable = (batch: Batch) =>
    batch.id === props.chosen || choosable(batch);

  const columns: Column<Batch, never>[] = [
    { c: { key: 'batch' }, header: () => t('label.batch') },
    {
      c: { key: 'expiryDate' },
      header: () => t('label.expiry-date'),
      ...getExpiryDateCell(),
    },
    {
      // Whole doses; "<1" below one.
      c: {
        accessor: batch =>
          choosable(batch)
            ? Math.floor(batchDoses(props.dosesPerUnit, batch))
            : '<1',
        id: 'doses',
      },
      header: () => t('label.doses'),
      ...getNumberCell(),
    },
  ];

  return (
    <div data-testid="dose-editor-batches">
      <DataTable
        columns={columns}
        rows={props.rows}
        rowKey={batch => batch.id}
        selectedIds={props.chosen ? [props.chosen] : []}
        onRowClick={batch =>
          props.onChoose(batch.id === props.chosen ? null : batch.id)
        }
        rowClickable={selectable}
        rowState={batch => (selectable(batch) ? undefined : 'disabled')}
        showFullScreen={false}
      />
    </div>
  );
};

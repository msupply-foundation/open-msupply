import {
  createEffect,
  createMemo,
  createResource,
  createSignal,
  createUniqueId,
  For,
  on,
  Show,
  untrack,
} from 'solid-js';
import type { Component } from 'solid-js';
import { createStore, unwrap } from 'solid-js/store';
import { graphqlFetch, reportPermissionDenied } from '@/api/graphql';
import { gated } from '@/api/gated';
import { t, type LocaleKey } from '@/intl';
import { generateUUID } from '@/uuid';
import { Dialog } from '@/ui/elements/feedback/Dialog';
import { Alert } from '@/ui/elements/feedback/Alert';
import { ErrorDetails } from '@/ui/elements/feedback/ErrorDetails';
import { Spinner } from '@/ui/elements/feedback/Spinner';
import { Stack } from '@/ui/layout/Stack/Stack';
import { HStack } from '@/ui/layout/Stack/HStack';
import { FormRow } from '@/ui/layout/Form/FormRow';
import { FieldRow } from '@/ui/elements/inputs/FieldRow';
import { TextField } from '@/ui/elements/inputs/TextField';
import { FieldShell } from '@/ui/elements/inputs/FieldShell';
import { NumberField } from '@/ui/elements/inputs/NumberField';
import { Checkbox } from '@/ui/elements/inputs/Checkbox';
import { Combobox } from '@/ui/elements/selectors/Combobox';
import { MultiSelect } from '@/ui/elements/selectors/MultiSelect';
import { Button } from '@/ui/elements/buttons/Button';
import { IconButton } from '@/ui/elements/buttons/IconButton';
import {
  CancelButton,
  DialogSaveButton,
} from '@/ui/elements/buttons/StandardButtons';
import { DataTable, type Column } from '@/ui/elements/table/DataTable';
import { remToPx } from '@/ui/utils/rem';
import { HomeIcon, PlusCircleIcon, TrashIcon } from '@/ui/icons';
import {
  DemographicGroups,
  InsertVaccineCourse,
  UpdateVaccineCourse,
  VaccineCourseForEdit,
  VaccineItems,
  type DemographicGroupsResult,
  type VaccineItemsResult,
} from './immunisationPrograms.generated';
import {
  ageEntryFromTotal,
  ageEntryTotal,
  doseProblem,
  draftFromCourse,
  fieldProblem,
  insertInput,
  insertOutcome,
  isDirty,
  newCourseDraft,
  nextDose,
  updateInput,
  updateOutcome,
  validateDraft,
  visibleProblems,
  type AgeEntry,
  type CourseDraft,
  type DoseNode,
  type ItemNode,
  type ValidationField,
  type ValidationItem,
} from './courseEditor';
import { StoreRatesPanel } from './StoreRatesPanel';

// S3 — the course editor (spec/immunisation-programs ui-surface S3; rules §
// the editor). ONE dialog for create and edit: the same whole-course write,
// differing only in whether a course is being written over. The draft — every
// field, item, dose and store override — is local until Save; a save writes
// the whole course at once, all or nothing.
//
// Lifecycle is the shared dialog contract (ui-standards controls § dialogs):
// stays open while the save is in flight with Save busy; closes on success —
// closure plus the list refreshing IS the confirmation, never a toast; stays
// open on a refusal with the draft intact and the reason in a banner above the
// actions. Cancel, Escape and a click on the scrim all close it, discarding
// the draft — the shared dialog contract, and refinement 4 (the reference
// ignored an outside click). `dismissable` governs the scrim and Escape
// together, which is why a save in flight blocks both — see below.

type Group = DemographicGroupsResult['demographics']['nodes'][number];
type VaccineItem = VaccineItemsResult['items']['nodes'][number];

export interface CourseEditModalProps {
  /** The logged-in store — the writes' auth plumbing, and what scopes the
   * vaccine-item pick (rules § vaccine items). */
  storeId: string;
  /** The program a new course is created in (fixed for life). */
  programId: string;
  /** The course being edited; omit to create a new one. */
  courseId?: string;
  /** The screen's permission gate — Save refuses up front through it. */
  guardEdit: () => boolean;
  /** Cancel / dismiss — nothing is saved. */
  onClose: () => void;
  /** The save succeeded: the owner closes the dialog and refreshes. */
  onSaved: () => void;
}

export const CourseEditModal: Component<CourseEditModalProps> = props => {
  // Read once on mount (the owner mounts this only while open) so a rejected
  // save keeps exactly what the user entered.
  // eslint-disable-next-line solid/reactivity
  const courseId = props.courseId;
  const isEdit = courseId !== undefined;

  // The draft: a store updated field-by-field, so a keystroke re-renders one
  // cell of the dose table, never the table (kdd/solid-reactivity-pitfalls §
  // editable collections). A create is born blank with a client-minted id.
  const [draft, setDraft] = createStore<CourseDraft>(
    // eslint-disable-next-line solid/reactivity
    newCourseDraft(generateUUID(), props.programId)
  );
  // What the editor opened on, for the dirty test (rules § the editor). A DEEP
  // copy, never the store's own objects: a store write to a dose mutates the
  // underlying dose object in place, so a shared reference would make the
  // original move with the draft and the dirty test never fire.
  const [original, setOriginal] = createSignal<CourseDraft | undefined>(
    isEdit ? undefined : structuredClone(unwrap(draft))
  );

  // An edit loads the course whole (OMS-REG-IMM-01.16). Read NON-SUSPENDING:
  // this dialog sits on an open screen, and the read through the
  // authenticated list operation answers no node for a deleted course.
  const [course] = createResource(
    () => courseId,
    async id => {
      const result = await graphqlFetch(VaccineCourseForEdit, { id });
      if (result.kind !== 'success') return undefined;
      return result.data.vaccineCourses.nodes[0] ?? null;
    }
  );
  const loaded = createMemo(() => (isEdit ? gated(course) : null));
  createEffect(
    on(loaded, node => {
      if (!node) return;
      const seeded = draftFromCourse(node);
      // Two independent copies — one becomes the store's objects, the other
      // the untouched original (see above).
      setDraft(structuredClone(seeded));
      setOriginal(structuredClone(seeded));
    })
  );
  const loading = () => isEdit && loaded() === undefined && course.loading;
  const notFound = () => isEdit && loaded() === null;

  // The pickers' option sets — every demographic group, and the vaccine items
  // visible to the logged-in store (rules § the course, § vaccine items).
  const [groups] = createResource(
    () => props.storeId,
    async storeId => {
      const result = await graphqlFetch(DemographicGroups, { storeId });
      return result.kind === 'success' ? result.data.demographics.nodes : [];
    }
  );
  const [vaccineItems] = createResource(
    () => props.storeId,
    async storeId => {
      const result = await graphqlFetch(VaccineItems, { storeId });
      return result.kind === 'success' ? result.data.items.nodes : [];
    }
  );
  const groupOptions = (): Group[] => gated(groups) ?? [];
  // A course's stored item the store cannot see still shows as a tag: it is
  // offered alongside the visible items so the selection can resolve it.
  const itemOptions = createMemo((): VaccineItem[] => {
    const visible = gated(vaccineItems) ?? [];
    const known = new Set(visible.map(item => item.id));
    const extras = draft.vaccineCourseItems
      .filter(item => !known.has(item.itemId))
      .map(item => ({ id: item.itemId, name: item.name }));
    return [...visible, ...extras];
  });
  const selectedItems = createMemo((): VaccineItem[] =>
    draft.vaccineCourseItems.map(item => ({ id: item.itemId, name: item.name }))
  );

  // Picking items: a stored membership keeps its id (left alone on the wire),
  // a newly picked item gets a fresh membership (inserted), an unpicked one
  // leaves the list (retired) — rules § vaccine items.
  const setItems = (picked: VaccineItem[]) => {
    const existing = new Map(
      draft.vaccineCourseItems.map(item => [item.itemId, item] as const)
    );
    setDraft(
      'vaccineCourseItems',
      picked.map(
        (item): ItemNode =>
          existing.get(item.id) ?? {
            id: generateUUID(),
            itemId: item.id,
            name: item.name,
          }
      )
    );
  };

  const setGroup = (group: Group | null) => {
    setDraft('demographicId', group?.id ?? null);
    setDraft('demographic', group ? { id: group.id, name: group.name } : null);
  };

  // ─── Doses (rules § doses) ────────────────────────────────────────────
  const addDose = () =>
    setDraft('vaccineCourseDoses', doses => [
      ...doses,
      nextDose(unwrap(draft), generateUUID()),
    ]);
  const removeDose = (id: string) =>
    setDraft('vaccineCourseDoses', doses => doses.filter(d => d.id !== id));
  const updateDose = (id: string, patch: Partial<DoseNode>) =>
    setDraft('vaccineCourseDoses', dose => dose.id === id, patch);

  // ─── Save (rules § the editor) ────────────────────────────────────────
  const [saving, setSaving] = createSignal(false);
  // The completeness checks run from the start; which failures the editor
  // SHOWS follows the house timing (ui-standards › form submits validate on
  // click; courseEditor.ts § visibleProblems): the rules about what was typed
  // report the moment they trip, the required checks only once a Save press
  // has armed the form, and everything stays live after that so the summary
  // and the field states track the corrections (ui-surface S3 § validation
  // summary).
  const [armed, setArmed] = createSignal(false);
  const validation = createMemo(() => validateDraft(draft));
  const problems = createMemo((): ValidationItem[] => {
    const v = validation();
    return v.ok ? [] : visibleProblems(v.items, armed());
  });
  const fieldError = (field: ValidationField): string | undefined => {
    const key = fieldProblem(problems(), field);
    return key === undefined ? undefined : t(key);
  };
  const doseError = (doseId: string, key: LocaleKey): string | undefined =>
    doseProblem(problems(), doseId, key) ? t(key) : undefined;
  // The server's refusal, until the next Save.
  const [serverError, setServerError] = createSignal<
    { message: string; detail?: string } | undefined
  >(undefined);

  const dirty = createMemo(() => {
    const base = original();
    return base !== undefined && isDirty(draft, base);
  });
  // On create Save is always offered — pressing it is how the checks report
  // (OMS-REG-IMM-01.34); on edit only once the draft differs
  // (OMS-REG-IMM-01.42).
  const canSave = () => !isEdit || dirty();

  const save = async () => {
    if (saving()) return; // re-entry guard
    // Refused up front for a user without the central-data permission (rules
    // § access; OMS-REG-IMM-01.71) — before the checks, so nothing is reported
    // for a save that could never be sent.
    if (!props.guardEdit()) return;
    setArmed(true);
    const v = validateDraft(unwrap(draft));
    if (!v.ok) return;
    setSaving(true);
    setServerError(undefined);
    // returnGraphqlErrors: the off-central refusal and the untyped rejections
    // are top-level errors, and a Forbidden must route to the
    // permission-denied modal, not the global unexpected-error one.
    const outcome = isEdit
      ? updateOutcome(
          await graphqlFetch(
            UpdateVaccineCourse,
            { storeId: props.storeId, input: updateInput(v.draft) },
            { returnGraphqlErrors: true }
          )
        )
      : insertOutcome(
          await graphqlFetch(
            InsertVaccineCourse,
            { storeId: props.storeId, input: insertInput(v.draft) },
            { returnGraphqlErrors: true }
          )
        );
    setSaving(false);
    switch (outcome.kind) {
      case 'saved':
        props.onSaved();
        return;
      case 'duplicate-name':
        setServerError({ message: t('error.name-program-duplicate') });
        return;
      case 'doses-in-use':
        setServerError({ message: t('error.vaccine-dose-in-use') });
        return;
      case 'rejected':
        // The generic message with the server's own text disclosed (S5).
        setServerError({
          message: isEdit
            ? t('error.failed-to-save-vaccine-course')
            : t('error.unable-to-insert-vaccine-course'),
          detail: outcome.serverError,
        });
        return;
      case 'forbidden':
        reportPermissionDenied(outcome.permissions);
        return;
      case 'failed':
        // Already surfaced by the global modal; the busy state is released
        // above and the draft stays put.
        return;
    }
  };

  // ─── Per-store rates panel (S3a) ──────────────────────────────────────
  const [panelOpen, setPanelOpen] = createSignal(false);

  // ─── The dose table (S3 § dose table) ────────────────────────────────
  // Every column is structural (meta.hideFromColumnSettings): a save writes
  // every dose field, so none may be hidden. Cells read their row through
  // `row.original` — a store proxy — inside the cell render, so a field edit
  // re-renders that cell alone.
  const ageCell = (
    dose: DoseNode,
    field: 'minAgeMonths' | 'maxAgeMonths',
    label: string
  ) => {
    // The pair holds what was TYPED into each half and stores their sum; it
    // is re-derived only when the stored figure changes from OUTSIDE it (the
    // course reloaded). Deriving on every keystroke fed a half-typed year
    // back into the months field and those months back into the year
    // (IMM-20260917-F2; courseEditor.ts § AgeEntry). Whole years and months
    // capped at 11 make the sum and the split exact inverses, so a typed pair
    // needs no settling on the way out.
    //
    // The store is read UNTRACKED here: this function body runs inside the
    // table cell's render effect, so a tracked read would re-run the whole
    // template — remounting both inputs and dropping focus — on every store
    // write the pair itself makes (kdd/solid-reactivity-pitfalls). The
    // effect below owns the only tracked read.
    const [entry, setEntry] = createSignal<AgeEntry>(
      untrack(() => ageEntryFromTotal(dose[field]))
    );
    createEffect(
      on(
        () => dose[field],
        total => {
          // Our own write echoes back as the same float; anything else is an
          // external change worth re-deriving from.
          if (Math.abs(total - ageEntryTotal(entry())) > 1e-9)
            setEntry(ageEntryFromTotal(total));
        },
        { defer: true }
      )
    );
    const type = (patch: Partial<AgeEntry>) => {
      const next = { ...entry(), ...patch };
      setEntry(next);
      updateDose(dose.id, { [field]: ageEntryTotal(next) });
    };
    // The pair is ONE field with one message (ui-surface S3 — each failing
    // field shows its own error state): the FieldShell carries the dose-order
    // message once beneath the two halves, the halves take the error state
    // alone (TextField `invalid`). Both read the live check here rather than
    // the shell's render-once arguments.
    const id = createUniqueId();
    const messageKey: LocaleKey =
      field === 'minAgeMonths'
        ? 'error.dose-min-out-of-order'
        : 'error.dose-max-less-than-min';
    const error = () => doseError(dose.id, messageKey);
    const describedBy = () => (error() ? `${id}-message` : undefined);
    return (
      <FieldShell label={label} hideLabel error={error()} controlId={id}>
        {() => (
          <HStack gap="sm">
            <NumberField
              id={id}
              label={`${label} ${t('label.years-abbreviation')}`}
              hideLabel
              size="small"
              width="compact"
              endAdornment={t('label.years-abbreviation')}
              min={0}
              // Whole years only (rules § input bounds): a fraction of a year
              // is months the other half already holds.
              decimalLimit={0}
              disabled={saving()}
              invalid={Boolean(error())}
              aria-describedby={describedBy()}
              value={entry().years}
              onChange={years => type({ years: years ?? 0 })}
            />
            <NumberField
              label={`${label} ${t('label.months-abbreviation')}`}
              hideLabel
              size="small"
              width="compact"
              endAdornment={t('label.months-abbreviation')}
              min={0}
              max={11}
              decimalLimit={2}
              disabled={saving()}
              invalid={Boolean(error())}
              aria-describedby={describedBy()}
              value={entry().months}
              onChange={months => type({ months: months ?? 0 })}
            />
          </HStack>
        )}
      </FieldShell>
    );
  };

  const doseColumns = (): Column<DoseNode, never>[] => [
    {
      c: { id: 'doseNumber' },
      header: () => t('label.dose-number'),
      meta: { align: 'right', hideFromColumnSettings: true },
      size: remToPx(5),
      // The row's position in schedule order (rules § doses).
      cell: info => info.row.index + 1,
    },
    {
      c: { key: 'label' },
      header: () => t('label.label'),
      meta: { hideFromColumnSettings: true },
      size: remToPx(12),
      cell: info => {
        const dose = info.row.original;
        return (
          <TextField
            label={t('label.label')}
            hideLabel
            required
            size="small"
            disabled={saving()}
            error={doseError(dose.id, 'messages.required-field')}
            value={dose.label}
            onInput={event =>
              updateDose(dose.id, { label: event.currentTarget.value })
            }
          />
        );
      },
    },
    {
      c: { key: 'minAgeMonths' },
      header: () => t('label.from-age'),
      meta: { hideFromColumnSettings: true },
      size: remToPx(11),
      cell: info =>
        ageCell(info.row.original, 'minAgeMonths', t('label.from-age')),
    },
    {
      c: { key: 'maxAgeMonths' },
      header: () => t('label.to-age'),
      meta: { hideFromColumnSettings: true },
      size: remToPx(11),
      cell: info =>
        ageCell(info.row.original, 'maxAgeMonths', t('label.to-age')),
    },
    {
      c: { key: 'customAgeLabel' },
      header: () => t('label.custom-age-label'),
      meta: { hideFromColumnSettings: true },
      size: remToPx(10),
      cell: info => {
        const dose = info.row.original;
        return (
          <TextField
            label={t('label.custom-age-label')}
            hideLabel
            size="small"
            disabled={saving()}
            value={dose.customAgeLabel ?? ''}
            onInput={event =>
              updateDose(dose.id, { customAgeLabel: event.currentTarget.value })
            }
          />
        );
      },
    },
    {
      c: { key: 'minIntervalDays' },
      header: () => t('label.min-interval'),
      meta: { align: 'right', hideFromColumnSettings: true },
      size: remToPx(7),
      cell: info => {
        const dose = info.row.original;
        return (
          <NumberField
            label={t('label.min-interval')}
            hideLabel
            size="small"
            width="compact"
            min={0}
            decimalLimit={0}
            disabled={saving()}
            value={dose.minIntervalDays}
            // A cleared interval reads as zero days (rules § input bounds).
            onChange={days =>
              updateDose(dose.id, { minIntervalDays: days ?? 0 })
            }
          />
        );
      },
    },
    {
      c: { id: 'delete' },
      header: () => t('label.delete'),
      meta: { align: 'center', hideFromColumnSettings: true },
      size: remToPx(4),
      cell: info => (
        <IconButton
          icon={<TrashIcon />}
          label={t('label.delete')}
          variant="danger"
          size="small"
          disabled={saving()}
          onClick={() => removeDose(info.row.original.id)}
        />
      ),
    },
  ];

  const problemLine = (item: ValidationItem): string =>
    item.kind === 'field'
      ? `- ${t(item.labelKey)}: ${t(item.messageKey)}`
      : `- ${t('label.dose')} ${item.number}: ${item.messageKeys
          .map(key => t(key))
          .join(', ')}`;

  return (
    <Dialog
      open
      testId="vaccine-course-edit-modal"
      title={
        isEdit
          ? t('heading.edit-vaccine-course')
          : t('heading.create-vaccine-course')
      }
      // Blocking while the save is in flight: no Escape exit until it resolves.
      dismissable={!saving()}
      onClose={props.onClose}
      width="wide"
      // The server's refusal sits above the actions, with the draft kept for
      // correction and retry (S3 § states).
      footer={
        <Show when={serverError()}>
          {error => (
            <Alert severity="error" testId="vaccine-course-save-error">
              {error().message}
              <Show when={error().detail}>
                {detail => <ErrorDetails detail={detail()} />}
              </Show>
            </Alert>
          )}
        </Show>
      }
      actions={
        <>
          <Show when={!saving()}>
            <CancelButton
              data-testid="dialog-button-cancel"
              onClick={props.onClose}
            />
          </Show>
          {/* Save, not OK (controls › footer button identity) — always offered
              on create, only once dirty on edit; busy while saving. */}
          <DialogSaveButton
            data-testid="dialog-button-save"
            disabled={!canSave() || loading() || notFound()}
            loading={saving()}
            onClick={() => void save()}
          />
        </>
      }
    >
      <Show when={!loading()} fallback={<Spinner />}>
        <Show
          when={!notFound()}
          fallback={
            <Alert severity="error">{t('error.immunisations-not-found')}</Alert>
          }
        >
          <Stack>
            <FieldRow label={t('label.immunisation-name')} required>
              <TextField
                label={t('label.immunisation-name')}
                hideLabel
                required
                width="full"
                data-testid="vaccine-course-name-input"
                disabled={saving()}
                error={fieldError('name')}
                value={draft.name}
                onInput={event => setDraft('name', event.currentTarget.value)}
              />
            </FieldRow>
            <FieldRow label={t('label.target-demographic')}>
              <Combobox<Group>
                label={t('label.target-demographic')}
                hideLabel
                items={groupOptions()}
                itemToString={group => group.name}
                itemToValue={group => group.id}
                value={draft.demographicId ?? undefined}
                selectedItem={draft.demographic ?? undefined}
                onChange={setGroup}
                inputTestId="vaccine-course-demographic-input"
                disabled={saving()}
              />
            </FieldRow>
            <FormRow>
              <FieldRow label={t('label.coverage-rate')} required>
                <NumberField
                  label={t('label.coverage-rate')}
                  hideLabel
                  required
                  width="full"
                  endAdornment="%"
                  min={0}
                  decimalLimit={1}
                  data-testid="vaccine-course-coverage-input"
                  disabled={saving()}
                  error={fieldError('coverageRate')}
                  value={draft.coverageRate}
                  onChange={value => setDraft('coverageRate', value)}
                />
              </FieldRow>
              <FieldRow label={t('label.wastage-rate')} required>
                <NumberField
                  label={t('label.wastage-rate')}
                  hideLabel
                  required
                  width="full"
                  endAdornment="%"
                  min={0}
                  // No `max`: the cap is a SAVE-time check (rules § input
                  // bounds — "above 100 the save is refused as too large"),
                  // reported by the validation summary; a `max` here would
                  // clamp the entry silently on blur instead.
                  decimalLimit={1}
                  data-testid="vaccine-course-wastage-input"
                  disabled={saving()}
                  error={fieldError('wastageRate')}
                  value={draft.wastageRate}
                  onChange={value => setDraft('wastageRate', value)}
                />
              </FieldRow>
              <Button
                variant="secondary"
                icon={<HomeIcon />}
                data-testid="configure-per-store-button"
                disabled={saving()}
                onClick={() => setPanelOpen(true)}
              >
                {t('button.configure-per-store')}
              </Button>
            </FormRow>
            <FieldRow label={t('label.vaccine-items')} required>
              <MultiSelect<VaccineItem>
                label={t('label.vaccine-items')}
                hideLabel
                items={itemOptions()}
                itemToString={item => item.name}
                itemToValue={item => item.id}
                selectedItems={selectedItems()}
                onChange={setItems}
                inputTestId="vaccine-course-items-input"
                disabled={saving()}
                error={fieldError('vaccineItems')}
              />
            </FieldRow>
            <HStack justify="between" wrap>
              <HStack gap="lg" wrap>
                <Checkbox
                  label={t('label.calculate-demand')}
                  testId="vaccine-course-gaps-checkbox"
                  disabled={saving()}
                  checked={draft.useInGapsCalculations}
                  onChange={checked =>
                    setDraft('useInGapsCalculations', checked)
                  }
                />
                <Checkbox
                  label={t('label.can-skip-dose')}
                  testId="vaccine-course-skip-dose-checkbox"
                  disabled={saving()}
                  checked={draft.canSkipDose}
                  onChange={checked => setDraft('canSkipDose', checked)}
                />
              </HStack>
              <Button
                icon={<PlusCircleIcon />}
                data-testid="add-dose-button"
                disabled={saving()}
                onClick={addDose}
              >
                {t('label.dose')}
              </Button>
            </HStack>
            {/* The validation summary — the typed-value rules as they trip,
                the required checks once a Save press found them, live after
                that (S3 § validation summary). */}
            <Show when={problems().length > 0}>
              <Alert severity="error" testId="vaccine-course-validation">
                <div>{t('messages.alert-problem-with-form-input')}</div>
                <For each={problems()}>
                  {item => <div>{problemLine(item)}</div>}
                </For>
              </Alert>
            </Show>
            <DataTable
              columns={doseColumns()}
              rows={draft.vaccineCourseDoses}
              rowKey={dose => dose.id}
              showFullScreen={false}
              // Every cell is an in-place editor, and the age cells grow a
              // validation message beneath their inputs. Centred, that growth
              // would lift the offending cell's inputs above the rest of the
              // row — the inputs stop lining up exactly when one is wrong.
              cellAlign="start"
              emptyMessage={t('message.add-a-dose')}
            />
          </Stack>
        </Show>
      </Show>
      <Show when={panelOpen()}>
        <StoreRatesPanel
          configs={unwrap(draft).storeConfigs}
          onBack={() => setPanelOpen(false)}
          onOk={configs => {
            setDraft('storeConfigs', configs);
            setPanelOpen(false);
          }}
        />
      </Show>
    </Dialog>
  );
};

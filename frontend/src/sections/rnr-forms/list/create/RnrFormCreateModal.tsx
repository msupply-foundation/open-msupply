import { createMemo, createResource, createSignal, Show } from 'solid-js';
import type { Component, Resource } from 'solid-js';
import { graphqlFetch } from '@/api/graphql';
import { t } from '@/intl';
import { generateUUID } from '@/uuid';
import { Dialog } from '@/ui/elements/feedback/Dialog';
import { Alert } from '@/ui/elements/feedback/Alert';
import {
  CancelButton,
  DialogSaveButton,
} from '@/ui/elements/buttons/StandardButtons';
import { FieldRow } from '@/ui/elements/inputs/FieldRow';
import { Stack } from '@/ui/layout/Stack/Stack';
import { Combobox } from '@/ui/elements/selectors/Combobox';
import { NameSearch, type NameOption } from '@/domain/name';
import { fetchNameById } from '@/domain/name/nameResource';
import {
  fetchPrograms,
  fetchSchedulesWithPeriods,
  type ProgramListItem,
  type ScheduleWithPeriods,
} from '@/domain/program/programResource';
import { InsertRnrForm } from './createRnrForm.generated';
import { RnrForms } from '../rnrForms.generated';
import type {
  RnrFormRowFragment,
  RnrFormsVariables,
} from '../rnrForms.generated';
import {
  defaultProgramId,
  defaultScheduleId,
  defaultSupplierId,
  periodSelection,
  programOptions,
  type PeriodSelection,
} from './rnrFormCreate';

// The create modal (spec/rnr-forms/ui-surface.md S2; rules § creation):
// program → schedule → period cascade + supplier, with auto-selection,
// prefill-from-history, the closed-periods hint, and the two period error
// states. The dialog footer is the standard Cancel/Save (never OK); a server
// rejection keeps the dialog open with an inline banner.

export const RnrFormCreateModal: Component<{
  storeId: string;
  onClose: () => void;
  onCreated: (id: string) => void;
}> = props => {
  // The user's explicit picks; undefined = follow the defaults below.
  const [pickedProgramId, setPickedProgramId] = createSignal<string>();
  const [pickedScheduleId, setPickedScheduleId] = createSignal<string>();
  const [pickedPeriodId, setPickedPeriodId] = createSignal<string>();
  const [pickedSupplier, setPickedSupplier] = createSignal<NameOption | null>();
  const [saving, setSaving] = createSignal(false);
  const [serverError, setServerError] = createSignal<string>();

  // Every read below first fetches inside this open modal — live user state —
  // so all are `.state`-gated, never suspending (kdd/solid-reactivity-pitfalls
  // › the createResource checklist).
  const gated = <T,>(resource: Resource<T>): T | undefined =>
    resource.state === 'ready' || resource.state === 'refreshing'
      ? resource.latest
      : undefined;

  const [programsData] = createResource(
    () => props.storeId,
    async storeId => programOptions(await fetchPrograms(storeId))
  );
  const programs = (): ProgramListItem[] => gated(programsData) ?? [];

  // The most recent form overall — the program/supplier prefill source
  // (OMS-REG-REPL-07.36/.38).
  const [recentData] = createResource(
    () => props.storeId,
    async storeId => {
      const result = await graphqlFetch(RnrForms, {
        storeId,
        sort: { key: 'createdDatetime', desc: true },
        page: { first: 1 },
      });
      if (result.kind !== 'success') return undefined;
      return result.data.rAndRForms.nodes[0];
    }
  );
  const mostRecentForm = (): RnrFormRowFragment | undefined =>
    gated(recentData);

  const programId = () =>
    pickedProgramId() ?? defaultProgramId(programs(), mostRecentForm());

  // Value-keyed source (a serialised string, like the sibling list/detail
  // resources): the tracked deps include other resources' states, and a fresh
  // object identity per source run would refetch even when the ids are
  // unchanged.
  const [schedulesData] = createResource(
    () =>
      programId()
        ? JSON.stringify({ storeId: props.storeId, programId: programId()! })
        : undefined,
    async serialised => {
      const { storeId, programId } = JSON.parse(serialised) as {
        storeId: string;
        programId: string;
      };
      return fetchSchedulesWithPeriods(storeId, programId);
    }
  );
  const schedules = (): ScheduleWithPeriods[] => gated(schedulesData) ?? [];

  const scheduleId = () =>
    pickedScheduleId() ?? defaultScheduleId(schedules(), mostRecentForm());
  const schedule = () => schedules().find(s => s.id === scheduleId());

  // The previous form within the chosen program+schedule — the sequence
  // anchor (rules § creation 5/6). Distinct from the overall prefill read.
  const [previousData] = createResource(
    () =>
      programId() && scheduleId()
        ? JSON.stringify({
            storeId: props.storeId,
            filter: {
              programId: { equalTo: programId()! },
              periodScheduleId: { equalTo: scheduleId()! },
            },
            sort: { key: 'createdDatetime', desc: true },
            page: { first: 1 },
          } satisfies RnrFormsVariables)
        : undefined,
    async serialised => {
      const result = await graphqlFetch(
        RnrForms,
        JSON.parse(serialised) as RnrFormsVariables
      );
      if (result.kind !== 'success') return undefined;
      return result.data.rAndRForms.nodes[0];
    }
  );
  const previousForm = () => gated(previousData);
  const previousSettled = () => previousData.state === 'ready';

  const periods = createMemo(() => periodSelection(schedule(), previousForm()));
  const periodId = () => pickedPeriodId() ?? periods().defaultPeriodId;

  // The supplier prefill resolves the REAL option by id (never a hand-built
  // NameOption — the row fragment holds only id + name, and fabricating the
  // flag fields is a type hole; kdd/type-safety).
  const [prefillSupplier] = createResource(
    () => defaultSupplierId(mostRecentForm()),
    async id => fetchNameById(props.storeId, id)
  );

  const supplier = (): NameOption | null => {
    const picked = pickedSupplier();
    if (picked !== undefined) return picked;
    return gated(prefillSupplier) ?? null;
  };

  const changeProgram = (id: string | undefined) => {
    setPickedProgramId(id);
    // Changing the program clears schedule and period (ui-surface S2).
    setPickedScheduleId(undefined);
    setPickedPeriodId(undefined);
  };
  const changeSchedule = (id: string | undefined) => {
    setPickedScheduleId(id);
    setPickedPeriodId(undefined);
  };

  // Save is disabled while any field is empty or the previous form is a draft
  // (OMS-REG-REPL-07.41; the sequence rejections are pre-empted here and
  // re-checked server-side).
  const incomplete = () =>
    !programId() || !scheduleId() || !periodId() || !supplier();
  const blocked = () =>
    periods().error === 'previous-not-finalised' || !previousSettled();

  const save = async () => {
    if (saving() || incomplete() || blocked()) return;
    setSaving(true);
    setServerError(undefined);
    const id = generateUUID();
    const result = await graphqlFetch(
      InsertRnrForm,
      {
        storeId: props.storeId,
        input: {
          id,
          programId: programId()!,
          periodId: periodId()!,
          supplierId: supplier()!.id,
        },
      },
      // A rejection that slips past the modal's gating (a race on the period)
      // surfaces inline in the dialog, not the global modal (ui-surface S2).
      { returnGraphqlErrors: true }
    );
    setSaving(false);
    if (result.kind === 'success') {
      props.onCreated(id);
      return;
    }
    if (result.kind === 'graphqlError') setServerError(result.message);
    // unauthenticated/forbidden/unexpected: the global surface owns it; the
    // dialog just released its busy state.
  };

  const periodErrorText = () => {
    switch (periods().error) {
      case 'previous-not-finalised':
        return t('messages.finalise-previous-form');
      case 'no-available-periods':
        return t('messages.no-available-periods');
      default:
        return undefined;
    }
  };

  return (
    <Dialog
      open
      onClose={props.onClose}
      closeButton
      dismissable={!saving()}
      title={t('label.new-rnr-form')}
      testId="create-rnr-form-modal"
      width="form"
      actions={
        <>
          <CancelButton onClick={props.onClose} />
          <DialogSaveButton
            data-testid="create-rnr-form-save-button"
            disabled={incomplete() || blocked()}
            loading={saving()}
            onClick={() => void save()}
          />
        </>
      }
    >
      <Stack gap="md">
        <Show when={serverError()}>
          <Alert severity="error" testId="create-rnr-form-error">
            {serverError()}
          </Alert>
        </Show>
        {/* All four lookups are required (Save gates on them), so none offers
            a clear affordance (controls › clearability follows optionality). */}
        <FieldRow label={t('label.program')}>
          <Combobox<ProgramListItem>
            label={t('label.program')}
            hideLabel
            clearable={false}
            items={programs()}
            value={programId()}
            itemToString={p => p.name}
            itemToValue={p => p.id}
            loading={programsData.loading}
            onChange={p => changeProgram(p?.id)}
            inputTestId="create-rnr-form-program"
          />
        </FieldRow>
        <FieldRow label={t('label.schedule')}>
          <Combobox<ScheduleWithPeriods>
            label={t('label.schedule')}
            hideLabel
            clearable={false}
            items={schedules()}
            value={scheduleId()}
            disabled={!programId()}
            itemToString={s => s.name}
            itemToValue={s => s.id}
            loading={schedulesData.loading}
            onChange={s => changeSchedule(s?.id)}
            inputTestId="create-rnr-form-schedule"
          />
        </FieldRow>
        <FieldRow label={t('label.period')}>
          <Combobox<PeriodSelection['options'][number]>
            label={t('label.period')}
            hideLabel
            clearable={false}
            items={periods().options}
            value={periodId()}
            disabled={!programId() || !scheduleId()}
            itemToString={o => o.option.period.name}
            itemToValue={o => o.option.period.id}
            itemDisabled={o => o.disabled}
            // Unselectable periods stay listed, dimmed AND textually marked
            // (controls › blocked affordances — never dimming alone).
            renderItem={o => (
              <>
                {o.option.period.name}
                {o.disabled ? ` (${t('label.rnr-period-used')})` : null}
              </>
            )}
            onChange={o => setPickedPeriodId(o?.option.period.id)}
            // The standing closed-periods hint (ui-surface S2); the error line
            // takes its place while one applies (Combobox precedence).
            helperText={t('messages.only-closed-periods-visible')}
            error={periodErrorText()}
            errorTestId="create-rnr-form-period-error"
            inputTestId="create-rnr-form-period"
          />
        </FieldRow>
        <FieldRow label={t('label.supplier')}>
          <NameSearch
            storeId={props.storeId}
            role="supplier"
            label={t('label.supplier')}
            hideLabel
            clearable={false}
            selected={supplier() ?? undefined}
            onSelect={name => setPickedSupplier(name)}
            inputTestId="create-rnr-form-supplier"
          />
        </FieldRow>
      </Stack>
    </Dialog>
  );
};

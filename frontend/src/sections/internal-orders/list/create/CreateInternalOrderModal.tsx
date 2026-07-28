import {
  createEffect,
  createMemo,
  createResource,
  createSignal,
  onMount,
  Show,
  type Component,
  type JSX,
} from 'solid-js';
import { t } from '../../../../intl';
import { graphqlFetch } from '../../../../api/graphql';
import { Dialog } from '../../../../ui/elements/feedback/Dialog';
import { createFocusTarget } from '../../../../ui/utils/createFocusTarget';
import { Spinner } from '../../../../ui/elements/feedback/Spinner';
import { Alert } from '../../../../ui/elements/feedback/Alert';
import { Button } from '../../../../ui/elements/buttons/Button';
import { Tabs, TabList, TabPanel } from '../../../../ui/elements/tabs/Tabs';
import { Combobox } from '../../../../ui/elements/selectors/Combobox';
import { FieldRow } from '../../../../ui/elements/inputs/FieldRow';
import { Stack } from '../../../../ui/layout/Stack/Stack';
import { PlusCircleIcon, AlertTriangleIcon } from '../../../../ui/icons';
import { NameSearch, type NameOption } from '../../../../domain/name';
import { InternalOrderProgramSettings } from './createInternalOrder.generated';
import { createGeneralOrder, createProgramOrder } from './createInternalOrder';

// The create modal (spec/internal-orders S2). Two paths: a General order — pick
// a supplier and the empty Draft is created immediately (no confirm) — and a
// Program order — cascade supplier → program → order type → period, then
// Create. The modal offers both as tabs (Program first) only when the store can
// create program orders (its supplier-program settings are non-empty, AC-P1);
// otherwise the General path fills it. On success the caller navigates to the
// new order (onCreated); a program rejection keeps the dialog open with the
// error (AC-P5). The general path's rejections are unreachable / surfaced
// globally (contract › creation).

// A cascade select is an id-valued autocomplete whose label the FieldRow shows.
type CascadeOption = { id: string; label: string; disabled?: boolean };

const CascadeSelect = (props: {
  label: string;
  options: CascadeOption[];
  value?: string;
  onChange: (id: string | null) => void;
  disabled?: boolean;
  noResultsMessage?: string;
  helperText?: string;
  renderItem?: (option: CascadeOption) => JSX.Element;
  testId?: string;
}): JSX.Element => (
  <Combobox<CascadeOption>
    label={props.label}
    hideLabel
    items={props.options}
    value={props.value}
    disabled={props.disabled}
    itemToString={o => o.label}
    itemToValue={o => o.id}
    itemDisabled={o => o.disabled === true}
    onChange={o => props.onChange(o?.id ?? null)}
    noResultsMessage={props.noResultsMessage}
    helperText={props.helperText}
    renderItem={props.renderItem}
    inputTestId={props.testId}
  />
);

export interface CreateInternalOrderModalProps {
  storeId: string;
  open: boolean;
  onClose: () => void;
  /** A create succeeded — the caller navigates to the new order's detail. */
  onCreated: (id: string) => void;
}

export const CreateInternalOrderModal: Component<
  CreateInternalOrderModalProps
> = props => {
  // The program settings (and the tab gate) load when the modal opens; a
  // spinner shows until they settle. Read non-suspending (gated on state) so
  // the open modal never suspends the list screen behind it
  // (kdd/solid-reactivity-pitfalls).
  const [settings] = createResource(
    () => (props.open ? props.storeId : false),
    async storeId => {
      const result = await graphqlFetch(InternalOrderProgramSettings, {
        storeId,
      });
      if (result.kind !== 'success') return undefined;
      return result.data.supplierProgramRequisitionSettings;
    }
  );
  const settled = () =>
    settings.state === 'ready' || settings.state === 'refreshing';
  const settingsList = () => (settled() ? (settings.latest ?? []) : []);
  const programCapable = () => settingsList().length > 0;

  const [tab, setTab] = createSignal('program');
  const activeTab = () => (programCapable() ? tab() : 'general');

  // Program-path selections. Each choice clears the ones below it (AC-P2).
  const [supplierId, setSupplierId] = createSignal<string>();
  const [programId, setProgramId] = createSignal<string>();
  const [orderTypeId, setOrderTypeId] = createSignal<string>();
  const [periodId, setPeriodId] = createSignal<string>();
  const [error, setError] = createSignal<string>();
  const [submitting, setSubmitting] = createSignal(false);

  // Fresh modal, fresh state (a reopen must not resurrect a prior cascade).
  createEffect(() => {
    if (props.open) {
      setTab('program');
      setSupplierId();
      setProgramId();
      setOrderTypeId();
      setPeriodId();
      setError();
      setSubmitting(false);
    }
  });

  // Program suppliers: deduped across every program setting, name-sorted;
  // on-hold suppliers listed but not selectable (AC-P2 supplier picker).
  const suppliers = createMemo<CascadeOption[]>(() => {
    const seen = new Map<string, CascadeOption>();
    for (const setting of settingsList())
      for (const supplier of setting.suppliers)
        if (!seen.has(supplier.id))
          seen.set(supplier.id, {
            id: supplier.id,
            label: supplier.name,
            disabled: supplier.isOnHold,
          });
    return [...seen.values()].sort((a, b) => a.label.localeCompare(b.label));
  });

  // Programs the chosen supplier supplies, rendered "programName (tagName)".
  const programs = createMemo<CascadeOption[]>(() => {
    const supplier = supplierId();
    if (!supplier) return [];
    return settingsList()
      .filter(setting => setting.suppliers.some(s => s.id === supplier))
      .map(setting => ({
        id: setting.programId,
        label: `${setting.programName} (${setting.tagName})`,
      }));
  });

  const selectedSetting = () =>
    settingsList().find(setting => setting.programId === programId());
  const orderTypes = createMemo<CascadeOption[]>(() =>
    (selectedSetting()?.orderTypes ?? []).map(orderType => ({
      id: orderType.id,
      label: orderType.name,
    }))
  );
  const isEmergency = (id: string) =>
    selectedSetting()?.orderTypes.find(o => o.id === id)?.isEmergency ?? false;
  const periods = createMemo<CascadeOption[]>(() => {
    const orderType = selectedSetting()?.orderTypes.find(
      o => o.id === orderTypeId()
    );
    return (orderType?.availablePeriods ?? []).map(period => ({
      id: period.id,
      label: period.name,
    }));
  });

  const createReady = () =>
    !!supplierId() && !!programId() && !!orderTypeId() && !!periodId();

  // General path: picking a supplier creates and navigates immediately (AC-C2).
  const onGeneralSupplier = async (supplier: NameOption | null) => {
    if (!supplier || submitting()) return;
    setSubmitting(true);
    const result = await createGeneralOrder(props.storeId, supplier.id);
    setSubmitting(false);
    if (result.kind === 'created') props.onCreated(result.id);
    // A failed general create surfaced globally; no inline error to show.
  };

  const submitProgram = async () => {
    if (!createReady() || submitting()) return;
    setSubmitting(true);
    setError();
    const result = await createProgramOrder(
      props.storeId,
      supplierId()!,
      orderTypeId()!,
      periodId()!
    );
    setSubmitting(false);
    if (result.kind === 'created') {
      props.onCreated(result.id);
      return;
    }
    if (result.kind === 'error') setError(result.message);
    // 'failed' already surfaced globally.
  };

  // The two path bodies are components so each mount point owns its own
  // instance — the General path renders both as a tab and (no-program store) as
  // the whole body, and a shared JSX node can't mount in two places.
  // The supplier picker is the General path's only control, so it takes focus
  // whenever that path appears (spec/internal-orders S2 — autofocus): on open
  // for a store with no programs, and on switching to the General tab, whose
  // panel mounts only while active. Declared here rather than as the Dialog's
  // initialFocus because the Program tab, not this one, may open first.
  const supplierSearch = createFocusTarget();

  const GeneralPath: Component = () => {
    onMount(supplierSearch.focus);
    return (
      <Stack gap="md">
        <FieldRow label={t('label.supplier-name')}>
          <NameSearch
            storeId={props.storeId}
            role="supplier"
            storeBacked
            label={t('label.supplier-name')}
            hideLabel
            clearable={false}
            disabled={submitting()}
            focusTarget={supplierSearch}
            onSelect={supplier => void onGeneralSupplier(supplier)}
          />
        </FieldRow>
      </Stack>
    );
  };

  const ProgramPath: Component = () => (
    <Stack gap="md">
      <FieldRow label={t('label.supplier-name')}>
        <CascadeSelect
          label={t('label.supplier-name')}
          options={suppliers()}
          value={supplierId()}
          onChange={id => {
            setSupplierId(id ?? undefined);
            setProgramId();
            setOrderTypeId();
            setPeriodId();
            setError();
          }}
          testId="create-program-supplier"
        />
      </FieldRow>
      <FieldRow label={t('label.program')}>
        <CascadeSelect
          label={t('label.program')}
          options={programs()}
          value={programId()}
          disabled={!supplierId()}
          onChange={id => {
            setProgramId(id ?? undefined);
            setOrderTypeId();
            setPeriodId();
            setError();
          }}
          testId="create-program-program"
        />
      </FieldRow>
      <FieldRow label={t('label.order-type')}>
        <CascadeSelect
          label={t('label.order-type')}
          options={orderTypes()}
          value={orderTypeId()}
          disabled={!programId()}
          noResultsMessage={t('messages.not-configured')}
          onChange={id => {
            setOrderTypeId(id ?? undefined);
            setPeriodId();
            setError();
          }}
          renderItem={option => (
            <span
              style={{
                display: 'inline-flex',
                'align-items': 'center',
                gap: 'var(--space-2)',
              }}
            >
              {option.label}
              <Show when={isEmergency(option.id)}>
                <AlertTriangleIcon
                  style={{ color: 'var(--error-main)' }}
                  aria-label={t('label.emergency')}
                />
              </Show>
            </span>
          )}
          testId="create-program-order-type"
        />
      </FieldRow>
      <FieldRow label={t('label.period')}>
        <CascadeSelect
          label={t('label.period')}
          options={periods()}
          value={periodId()}
          disabled={!orderTypeId()}
          helperText={t('message.program-period')}
          noResultsMessage={t('messages.period-not-available')}
          onChange={id => {
            setPeriodId(id ?? undefined);
            setError();
          }}
          testId="create-program-period"
        />
      </FieldRow>
      <Show when={error()}>
        <Alert severity="error">{error()}</Alert>
      </Show>
    </Stack>
  );

  return (
    <Dialog
      open={props.open}
      onClose={props.onClose}
      closeButton
      dismissable={!submitting()}
      title={t('label.new-internal-order')}
      testId="create-internal-order-modal"
      widthRem={44}
      minBodyHeightRem={30}
      // Create sits in the actions row only on the Program path; the General
      // path creates on supplier-select and has no footer button (AC-C2/AC-P3).
      actions={
        <Show when={activeTab() === 'program'}>
          <Button
            icon={<PlusCircleIcon />}
            data-testid="create-program-order-button"
            disabled={!createReady()}
            loading={submitting()}
            onClick={() => void submitProgram()}
          >
            {t('label.create')}
          </Button>
        </Show>
      }
    >
      <Show when={settled()} fallback={<Spinner center label={t('loading')} />}>
        <Show when={programCapable()} fallback={<GeneralPath />}>
          <Tabs value={activeTab()} onValueChange={setTab}>
            <TabList
              tabs={[
                { value: 'program', label: t('label.requisition-program') },
                { value: 'general', label: t('label.requisition-general') },
              ]}
            />
            <TabPanel value="program">
              <ProgramPath />
            </TabPanel>
            <TabPanel value="general">
              <GeneralPath />
            </TabPanel>
          </Tabs>
        </Show>
      </Show>
    </Dialog>
  );
};

export default CreateInternalOrderModal;

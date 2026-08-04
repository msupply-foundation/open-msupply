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
import { Alert } from '../../../../ui/elements/feedback/Alert';
import { Button } from '../../../../ui/elements/buttons/Button';
import { Tabs, TabList, TabPanel } from '../../../../ui/elements/tabs/Tabs';
import { Combobox } from '../../../../ui/elements/selectors/Combobox';
import { FieldRow } from '../../../../ui/elements/inputs/FieldRow';
import { Stack } from '../../../../ui/layout/Stack/Stack';
import { HStack } from '../../../../ui/layout/Stack/HStack';
import { StatusMarker } from '../../../../ui/elements/feedback/StatusMarker';
import { PlusCircleIcon, AlertTriangleIcon } from '../../../../ui/icons';
import { NameSearch, type NameOption } from '../../../../domain/name';
import { CustomerProgramSettings } from './createRequisition.generated';
import {
  createGeneralRequisition,
  createProgramRequisition,
} from './createRequisition';

// The New-requisition modal (spec/requisitions S3a). Two paths: a General
// requisition — pick a customer and the empty New record is created
// immediately (no confirm) — and a Program requisition — cascade customer →
// program → order type → period, then Create. The modal offers both as tabs
// (Program first) only when any of the store's visible customers has a
// customer program configured (the list's hasCustomerProgramRequisitionSettings
// gate, passed in — OMS-FUN-DIS-03.11); otherwise the General customer search
// fills it. On success the caller navigates to the new requisition (onCreated);
// a rejection keeps the dialog open with the error inline (ui-standards ›
// action feedback — the reference's near-silent error path is deliberately not
// copied). Mirrors the internal-orders create modal's framing.

// A cascade select is an id-valued autocomplete whose label the FieldRow shows.
type CascadeOption = { id: string; label: string };

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
    onChange={o => props.onChange(o?.id ?? null)}
    noResultsMessage={props.noResultsMessage}
    helperText={props.helperText}
    renderItem={props.renderItem}
    inputTestId={props.testId}
  />
);

export interface CreateRequisitionModalProps {
  storeId: string;
  open: boolean;
  /**
   * Whether any of the store's visible customers has a customer program
   * configured — the Program tab's gate (OMS-FUN-DIS-03.11), resolved by the
   * list's context read (the New button waits for it before opening).
   */
  programCapable: boolean;
  onClose: () => void;
  /** A create succeeded — the caller navigates to the new requisition. */
  onCreated: (id: string) => void;
}

export const CreateRequisitionModal: Component<
  CreateRequisitionModalProps
> = props => {
  const [tab, setTab] = createSignal('program');
  const activeTab = () => (props.programCapable ? tab() : 'general');

  // Program-path selections. Each choice clears the ones below it (the spec's
  // cascade: changing an earlier choice resets the rest). The customer is held
  // as the full NameOption — its isStore flag drives the duplicate-order
  // warning banner.
  const [customer, setCustomer] = createSignal<NameOption>();
  const [programId, setProgramId] = createSignal<string>();
  const [orderTypeId, setOrderTypeId] = createSignal<string>();
  const [periodId, setPeriodId] = createSignal<string>();
  const [error, setError] = createSignal<string>();
  const [submitting, setSubmitting] = createSignal(false);

  // Fresh modal, fresh state (a reopen must not resurrect a prior cascade).
  createEffect(() => {
    if (props.open) {
      setTab('program');
      setCustomer();
      setProgramId();
      setOrderTypeId();
      setPeriodId();
      setError();
      setSubmitting(false);
    }
  });

  // The chosen customer's program settings (OMS-FUN-DIS-03.12), fetched per
  // customer pick. Read non-suspending (gated on state) so the open modal
  // never suspends the list screen behind it (kdd/solid-reactivity-pitfalls).
  const [settings] = createResource(
    () => (props.open ? customer()?.id : undefined),
    async customerNameId => {
      const result = await graphqlFetch(CustomerProgramSettings, {
        storeId: props.storeId,
        customerNameId,
      });
      if (result.kind !== 'success') return undefined;
      return result.data.programRequisitionSettingsByCustomer.programSettings;
    }
  );
  const settingsSettled = () =>
    settings.state === 'ready' || settings.state === 'refreshing';
  const settingsList = () => (settingsSettled() ? (settings.latest ?? []) : []);

  // Programs the chosen customer orders under, rendered
  // "masterListName (tagName)" — the program identity is carried by the order
  // type, so the program level only narrows the order-type options.
  const programs = createMemo<CascadeOption[]>(() =>
    settingsList().map(setting => ({
      id: setting.masterListId,
      label: `${setting.masterListName} (${setting.masterListNameTagName})`,
    }))
  );

  const selectedSetting = () =>
    settingsList().find(setting => setting.masterListId === programId());
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
    !!customer() && !!programId() && !!orderTypeId() && !!periodId();

  // General path: picking a customer creates and navigates immediately
  // (OMS-FUN-DIS-03.1/.9 — no footer button on this path).
  const onGeneralCustomer = async (picked: NameOption | null) => {
    if (!picked || submitting()) return;
    setSubmitting(true);
    setError();
    const result = await createGeneralRequisition(props.storeId, picked.id);
    setSubmitting(false);
    if (result.kind === 'created') props.onCreated(result.id);
    else if (result.kind === 'error') setError(result.message);
    // 'failed' already surfaced globally.
  };

  const submitProgram = async () => {
    if (!createReady() || submitting()) return;
    setSubmitting(true);
    setError();
    const result = await createProgramRequisition(
      props.storeId,
      customer()!.id,
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
  // instance. The customer picker is the General path's only control, so it
  // takes focus whenever that path appears: on open for a no-programs store,
  // and on switching to the General tab, whose panel mounts only while active.
  const customerSearch = createFocusTarget();

  const GeneralPath: Component = () => {
    onMount(customerSearch.focus);
    return (
      <Stack gap="md">
        <FieldRow label={t('label.customer-name')}>
          <NameSearch
            storeId={props.storeId}
            role="customer"
            label={t('label.customer-name')}
            hideLabel
            clearable={false}
            disabled={submitting()}
            focusTarget={customerSearch}
            noResultsMessage={t('messages.not-configured')}
            inputTestId="create-general-customer"
            onSelect={picked => void onGeneralCustomer(picked)}
          />
        </FieldRow>
        <Show when={error()}>
          <Alert severity="error">{error()}</Alert>
        </Show>
      </Stack>
    );
  };

  const ProgramPath: Component = () => (
    <Stack gap="md">
      <FieldRow label={t('label.customer-name')}>
        <NameSearch
          storeId={props.storeId}
          role="customer"
          label={t('label.customer-name')}
          hideLabel
          disabled={submitting()}
          selected={customer()}
          noResultsMessage={t('messages.not-configured')}
          inputTestId="create-program-customer"
          onSelect={picked => {
            setCustomer(picked ?? undefined);
            setProgramId();
            setOrderTypeId();
            setPeriodId();
            setError();
          }}
        />
      </FieldRow>
      {/* A customer that is itself a store may submit its own internal order
          for the same demand — warn, never block (rules › creating a
          requisition). */}
      <Show when={customer()?.isStore}>
        <Alert severity="warning">
          {t('warning.manual-store-requisition')}
        </Alert>
      </Show>
      <FieldRow label={t('label.program')}>
        <CascadeSelect
          label={t('label.program')}
          options={programs()}
          value={programId()}
          disabled={!customer() || settings.loading}
          noResultsMessage={t('label.no-program-options')}
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
          noResultsMessage={t('label.no-order-types')}
          onChange={id => {
            setOrderTypeId(id ?? undefined);
            setPeriodId();
            setError();
          }}
          renderItem={option => (
            <HStack gap="sm">
              {option.label}
              <Show when={isEmergency(option.id)}>
                <StatusMarker
                  severity="error"
                  icon={AlertTriangleIcon}
                  label={t('label.emergency')}
                />
              </Show>
            </HStack>
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
      title={t('label.new-requisition')}
      testId="create-requisition-modal"
      widthRem={44}
      minBodyHeightRem={30}
      // Create sits in the actions row only on the Program path; the General
      // path creates on customer-select and has no footer button (spec S3a).
      actions={
        <Show when={activeTab() === 'program'}>
          <Button
            icon={<PlusCircleIcon />}
            data-testid="create-program-requisition-button"
            disabled={!createReady()}
            loading={submitting()}
            onClick={() => void submitProgram()}
          >
            {t('label.create')}
          </Button>
        </Show>
      }
    >
      <Show when={props.programCapable} fallback={<GeneralPath />}>
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
    </Dialog>
  );
};

export default CreateRequisitionModal;

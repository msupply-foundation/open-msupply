import {
  createEffect,
  createMemo,
  createResource,
  createSignal,
  Show,
  type Component,
  type JSX,
} from 'solid-js';
import { t } from '../../../../intl';
import { graphqlFetch } from '../../../../api/graphql';
import { gated } from '../../../../api/gated';
import { Dialog } from '../../../../ui/elements/feedback/Dialog';
import { createFocusTarget } from '../../../../ui/utils/createFocusTarget';
import { Spinner } from '../../../../ui/elements/feedback/Spinner';
import { Alert } from '../../../../ui/elements/feedback/Alert';
import { Button } from '../../../../ui/elements/buttons/Button';
import { CancelButton } from '../../../../ui/elements/buttons/StandardButtons';
import { Combobox } from '../../../../ui/elements/selectors/Combobox';
import { FieldRow } from '../../../../ui/elements/inputs/FieldRow';
import { Stack } from '../../../../ui/layout/Stack/Stack';
import { HStack } from '../../../../ui/layout/Stack/HStack';
import { StatusMarker } from '../../../../ui/elements/feedback/StatusMarker';
import { AlertTriangleIcon } from '../../../../ui/icons';
import { NameSearch } from '../../../../domain/name';
import { NonProgramMasterLists } from '../../../../domain/masterList/masterList.generated';
import { InternalOrderProgramSettings } from './createInternalOrder.generated';
import { createGeneralOrder, createProgramOrder } from './createInternalOrder';

// The create modal (spec/internal-orders S2): one form for both kinds of order.
// Supplier first; then, where the store can create program orders (its
// supplier-program settings are non-empty, OMS-REG-REPL-04.102), an optional
// Program that decides the kind — none chosen makes a general order, one chosen
// a program order with its order type → period cascade. While no program is
// chosen an optional Master list starts the general order from that list
// (OMS-REG-REPL-04.103/.104). Create submits either kind; on success the caller
// navigates to the new order (onCreated), and a rejection keeps the dialog open
// with the error (OMS-REG-REPL-04.50).

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
  placeholder?: string;
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
    placeholder={props.placeholder}
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
  // The program settings (and the program-field gate) and the store's own
  // master lists load when the modal opens; a spinner shows until the settings
  // settle. Both read non-suspending (gated on state) so the open modal never
  // suspends the list screen behind it (kdd/solid-reactivity-pitfalls).
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
  const [masterLists] = createResource(
    () => (props.open ? props.storeId : false),
    async storeId => {
      const result = await graphqlFetch(NonProgramMasterLists, { storeId });
      if (result.kind !== 'success') return undefined;
      return result.data.masterLists.nodes;
    }
  );
  const settled = () =>
    settings.state === 'ready' || settings.state === 'refreshing';
  const settingsList = () => gated(settings) ?? [];
  const programCapable = () => settingsList().length > 0;

  // Selections. Program, order type and period cascade: each choice clears the
  // ones below it (OMS-REG-REPL-04.47).
  const [supplierId, setSupplierId] = createSignal<string>();
  const [programId, setProgramId] = createSignal<string>();
  const [orderTypeId, setOrderTypeId] = createSignal<string>();
  const [periodId, setPeriodId] = createSignal<string>();
  const [masterListId, setMasterListId] = createSignal<string>();
  const [error, setError] = createSignal<string>();
  const [submitting, setSubmitting] = createSignal(false);

  // Fresh modal, fresh state (a reopen must not resurrect a prior choice).
  createEffect(() => {
    if (props.open) {
      setSupplierId();
      setProgramId();
      setOrderTypeId();
      setPeriodId();
      setMasterListId();
      setError();
      setSubmitting(false);
    }
  });

  const clearProgram = () => {
    setProgramId();
    setOrderTypeId();
    setPeriodId();
  };

  // Programs the given supplier supplies, rendered "programName (tagName)".
  const programsFor = (supplier: string | undefined): CascadeOption[] =>
    supplier
      ? settingsList()
          .filter(setting => setting.suppliers.some(s => s.id === supplier))
          .map(setting => ({
            id: setting.programId,
            label: `${setting.programName} (${setting.tagName})`,
          }))
      : [];
  const programs = createMemo(() => programsFor(supplierId()));

  // A new supplier keeps the chosen program only if it supplies it too
  // (OMS-REG-REPL-04.102).
  const onSupplier = (id: string | undefined) => {
    setSupplierId(id);
    setError();
    const program = programId();
    if (program && !programsFor(id).some(p => p.id === program)) clearProgram();
  };

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
  const masterListOptions = createMemo<CascadeOption[]>(() =>
    (gated(masterLists) ?? []).map(list => ({ id: list.id, label: list.name }))
  );

  // No program → a general order, ready once a supplier is chosen
  // (OMS-REG-REPL-04.101); a program → all four set (OMS-REG-REPL-04.47).
  const createReady = () =>
    !!supplierId() && (!programId() || (!!orderTypeId() && !!periodId()));

  const submit = async () => {
    if (!createReady() || submitting()) return;
    setSubmitting(true);
    setError();
    const result = programId()
      ? await createProgramOrder(
          props.storeId,
          supplierId()!,
          orderTypeId()!,
          periodId()!
        )
      : await createGeneralOrder(props.storeId, supplierId()!, masterListId());
    setSubmitting(false);
    if (result.kind === 'created') {
      props.onCreated(result.id);
      return;
    }
    if (result.kind === 'error') setError(result.message);
    // 'failed' already surfaced globally.
  };

  // The supplier picker is the form's first control, so the dialog opens on it
  // (spec/internal-orders S2 — autofocus).
  const supplierSearch = createFocusTarget();

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
      initialFocus={supplierSearch}
      // Cancel, then Create (ui-standards › dialogs § chrome;
      // OMS-REG-REPL-04.48/.101, OMS-REG-REPL-12.2).
      actions={
        <>
          <CancelButton
            data-testid="dialog-button-cancel"
            disabled={submitting()}
            onClick={props.onClose}
          />
          <Button
            confirms="plain"
            data-testid="create-internal-order-button"
            disabled={!createReady()}
            loading={submitting()}
            onClick={() => void submit()}
          >
            {t('label.create')}
          </Button>
        </>
      }
    >
      <Show when={settled()} fallback={<Spinner center label={t('loading')} />}>
        <Stack gap="md">
          <FieldRow label={t('label.supplier-name')}>
            <NameSearch
              storeId={props.storeId}
              role="supplier"
              parties="internal"
              label={t('label.supplier-name')}
              hideLabel
              clearable={false}
              disabled={submitting()}
              focusTarget={supplierSearch}
              onSelect={supplier => onSupplier(supplier?.id)}
            />
          </FieldRow>
          <Show when={programCapable()}>
            <FieldRow label={t('label.program')}>
              <CascadeSelect
                label={t('label.program')}
                options={programs()}
                value={programId()}
                disabled={!supplierId() || submitting()}
                placeholder={t('label.program-none')}
                helperText={
                  programId()
                    ? undefined
                    : t('messages.no-program-general-order')
                }
                onChange={id => {
                  clearProgram();
                  setProgramId(id ?? undefined);
                  setError();
                }}
                testId="create-internal-order-program"
              />
            </FieldRow>
            <FieldRow label={t('label.order-type')}>
              <CascadeSelect
                label={t('label.order-type')}
                options={orderTypes()}
                value={orderTypeId()}
                disabled={!programId() || submitting()}
                noResultsMessage={t('messages.not-configured')}
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
                testId="create-internal-order-order-type"
              />
            </FieldRow>
            <FieldRow label={t('label.period')}>
              <CascadeSelect
                label={t('label.period')}
                options={periods()}
                value={periodId()}
                disabled={!orderTypeId() || submitting()}
                helperText={t('message.program-period')}
                noResultsMessage={t('messages.period-not-available')}
                onChange={id => {
                  setPeriodId(id ?? undefined);
                  setError();
                }}
                testId="create-internal-order-period"
              />
            </FieldRow>
          </Show>
          {/* A program order takes its lines from its program, so the master
              list is offered only for a general order (OMS-REG-REPL-04.103). */}
          <Show when={!programId()}>
            <FieldRow label={t('label.master-list')}>
              <CascadeSelect
                label={t('label.master-list')}
                options={masterListOptions()}
                value={masterListId()}
                disabled={submitting()}
                placeholder={t('label.master-list-none')}
                onChange={id => {
                  setMasterListId(id ?? undefined);
                  setError();
                }}
                testId="create-internal-order-master-list"
              />
            </FieldRow>
          </Show>
          <Show when={error()}>
            <Alert severity="error" testId="create-internal-order-error">
              {error()}
            </Alert>
          </Show>
        </Stack>
      </Show>
    </Dialog>
  );
};

export default CreateInternalOrderModal;

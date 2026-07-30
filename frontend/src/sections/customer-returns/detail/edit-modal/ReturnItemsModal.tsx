import { createSignal, Match, onMount, Show, Switch, type JSX } from 'solid-js';
import { createStore, produce, reconcile, unwrap } from 'solid-js/store';
import { graphqlFetch } from '../../../../api/graphql';
import { t } from '../../../../intl';
import { Dialog } from '../../../../ui/elements/feedback/Dialog';
import { createFocusTarget } from '../../../../ui/utils/createFocusTarget';
import { Alert } from '../../../../ui/elements/feedback/Alert';
import { EmptyState } from '../../../../ui/elements/feedback/EmptyState';
import { Button } from '../../../../ui/elements/buttons/Button';
import {
  CancelButton,
  DialogSaveButton,
  SaveAndNextButton,
} from '../../../../ui/elements/buttons/StandardButtons';
import { TextField } from '../../../../ui/elements/inputs/TextField';
import { LabelledValue } from '../../../../ui/elements/typography/LabelledValue';
import { ContentContainer } from '../../../../ui/layout/ContentContainer/ContentContainer';
import { HStack } from '../../../../ui/layout/Stack/HStack';
import { DataTable } from '../../../../ui/elements/table/DataTable';
import { createTableConfig } from '../../../../api/createTableConfig';
import { ItemSearch } from '../../../../domain/item';
import { ProgressList } from '../../../../ui/sync/ProgressList';
import { PlusCircleIcon } from '../../../../ui/icons';
import { GenerateCustomerReturnLines } from '../customerReturnDetail.generated';
import { saveReturnLines, type SaveReturnLinesResult } from '../returnUpdate';
import type { ReturnFieldEdit } from '../returnEdit';
import {
  blankDraft,
  existingLinesBeingRemoved,
  reasonStepLines,
  seedDrafts,
  toLineInputs,
  validateStep1,
  type DraftReturnLine,
} from './returnLineLogic';
import { quantityColumns, reasonColumns } from './returnLineColumns';

// S4 — the return-items modal (spec/customer-returns/ui-surface.md S4): the
// single surface for entering what comes back, per item on an existing return.
// A two-step wizard — Select quantity → Select reason — over a draft store;
// one save upserts the item's whole batch set (rules § line rules,
// OMS-REG-DIST-07.27–.30).
//
// The from-shipment flow (outboundShipmentLineIds) has no entry point until
// the outbound-shipments section exists — this modal covers the per-item
// add/edit flows the detail screen owns.

export type ReturnItemsMode = 'add' | 'update';

type Step = 'quantity' | 'reason';

export type ReturnItem = { id: string; code: string; name: string };

// What a successful save hands back: the whole return with its refreshed line
// set (updateCustomerReturnLines returns the full invoice — the view replaces
// its node wholesale, no refetch).
export type ReturnLinesSaved = Extract<
  SaveReturnLinesResult,
  { kind: 'saved' }
>['node'];

export interface ReturnItemsModalProps {
  open: boolean;
  onClose: () => void;
  storeId: string;
  returnId: string;
  mode: ReturnItemsMode;
  /** UPDATE mode: the item to open on (from the clicked row). */
  initialItemId?: string;
  /** ADD mode: item ids already on the return, excluded from the search. */
  excludeItemIds: () => string[];
  /**
   * UPDATE mode: the item AFTER this one in the current on-screen order —
   * drives "OK & next". undefined = last item (OK only).
   */
  nextItem: (currentItemId: string) => ReturnItem | undefined;
  /** Resolve an item's descriptor from the current rows (update mode). */
  itemById: (id: string) => ReturnItem | undefined;
  /** A save landed — the view replaces its node with the returned one. */
  onSaved: (node: ReturnLinesSaved) => void;
  /** Existing line ids on the return, per item (seeds the drafts). */
  existingLineIds: () => ReadonlySet<string>;
  /** "Return from" — the customer the goods come back from (read-only). */
  returnFromName: string;
  /**
   * The shared return edit buffer — the modal's Customer-reference field
   * reads/writes theirReference through the same debounced save path as the
   * detail toolbar (one buffer across the whole entity).
   */
  edit: ReturnFieldEdit;
}

// Mount-while-open wrapper (the reference modal shape): the content mounts
// fresh per open; within one open it advances items itself.
export const ReturnItemsModal = (props: ReturnItemsModalProps): JSX.Element => (
  <Show
    when={props.open && (props.mode === 'add' ? 'add' : props.initialItemId)}
    keyed
  >
    {openKey => (
      <ReturnItemsContent
        onClose={props.onClose}
        storeId={props.storeId}
        returnId={props.returnId}
        mode={props.mode}
        initialItemId={props.mode === 'update' ? openKey : undefined}
        excludeItemIds={props.excludeItemIds}
        nextItem={props.nextItem}
        itemById={props.itemById}
        onSaved={props.onSaved}
        existingLineIds={props.existingLineIds}
        returnFromName={props.returnFromName}
        edit={props.edit}
      />
    )}
  </Show>
);

type ContentProps = Omit<ReturnItemsModalProps, 'open'>;

const ReturnItemsContent = (props: ContentProps): JSX.Element => {
  // Draft state as a STORE so editing one field of one line writes just that
  // path (kdd/state-management).
  const [draft, setDraft] = createStore<DraftReturnLine[]>([]);
  const [step, setStep] = createSignal<Step>('quantity');
  const [saving, setSaving] = createSignal(false);
  const [loadingLines, setLoadingLines] = createSignal(true);
  const [message, setMessage] = createSignal<
    { severity: 'error' | 'warning'; text: string } | undefined
  >();
  // Edit mode's confirm-to-remove path (OMS-REG-DIST-07.28): proceeding at zero quantity
  // warns once; the next OK applies the removal.
  const [zeroConfirmed, setZeroConfirmed] = createSignal(false);
  const [currentItem, setCurrentItem] = createSignal<ReturnItem>();

  const noItemYet = () => props.mode === 'add' && currentItem() === undefined;

  const tableConfig = createTableConfig({
    tableId: 'customer-return-line-edit',
  });

  // Seed the draft for one item: the return's existing lines for it (via
  // generateCustomerReturnLines' existingLinesInput — contract § draft-line
  // generation), or one blank row when it has none yet.
  const seedItem = async (item: ReturnItem) => {
    setCurrentItem(item);
    setStep('quantity');
    setMessage(undefined);
    setZeroConfirmed(false);
    setLoadingLines(true);
    const result = await graphqlFetch(GenerateCustomerReturnLines, {
      storeId: props.storeId,
      input: {
        outboundShipmentLineIds: [],
        existingLinesInput: { returnId: props.returnId, itemId: item.id },
      },
    });
    // The response union's only member is the connector, so any failure here
    // is the global unexpected-error modal's (spec: Unexpected API Errors) —
    // stay in the loading phase behind it rather than seeding a blank row.
    if (result.kind !== 'success') return;
    const seeded = seedDrafts(
      result.data.generateCustomerReturnLines.nodes,
      props.existingLineIds()
    );
    setDraft(
      reconcile(
        seeded.length > 0
          ? seeded
          : [
              blankDraft(
                { id: item.id, code: item.code, unitName: null },
                item.name
              ),
            ],
        { key: 'id' }
      )
    );
    setLoadingLines(false);
  };

  // The item lookup — live only in add mode, where it is the editor's starting
  // control (ui/utils/createFocusTarget).
  const itemSearch = createFocusTarget();

  onMount(() => {
    if (props.mode === 'add') itemSearch.focus();
    if (props.mode === 'update' && props.initialItemId) {
      const item = props.itemById(props.initialItemId);
      if (!item) return props.onClose();
      void seedItem(item);
    }
  });

  const backToSearch = () => {
    itemSearch.focus();
    setCurrentItem(undefined);
    setStep('quantity');
    setMessage(undefined);
    setZeroConfirmed(false);
    setDraft(reconcile([], { key: 'id' }));
  };

  // Edit ONE field of ONE line (fine-grained store write). Any edit clears the
  // step message and re-arms the zero-quantity warning.
  const update = <F extends keyof DraftReturnLine>(
    id: string,
    field: F,
    value: DraftReturnLine[F]
  ) => {
    const index = draft.findIndex(line => line.id === id);
    if (index >= 0) setDraft(index, field, value as never);
    setMessage(undefined);
    setZeroConfirmed(false);
  };

  const addBatch = () => {
    const item = currentItem();
    if (!item) return;
    setDraft(
      produce(lines =>
        lines.unshift(
          blankDraft(
            { id: item.id, code: item.code, unitName: null },
            item.name
          )
        )
      )
    );
  };

  // Step-1 gating (ui-surface S4; OMS-REG-DIST-07.28/.29's UI half):
  // - a returned line's pack size below one blocks;
  // - nothing to return AND nothing to delete → create-mode block;
  // - any EXISTING line zeroed → the save DELETES it, so warn-then-confirm —
  //   including the mixed case (other lines still carry quantity), where the
  //   zeroed line never reaches the reason step and would otherwise be removed
  //   silently (OMS-REG-DIST-07.28).
  const gateStep1 = (): boolean => {
    const drafts = draft.slice();
    if (validateStep1(drafts) === 'invalid-pack-size') {
      setMessage({
        severity: 'error',
        text: t('messages.alert-invalid-pack-size'),
      });
      return false;
    }
    const returning = reasonStepLines(drafts).length > 0;
    const removing = existingLinesBeingRemoved(drafts).length > 0;
    if (!returning && !removing) {
      setMessage({
        severity: 'error',
        text: t('messages.alert-zero-return-quantity'),
      });
      return false;
    }
    if (removing && !zeroConfirmed()) {
      setMessage({
        severity: 'warning',
        text: t('messages.zero-return-quantity-will-delete-lines'),
      });
      setZeroConfirmed(true);
      return false;
    }
    return true;
  };

  const onNextStep = () => {
    if (!gateStep1()) return;
    // Nothing with quantity (the confirmed zero-delete path) → save directly;
    // otherwise on to reasons.
    if (reasonStepLines(draft.slice()).length === 0) {
      void onOk();
      return;
    }
    setStep('reason');
    setMessage(undefined);
  };

  const save = async (): Promise<boolean> => {
    setSaving(true);
    setMessage(undefined);
    const result = await saveReturnLines(props.storeId, {
      customerReturnId: props.returnId,
      customerReturnLines: toLineInputs(draft.map(line => unwrap(line))),
    });
    setSaving(false);
    if (result.kind === 'failed') return false; // global modal showed it
    if (result.kind === 'error') {
      // Every rejection is non-typed (contract wire trap) — show the server's
      // message in the modal.
      setMessage({ severity: 'error', text: result.message });
      return false;
    }
    props.onSaved(result.node);
    return true;
  };

  const onOk = async () => {
    if (await save()) props.onClose();
  };

  // OK & next: save, then advance without closing — update mode steps to the
  // next item; add mode returns to the search (the saved item drops out via
  // the live excludeItemIds).
  const onOkNext = async () => {
    if (!(await save())) return;
    if (props.mode === 'add') {
      backToSearch();
      return;
    }
    const current = currentItem();
    const next = current && props.nextItem(current.id);
    if (next) await seedItem(next);
    else props.onClose();
  };

  const hasNext = () => {
    const current = currentItem();
    return props.mode === 'add' || (current && props.nextItem(current.id));
  };

  // Step-1 (quantity) and step-2 (reason) grids come from the shared column
  // builders in returnLineColumns.tsx — the same definitions back the
  // from-shipment create modal — wired to this modal's per-line `update`.
  const reasonRows = () => reasonStepLines(draft.slice());

  return (
    <Dialog
      open
      onClose={props.onClose}
      dismissable={!saving()}
      size="large"
      testId="add-item-modal"
      // Title: JUST the item lookup (the line-editor pattern — the reference
      // stocktake line editor and the inbound one). It costs the body no row of
      // its own, and the heading text would be redundant on a surface the user
      // reached by clicking Add item / a line. DISABLED in update mode, where
      // it simply names the item being edited (and a disabled input can't steal
      // the dialog's initial focus).
      title={
        <ItemSearch
          label={t('label.item')}
          hideLabel
          storeId={props.storeId}
          focusTarget={itemSearch}
          excludeItemIds={props.excludeItemIds()}
          value={currentItem()?.id}
          selectedItem={currentItem()}
          disabled={props.mode !== 'add'}
          onSelect={item =>
            item
              ? void seedItem({
                  id: item.id,
                  code: item.code,
                  name: item.name,
                })
              : backToSearch()
          }
          placeholder={t('placeholder.enter-an-item-code-or-name')}
        />
      }
      ariaLabel={t('heading.return-items')}
      // Add batch rides the header row's inline-end (the same line as the item
      // lookup) rather than taking a body row of its own: shown once an item is
      // picked, actionable only while entering quantities (ui-surface S4).
      headerActions={
        <Show when={!noItemYet()}>
          <Button
            icon={<PlusCircleIcon />}
            data-testid="add-batch-button"
            disabled={step() !== 'quantity'}
            onClick={addBatch}
          >
            {t('label.add-batch')}
          </Button>
        </Show>
      }
      actionsLead={
        <Show when={message()}>
          {m => <Alert severity={m().severity}>{m().text}</Alert>}
        </Show>
      }
      // The footer (ui-surface S4 § layout): Cancel (step 1) / Back (step 2) ·
      // Next step / Save · Save & next — the standard, icon-less dialog buttons
      // (D55): never OK / OK & next for a save, never an icon. Back and Next
      // step carry their own labels (outside "standard territory"), so they
      // stay plain icon-less Buttons.
      actions={
        <>
          <Show
            when={step() === 'reason'}
            fallback={
              <CancelButton
                data-testid="dialog-button-cancel"
                onClick={props.onClose}
              />
            }
          >
            <Button
              variant="secondary"
              data-testid="dialog-button-cancel"
              onClick={() => {
                setStep('quantity');
                setMessage(undefined);
              }}
            >
              {t('button.back')}
            </Button>
          </Show>
          <Show when={!noItemYet()}>
            <Switch>
              <Match when={step() === 'quantity'}>
                <Button
                  variant="primary"
                  loading={saving()}
                  data-testid="dialog-button-ok"
                  onClick={onNextStep}
                >
                  {t('button.next-step')}
                </Button>
              </Match>
              <Match when={step() === 'reason'}>
                <DialogSaveButton
                  loading={saving()}
                  data-testid="dialog-button-ok"
                  onClick={() => void onOk()}
                />
              </Match>
            </Switch>
            {/* OK & next is actionable only on the reason step with a next
                item to advance to; anywhere else the action is permanently
                dead in-context (the quantity step can't save-and-advance, the
                last item has nowhere to advance to), so it's HIDDEN, not
                disabled — the blocked-affordances ladder (D39). */}
            <Show when={step() === 'reason' && hasNext()}>
              <SaveAndNextButton
                loading={saving()}
                data-testid="dialog-button-next-and-ok"
                onClick={() => void onOkNext()}
              />
            </Show>
          </Show>
        </>
      }
    >
      {/* Before an item is picked (the lookup lives in the dialog title): the
          shared centred prompt in place of the grid — the reference line
          editor's treatment. */}
      <Show
        when={!noItemYet()}
        fallback={
          <EmptyState
            graphic={false}
            message={t('messages.select-item-to-return')}
          />
        }
      >
        {/* The wizard's step indicator — the shared determinate progress list,
            which the two-step flow maps onto directly: reaching the reason step
            completes "Select quantity" and starts "Select reason" (ui-surface S4
            § layout). Capped to a reading measure (the content-measure role): the
            list divides its width between steps, so left full-bleed in this
            workbench-width dialog the two markers fly to opposite edges with a
            metre of connector between them. */}
        <ContentContainer size="form">
          <ProgressList
            variant="secondary"
            steps={[
              {
                label: t('label.select-quantity'),
                started: true,
                finished: step() === 'reason',
              },
              {
                label: t('label.select-reason'),
                started: step() === 'reason',
                finished: false,
              },
            ]}
          />
        </ContentContainer>
        {/* Under the stepper (the current app's ReturnSteps row): who the goods
            come back from and the return's customer reference — a header FIELD
            CLUSTER, each field labelled above its control, with the read-only
            fact as a `field`-variant LabelledValue so it sits flush beside the
            editable one.

            A generic HStack, NOT the two-up FormRow the page-header cluster
            (`HeaderToolbar`) uses: that shares the row equally between its
            fields, which is right for a page header spanning the viewport but
            stretches a short reference field across a workbench-width dialog.
            Here the fields size to themselves (the TextField keeps its own
            `short` cap) and the pair hugs the inline-start, wrapping when the
            dialog goes full-screen. The reference edits through the shared
            debounced buffer, the same save path as the detail toolbar. */}
        <HStack gap="lg" align="start" wrap>
          <LabelledValue
            label={t('label.return-from')}
            variant="field"
            size="small"
          >
            {props.returnFromName}
          </LabelledValue>
          <TextField
            label={t('label.customer-ref')}
            size="small"
            value={props.edit.state.theirReference}
            onInput={e =>
              props.edit.setField('theirReference', e.currentTarget.value)
            }
            onBlur={() => props.edit.flush()}
          />
        </HStack>
        <Show
          when={step() === 'reason'}
          fallback={
            <DataTable
              columns={quantityColumns(update)}
              rows={draft.filter(() => true)}
              rowKey={line => line.id}
              loading={loadingLines()}
              showFullScreen={false}
              minBodyRem={20}
              config={tableConfig.config()}
              setConfig={tableConfig.setConfig}
              emptyMessage={t('error.no-customer-return-items')}
            />
          }
        >
          <DataTable
            columns={reasonColumns(update)}
            rows={reasonRows()}
            rowKey={line => line.id}
            showFullScreen={false}
            minBodyRem={20}
            config={tableConfig.config()}
            setConfig={tableConfig.setConfig}
            emptyMessage={t('error.no-customer-return-items')}
          />
        </Show>
      </Show>
    </Dialog>
  );
};

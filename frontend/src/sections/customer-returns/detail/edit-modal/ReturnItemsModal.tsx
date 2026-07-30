import { createSignal, Match, onMount, Show, Switch, type JSX } from 'solid-js';
import { createStore, produce, reconcile, unwrap } from 'solid-js/store';
import { graphqlFetch } from '../../../../api/graphql';
import { t } from '../../../../intl';
import { Dialog } from '../../../../ui/elements/feedback/Dialog';
import {
  createFocusTarget,
  createFocusTargets,
} from '../../../../ui/utils/createFocusTarget';
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
import { saveReturnLines } from '../returnUpdate';
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

export interface ReturnItemsModalProps {
  open: boolean;
  onClose: () => void;
  storeId: string;
  returnId: string;
  mode: ReturnItemsMode;
  /** UPDATE mode: the item to open on (from the clicked row). */
  initialItemId?: string;
  /**
   * UPDATE mode: the clicked row's LINE id — the batch to focus once the item's
   * rows load. An item can hold several batches, so the item id alone doesn't
   * say which row the user meant. Unused for "Add item", and after a
   * "Save & next" advance (which focuses the new item's first row).
   */
  initialLineId?: string;
  /**
   * "Save & next": resolve the next item to edit. Owned by the PARENT detail
   * view, because the line table is server-paginated — the next item may sit on
   * a later page, and finding it pages the visible table forward (spec rules §
   * line rules, OMS-REG-DIST-07.49). `covered` is every item stepped through
   * this run, so a re-appearing item is never offered twice. undefined = the
   * walk is exhausted, and the editor drops into add mode.
   */
  nextItem: (
    currentItemId: string,
    covered: Set<string>
  ) => Promise<ReturnItem | undefined>;
  /** Resolve an item's descriptor from the current rows (update mode). */
  itemById: (id: string) => ReturnItem | undefined;
  /** A save landed — the view refetches the line table's current page. */
  onSaved: () => void;
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
        initialLineId={props.initialLineId}
        nextItem={props.nextItem}
        itemById={props.itemById}
        onSaved={props.onSaved}
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
    | {
        severity: 'error' | 'warning';
        text: string;
        /** Test hook: which block this is (e2e/TESTIDS.md). */
        kind: 'pack-size' | 'zero-quantity' | 'save-error';
      }
    | undefined
  >();
  // Edit mode's confirm-to-remove path (OMS-REG-DIST-07.28): proceeding at
  // zero quantity warns once; the next OK applies the removal.
  const [zeroConfirmed, setZeroConfirmed] = createSignal(false);
  const [currentItem, setCurrentItem] = createSignal<ReturnItem>();
  // The editor's OWN add/update state, seeded from how it was opened (an item
  // to open on = update) but not pinned to it: an update-mode "Save & next"
  // walk that runs out of items drops into add mode rather than closing (spec
  // rules § line rules, OMS-REG-DIST-07.49). It only ever flips update → add.
  // Every mode read below goes through this signal.
  const [mode, setMode] = createSignal<ReturnItemsMode>(
    props.initialItemId ? 'update' : 'add'
  );
  // Items stepped through this "Save & next" run, the current one included —
  // handed to the parent's walk so a re-appearing item is never offered twice,
  // across pages too.
  const coveredItemIds = new Set<string>();

  const noItemYet = () => mode() === 'add' && currentItem() === undefined;

  const tableConfig = createTableConfig({
    tableId: 'customer-return-line-edit',
  });

  // Seed the draft for one item: the return's existing lines for it (via
  // generateCustomerReturnLines' existingLinesInput — contract § draft-line
  // generation), or one blank row when it has none yet. This is the ONE path
  // into an item, whether it came from a row click, the item search, or a
  // "Save & next" advance — so picking an item already on the return loads its
  // existing batch set instead of starting a duplicate (OMS-REG-DIST-07.48).
  //
  // `focusLineId` is the row the user clicked in the detail table, when the
  // editor opened from one: focus lands on THAT batch's quantity field rather
  // than the item's first, since a return with several batches of one item is
  // otherwise ambiguous. Falls back to the first row.
  const seedItem = async (item: ReturnItem, focusLineId?: string) => {
    setCurrentItem(item);
    coveredItemIds.add(item.id);
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
    const generated = result.data.generateCustomerReturnLines.nodes;
    // EVERY line existingLinesInput returns is already on the return (contract
    // § draft-line generation), so the whole seed is `existing` — which is what
    // decides that zeroing one deletes it rather than dropping it. We can't ask
    // the detail table instead: it holds one server page, not the return's
    // whole line set (spec contract § server-paginated line table).
    const seeded = seedDrafts(generated, new Set(generated.map(l => l.id)));
    const rows =
      seeded.length > 0
        ? seeded
        : [
            blankDraft(
              { id: item.id, code: item.code, unitName: null },
              item.name
            ),
          ];
    setDraft(reconcile(rows, { key: 'id' }));
    setLoadingLines(false);
    // Armed, not applied: the request lands when the grid attaches, so there is
    // no load gate to coordinate here (ui/utils/createFocusTarget).
    quantityFields.focus(focusLineId ?? rows[0]?.id ?? '');
  };

  // The item lookup — live only in add mode, where it is the editor's starting
  // control (ui/utils/createFocusTarget).
  const itemSearch = createFocusTarget();
  // One target per DRAFT ROW, per step: focus follows the user to the control
  // they came to change (the stocktake / inbound line-editor rule).
  const quantityFields = createFocusTargets();
  const reasonFields = createFocusTargets();

  // Seed on mount: a row open starts on its item — focusing the clicked batch;
  // an add open starts in the empty search state, focusing the item selector.
  onMount(() => {
    const id = props.initialItemId;
    if (!id) return itemSearch.focus();
    const item = props.itemById(id);
    if (!item) return props.onClose();
    void seedItem(item, props.initialLineId);
  });

  // Back to the empty item-search state. Reached by clearing the selection, by
  // "Save & next" in add mode, and when an update walk runs out of items — so
  // it always lands in ADD mode from here on.
  const backToSearch = () => {
    setMode('add');
    setCurrentItem(undefined);
    setStep('quantity');
    setMessage(undefined);
    setZeroConfirmed(false);
    setDraft(reconcile([], { key: 'id' }));
    itemSearch.focus();
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

  // Add batch: a blank row at the TOP of the grid, focused straight away — the
  // whole point of the action is to type into it (the inbound editor's rule).
  const addBatch = () => {
    const item = currentItem();
    if (!item) return;
    const batch = blankDraft(
      { id: item.id, code: item.code, unitName: null },
      item.name
    );
    setDraft(produce(lines => lines.unshift(batch)));
    quantityFields.focus(batch.id);
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
        kind: 'pack-size',
        text: t('messages.alert-invalid-pack-size'),
      });
      return false;
    }
    const returning = reasonStepLines(drafts).length > 0;
    const removing = existingLinesBeingRemoved(drafts).length > 0;
    if (!returning && !removing) {
      setMessage({
        severity: 'error',
        kind: 'zero-quantity',
        text: t('messages.alert-zero-return-quantity'),
      });
      return false;
    }
    if (removing && !zeroConfirmed()) {
      setMessage({
        severity: 'warning',
        kind: 'zero-quantity',
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
    const carried = reasonStepLines(draft.slice());
    if (carried.length === 0) {
      void onOk();
      return;
    }
    setStep('reason');
    setMessage(undefined);
    // The reason step's first picker is what this step is for — the Next-step
    // button the click came from has become Save.
    reasonFields.focus(carried[0]?.id ?? '');
  };

  // Back to the quantity step: focus returns to the first quantity field, the
  // control that step is for.
  const backToQuantity = () => {
    setStep('quantity');
    setMessage(undefined);
    quantityFields.focus(draft[0]?.id ?? '');
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
      setMessage({ severity: 'error', kind: 'save-error', text: result.message });
      return false;
    }
    // The parent refetches the line table's current page; the mutation's own
    // line set is never spliced into a held list (spec rules § server-paginated
    // line table).
    props.onSaved();
    return true;
  };

  const onOk = async () => {
    if (await save()) props.onClose();
  };

  // "Save & next": save, then — on success only — advance without closing. A
  // failed save stays put.
  // - ADD: back to the empty item search for another item.
  // - UPDATE: ask the PARENT for the next item (it pages the detail table
  //   forward as needed, guarding repeats with the covered set). Got one → seed
  //   it in place, no remount. None left → the walk is exhausted, so drop into
  //   add mode rather than closing (OMS-REG-DIST-07.49).
  const onOkNext = async () => {
    if (!(await save())) return;
    if (mode() === 'add') {
      backToSearch();
      return;
    }
    const current = currentItem();
    const next = current
      ? await props.nextItem(current.id, coveredItemIds)
      : undefined;
    if (next) await seedItem(next);
    else backToSearch(); // exhausted → add mode
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
      // the dialog's initial focus) — keyed off mode(), so an exhausted walk's
      // drop into add mode makes it live.
      //
      // NO excludeItemIds: the search offers the whole addable catalogue,
      // including items already on the return (issue #428, decided at review —
      // spec rules § line rules, OMS-REG-DIST-07.48). Picking one goes through
      // seedItem like any other, which loads that item's existing batch set, so
      // a second visit edits rather than duplicating.
      title={
        <ItemSearch
          label={t('label.item')}
          hideLabel
          storeId={props.storeId}
          focusTarget={itemSearch}
          value={currentItem()?.id}
          selectedItem={currentItem()}
          disabled={mode() !== 'add'}
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
          {m => (
            <Alert
              severity={m().severity}
              testId={
                m().kind === 'save-error' ? 'save-error-alert' : `${m().kind}-alert`
              }
            >
              {m().text}
            </Alert>
          )}
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
              onClick={backToQuantity}
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
            {/* Save & next lives on the REASON step only — the quantity step
                can't save-and-advance, so the action is permanently dead there
                and is HIDDEN rather than disabled (blocked-affordances ladder,
                D39). It is NOT gated on there being a next item: the walk is a
                cross-page one the parent resolves asynchronously, and running
                out is a legitimate outcome — the editor drops into add mode
                (OMS-REG-DIST-07.49). */}
            <Show when={step() === 'reason'}>
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
              columns={quantityColumns(update, quantityFields)}
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
            columns={reasonColumns(update, reasonFields)}
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

import { createSignal, Match, onMount, Show, Switch, type JSX } from 'solid-js';
import { createStore, produce, reconcile, unwrap } from 'solid-js/store';
import { graphqlFetch } from '../../../../api/graphql';
import { t } from '../../../../intl';
import { Dialog } from '../../../../ui/elements/feedback/Dialog';
import { createFocusTarget } from '../../../../ui/utils/createFocusTarget';
import { Alert } from '../../../../ui/elements/feedback/Alert';
import { Button } from '../../../../ui/elements/buttons/Button';
import { TextField } from '../../../../ui/elements/inputs/TextField';
import { FieldRow } from '../../../../ui/elements/inputs/FieldRow';
import { Text } from '../../../../ui/elements/typography/Text';
import { DataTable } from '../../../../ui/elements/table/DataTable';
import { createTableConfig } from '../../../../api/createTableConfig';
import { ItemSearch } from '../../../../domain/item';
import { ProgressList } from '../../../../ui/sync/ProgressList';
import {
  ArrowRightIcon,
  CheckIcon,
  PlusCircleIcon,
  XCircleIcon,
} from '../../../../ui/icons';
import { GenerateCustomerReturnLines } from '../customerReturnDetail.generated';
import styles from './ReturnItemsModal.module.css';
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
// one save upserts the item's whole batch set (rules § line rules, AC-E1–E4).
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
  // Edit mode's confirm-to-remove path (AC-E2): proceeding at zero quantity
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
          : [blankDraft({ id: item.id, code: item.code, unitName: null })],
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
          blankDraft({ id: item.id, code: item.code, unitName: null })
        )
      )
    );
  };

  // Step-1 gating (ui-surface S4; AC-E2/E3's UI half):
  // - a returned line's pack size below one blocks;
  // - nothing to return AND nothing to delete → create-mode block;
  // - any EXISTING line zeroed → the save DELETES it, so warn-then-confirm —
  //   including the mixed case (other lines still carry quantity), where the
  //   zeroed line never reaches the reason step and would otherwise be removed
  //   silently (AC-E2).
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
      title={t('heading.return-items')}
      actionsLead={
        <Show when={message()}>
          {m => <Alert severity={m().severity}>{m().text}</Alert>}
        </Show>
      }
      actions={
        <>
          <Show
            when={step() === 'reason'}
            fallback={
              <Button
                variant="secondary"
                icon={<XCircleIcon />}
                data-testid="dialog-button-cancel"
                onClick={props.onClose}
              >
                {t('button.cancel')}
              </Button>
            }
          >
            <Button
              variant="secondary"
              icon={<XCircleIcon />}
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
                  icon={<ArrowRightIcon />}
                  loading={saving()}
                  data-testid="dialog-button-ok"
                  onClick={onNextStep}
                >
                  {t('button.next-step')}
                </Button>
              </Match>
              <Match when={step() === 'reason'}>
                <Button
                  icon={<CheckIcon />}
                  loading={saving()}
                  data-testid="dialog-button-ok"
                  onClick={() => void onOk()}
                >
                  {t('button.ok')}
                </Button>
              </Match>
            </Switch>
            {/* OK & next is actionable only on the reason step with a next
                item to advance to; anywhere else the action is permanently
                dead in-context (the quantity step can't save-and-advance, the
                last item has nowhere to advance to), so it's HIDDEN, not
                disabled — the blocked-affordances ladder (D39). */}
            <Show when={step() === 'reason' && hasNext()}>
              <Button
                icon={<ArrowRightIcon />}
                loading={saving()}
                data-testid="dialog-button-next-and-ok"
                onClick={() => void onOkNext()}
              >
                {t('button.ok-and-next')}
              </Button>
            </Show>
          </Show>
        </>
      }
    >
      {/* Item row under the plain "Return items" title (the current app's
          layout, and the outbound line editor's pattern): the labelled
          catalogue lookup — live in add mode, locked to the row's item in
          update mode. */}
      <ItemSearch
        label={t('label.item')}
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
      <Show
        when={!noItemYet()}
        fallback={
          <p style={{ color: 'var(--text-secondary)' }}>
            {t('placeholder.enter-an-item-code-or-name')}
          </p>
        }
      >
        {/* The wizard's step indicator — the shared determinate progress list
            (the sync stepper), which the two-step flow maps onto directly:
            reaching the reason step completes "Select quantity" and starts
            "Select reason" (ui-surface S4 § layout). */}
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
        {/* Under the stepper (the current app's ReturnSteps row): who the
            goods come back from (read-only) and the return's customer
            reference — edited through the shared debounced buffer, the same
            save path as the detail toolbar. One field per row below the
            compact breakpoint (where the modal is full-screen) — module CSS. */}
        <div class={styles.contextRow}>
          <FieldRow label={t('label.return-from')}>
            <Text variant="body">{props.returnFromName}</Text>
          </FieldRow>
          <FieldRow label={t('label.customer-ref')}>
            <TextField
              label={t('label.customer-ref')}
              hideLabel
              size="small"
              value={props.edit.state.theirReference}
              onInput={e =>
                props.edit.setField('theirReference', e.currentTarget.value)
              }
              onBlur={() => props.edit.flush()}
            />
          </FieldRow>
        </div>
        {/* Add batch on its own row, inline-end aligned (the current app's
            AddBatchButton row): present on both steps, actionable only while
            entering quantities in per-item mode. Default (primary) tone —
            brand icon, dark label. */}
        <div
          style={{
            display: 'flex',
            'justify-content': 'flex-end',
            'margin-block-end': 'var(--space-2)',
          }}
        >
          <Button
            icon={<PlusCircleIcon />}
            data-testid="add-batch-button"
            disabled={step() !== 'quantity'}
            onClick={addBatch}
          >
            {t('label.add-batch')}
          </Button>
        </div>
        <Show
          when={step() === 'reason'}
          fallback={
            <DataTable
              columns={quantityColumns(update)}
              rows={draft.filter(() => true)}
              rowKey={line => line.id}
              loading={loadingLines()}
              showFullScreen={false}
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
            config={tableConfig.config()}
            setConfig={tableConfig.setConfig}
            emptyMessage={t('error.no-customer-return-items')}
          />
        </Show>
      </Show>
    </Dialog>
  );
};

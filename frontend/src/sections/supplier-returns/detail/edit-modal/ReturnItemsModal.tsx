import { createSignal, Match, onMount, Show, Switch, type JSX } from 'solid-js';
import { createStore, reconcile, unwrap } from 'solid-js/store';
import { graphqlFetch } from '../../../../api/graphql';
import { t } from '../../../../intl';
import { Dialog } from '../../../../ui/elements/feedback/Dialog';
import { Alert } from '../../../../ui/elements/feedback/Alert';
import { Button } from '../../../../ui/elements/buttons/Button';
import { TextField } from '../../../../ui/elements/inputs/TextField';
import { FieldRow } from '../../../../ui/elements/inputs/FieldRow';
import { Text } from '../../../../ui/elements/typography/Text';
import { DataTable } from '../../../../ui/elements/table/DataTable';
import { createTableConfig } from '../../../../api/createTableConfig';
import { ItemSearch } from '../../../../domain/item';
import { ProgressList } from '../../../../ui/sync/ProgressList';
import { GenerateSupplierReturnLines } from '../supplierReturnDetail.generated';
import styles from './ReturnItemsModal.module.css';
import { saveReturnLines, type SaveReturnLinesResult } from '../returnUpdate';
import type { ReturnFieldEdit } from '../returnEdit';
import {
  existingLinesBeingRemoved,
  reasonStepLines,
  seedDrafts,
  toLineInputs,
  type DraftReturnLine,
} from './returnLineLogic';
import { quantityColumns, reasonColumns } from './returnLineColumns';

// S4 — the return-items modal (spec/supplier-returns/ui-surface.md S4): the
// single surface for entering what goes back, per item on an existing return. A
// two-step wizard — Select quantity → Select reason — over a draft store; one
// save upserts the item's whole batch set (rules § line rules; REPL-06 .31/.32,
// SRN-001 .2/.7).
//
// A supplier-return line is always an EXISTING stock line, so there is no
// Add-batch action (ui-surface S4) — the draft rows are exactly the item's
// available stock lines, plus any this return already holds. The from-shipment
// creation flow is a separate host (ReturnFromShipmentModal).

export type ReturnItemsMode = 'add' | 'update';

type Step = 'quantity' | 'reason';

export type ReturnItem = { id: string; code: string; name: string };

// What a successful save hands back: the whole return with its refreshed line
// set (updateSupplierReturnLines returns the full invoice — the view replaces
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
   * drives "Save & next". undefined = last item (Save only).
   */
  nextItem: (currentItemId: string) => ReturnItem | undefined;
  /** Resolve an item's descriptor from the current rows (update mode). */
  itemById: (id: string) => ReturnItem | undefined;
  /** A save landed — the view replaces its node with the returned one. */
  onSaved: (node: ReturnLinesSaved) => void;
  /** Existing line ids on the return (seeds the drafts' `existing` flag). */
  existingLineIds: () => ReadonlySet<string>;
  /** "Return to" — the supplier the goods go back to (read-only). */
  returnToName: string;
  /**
   * The shared return edit buffer — the modal's Supplier-reference field
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
        returnToName={props.returnToName}
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
  // Edit mode's confirm-to-remove path (REPL-06 .32): proceeding at zero
  // quantity warns once; the next Save applies the removal.
  const [zeroConfirmed, setZeroConfirmed] = createSignal(false);
  const [currentItem, setCurrentItem] = createSignal<ReturnItem>();

  const noItemYet = () => props.mode === 'add' && currentItem() === undefined;

  const tableConfig = createTableConfig({
    tableId: 'supplier-return-line-edit',
  });

  // Seed the draft for one item: the item's available stock lines plus any the
  // return already holds (via generateSupplierReturnLines' itemId + returnId —
  // contract § draft-line generation). No blank fallback — supplier-return
  // lines are existing stock lines only.
  const seedItem = async (item: ReturnItem) => {
    setCurrentItem(item);
    setStep('quantity');
    setMessage(undefined);
    setZeroConfirmed(false);
    setLoadingLines(true);
    const result = await graphqlFetch(GenerateSupplierReturnLines, {
      storeId: props.storeId,
      input: { stockLineIds: [], itemId: item.id, returnId: props.returnId },
    });
    // The response union's only member is the connector, so any failure here is
    // the global unexpected-error modal's — stay in the loading phase behind
    // it.
    if (result.kind !== 'success') return;
    const seeded = seedDrafts(
      result.data.generateSupplierReturnLines.nodes,
      props.existingLineIds()
    );
    setDraft(reconcile(seeded, { key: 'id' }));
    setLoadingLines(false);
  };

  onMount(() => {
    if (props.mode === 'update' && props.initialItemId) {
      const item = props.itemById(props.initialItemId);
      if (!item) return props.onClose();
      void seedItem(item);
    }
  });

  const backToSearch = () => {
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

  // Step-1 gating (ui-surface S4; the zero-quantity notices — REPL-06 .29/.32):
  // - nothing to return AND nothing to delete → create/add-mode block;
  // - any EXISTING line zeroed → the save DELETES it, so warn-then-confirm —
  //   including the mixed case (other lines still carry quantity), where the
  //   zeroed line never reaches the reason step and would otherwise be removed
  //   silently (REPL-06 .32).
  const gateStep1 = (): boolean => {
    const drafts = draft.slice();
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
      void onSave();
      return;
    }
    setStep('reason');
    setMessage(undefined);
  };

  const save = async (): Promise<boolean> => {
    setSaving(true);
    setMessage(undefined);
    const result = await saveReturnLines(props.storeId, {
      supplierReturnId: props.returnId,
      supplierReturnLines: toLineInputs(draft.map(line => unwrap(line))),
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

  const onSave = async () => {
    if (await save()) props.onClose();
  };

  // Save & next: save, then advance without closing — update mode steps to the
  // next item; add mode returns to the search (the saved item drops out via the
  // live excludeItemIds).
  const onSaveNext = async () => {
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
        // D55 — dialog footers are icon-less verbs: Cancel / Back / Next step /
        // Save / Save & next (never OK / OK & next).
        <>
          <Show
            when={step() === 'reason'}
            fallback={
              <Button
                variant="secondary"
                data-testid="dialog-button-cancel"
                onClick={props.onClose}
              >
                {t('button.cancel')}
              </Button>
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
                  loading={saving()}
                  data-testid="dialog-button-ok"
                  onClick={onNextStep}
                >
                  {t('button.next-step')}
                </Button>
              </Match>
              <Match when={step() === 'reason'}>
                <Button
                  loading={saving()}
                  data-testid="dialog-button-ok"
                  onClick={() => void onSave()}
                >
                  {t('button.save')}
                </Button>
              </Match>
            </Switch>
            {/* Save & next is actionable only on the reason step with a next
                item to advance to; anywhere else the action is permanently dead
                in-context, so it's HIDDEN, not disabled — the blocked-
                affordances ladder (D39). */}
            <Show when={step() === 'reason' && hasNext()}>
              <Button
                loading={saving()}
                data-testid="dialog-button-next-and-ok"
                onClick={() => void onSaveNext()}
              >
                {t('button.save-and-next')}
              </Button>
            </Show>
          </Show>
        </>
      }
    >
      {/* Item row under the "Return items" title: the labelled catalogue lookup
          — live in add mode (ALL available items, not narrowed to the supplier —
          SRN-001 .1), locked to the row's item in update mode. */}
      <ItemSearch
        label={t('label.item')}
        storeId={props.storeId}
        excludeItemIds={props.excludeItemIds()}
        value={currentItem()?.id}
        selectedItem={currentItem()}
        disabled={props.mode !== 'add'}
        onSelect={item =>
          item
            ? void seedItem({ id: item.id, code: item.code, name: item.name })
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
        {/* The wizard's step indicator — the shared determinate progress list:
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
        {/* Context row: who the goods go back to (read-only) and the return's
            supplier reference — edited through the shared debounced buffer, the
            same save path as the detail toolbar. */}
        <div class={styles.contextRow}>
          <FieldRow label={t('label.return-to')}>
            <Text variant="body">{props.returnToName}</Text>
          </FieldRow>
          <FieldRow label={t('label.supplier-reference')}>
            <TextField
              label={t('label.supplier-reference')}
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
        {/* No Add-batch action — supplier-return lines are existing stock lines,
            not invented batches (ui-surface S4). */}
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
              emptyMessage={t('error.no-supplier-return-items')}
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
            emptyMessage={t('error.no-supplier-return-items')}
          />
        </Show>
      </Show>
    </Dialog>
  );
};

import { createSignal, Match, onMount, Show, Switch, type JSX } from 'solid-js';
import { createStore, produce, reconcile, unwrap } from 'solid-js/store';
import { graphqlFetch } from '../../../../api/graphql';
import { t } from '../../../../intl';
import { Dialog } from '../../../../ui/elements/feedback/Dialog';
import { Alert } from '../../../../ui/elements/feedback/Alert';
import { Button } from '../../../../ui/elements/buttons/Button';
import { TextField } from '../../../../ui/elements/inputs/TextField';
import { NumberField } from '../../../../ui/elements/inputs/NumberField';
import { FieldRow } from '../../../../ui/elements/inputs/FieldRow';
import { Text } from '../../../../ui/elements/typography/Text';
import {
  DataTable,
  type Column,
} from '../../../../ui/elements/table/DataTable';
import {
  getDateCell,
  getNumberCell,
} from '../../../../ui/elements/table/tableHelpers';
import { createTableConfig } from '../../../../api/createTableConfig';
import { ItemSearch } from '../../../../domain/item';
import { ReasonSelect } from '../../../../domain/reasonOptions';
import { ProgressList } from '../../../../ui/sync/ProgressList';
import {
  ArrowRightIcon,
  CheckIcon,
  PlusCircleIcon,
  XCircleIcon,
} from '../../../../ui/icons';
import { GenerateCustomerReturnLines } from '../customerReturnDetail.generated';
import { saveReturnLines, type SaveReturnLinesResult } from '../returnUpdate';
import type { ReturnFieldEdit } from '../returnEdit';
import {
  blankDraft,
  clampQuantity,
  reasonStepLines,
  seedDrafts,
  toLineInputs,
  validateStep1,
  zeroQuantityDeletes,
  type DraftReturnLine,
} from './returnLineLogic';

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
    const generated =
      result.kind === 'success' &&
      result.data.generateCustomerReturnLines.__typename ===
        'GeneratedCustomerReturnLineConnector'
        ? result.data.generateCustomerReturnLines.nodes
        : [];
    const seeded = seedDrafts(generated, props.existingLineIds());
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

  // Step-1 gating (ui-surface S4; AC-E2/E3's UI half): no quantity → create
  // mode blocks, edit mode warns-then-confirms (the zero save DELETES the
  // existing lines); a returned line's pack size below one blocks.
  const gateStep1 = (): boolean => {
    const verdict = validateStep1(draft.slice());
    if (verdict === 'invalid-pack-size') {
      setMessage({
        severity: 'error',
        text: t('messages.alert-invalid-pack-size'),
      });
      return false;
    }
    if (verdict === 'no-quantity') {
      if (zeroQuantityDeletes(draft.slice()) && !zeroConfirmed()) {
        setMessage({
          severity: 'warning',
          text: t('messages.zero-return-quantity-will-delete-lines'),
        });
        setZeroConfirmed(true);
        return false;
      }
      if (!zeroQuantityDeletes(draft.slice())) {
        setMessage({
          severity: 'error',
          text: t('messages.alert-zero-return-quantity'),
        });
        return false;
      }
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

  // ---- Step 1 columns: the quantity grid (ui-surface S4 § step 1) ----
  const quantityColumns = (): Column<DraftReturnLine, never>[] => [
    {
      c: { key: 'itemCode' },
      header: t('label.code'),
    },
    {
      c: { key: 'itemName' },
      header: t('label.name'),
      meta: { card: { region: 'primary' }, wrapLines: 2 },
    },
    {
      c: { key: 'batch' },
      header: t('label.batch'),
      cell: info => {
        const line = info.row.original;
        return (
          <TextField
            label={t('label.batch')}
            hideLabel
            size="small"
            value={line.batch ?? ''}
            onInput={e =>
              update(line.id, 'batch', e.currentTarget.value || null)
            }
          />
        );
      },
    },
    {
      c: { key: 'expiryDate' },
      header: t('label.expiry'),
      cell: info => {
        const line = info.row.original;
        return (
          <TextField
            label={t('label.expiry')}
            hideLabel
            size="small"
            type="date"
            value={line.expiryDate ?? ''}
            onInput={e =>
              update(line.id, 'expiryDate', e.currentTarget.value || null)
            }
          />
        );
      },
    },
    {
      // Packs issued: context from the originating shipment line — present on
      // from-shipment drafts only (contract § draft-line generation); blank on
      // per-item drafts. Read-only.
      c: { key: 'numberOfPacksIssued' },
      header: t('label.pack-quantity-issued'),
      ...getNumberCell(),
    },
    {
      c: { key: 'packSize' },
      header: t('label.pack-size'),
      ...getNumberCell(),
      // NumberField (not a raw controlled input): it clamps to min/max and
      // repairs the DOM when a keystroke is rejected — the §13 pitfall
      // (kdd/solid-reactivity-pitfalls) a plain value= binding would hit.
      cell: info => {
        const line = info.row.original;
        return (
          <NumberField
            label={t('label.pack-size')}
            hideLabel
            size="small"
            min={1}
            decimalLimit={2}
            value={line.packSize}
            onChange={value => update(line.id, 'packSize', value ?? 1)}
          />
        );
      },
    },
    {
      // Quantity returned: min 0; capped at packs issued where known — a
      // UI-only cap (rules § creation; AC-E5).
      c: { key: 'numberOfPacksReturned' },
      header: t('label.quantity-returned'),
      ...getNumberCell(),
      cell: info => {
        const line = info.row.original;
        return (
          <NumberField
            label={t('label.quantity-returned')}
            hideLabel
            size="small"
            min={0}
            max={line.numberOfPacksIssued ?? undefined}
            decimalLimit={2}
            value={line.numberOfPacksReturned}
            onChange={value =>
              update(
                line.id,
                'numberOfPacksReturned',
                clampQuantity(value ?? 0, line.numberOfPacksIssued)
              )
            }
          />
        );
      },
    },
    {
      c: { key: 'volumePerPack' },
      header: t('label.volume-per-pack'),
      ...getNumberCell(),
      cell: info => {
        const line = info.row.original;
        return (
          <NumberField
            label={t('label.volume-per-pack')}
            hideLabel
            size="small"
            min={0}
            decimalLimit={4}
            value={line.volumePerPack}
            onChange={value => update(line.id, 'volumePerPack', value ?? 0)}
          />
        );
      },
    },
  ];

  // ---- Step 2 columns: the reason grid — only lines with quantity
  // (ui-surface S4 § step 2). Reason optional; options are the active RETURN
  // reasons (rules § line rules, AC-E4). ----
  const reasonColumns = (): Column<DraftReturnLine, never>[] => [
    { c: { key: 'itemCode' }, header: t('label.code') },
    {
      c: { key: 'itemName' },
      header: t('label.name'),
      meta: { card: { region: 'primary' }, wrapLines: 2 },
    },
    { c: { key: 'batch' }, header: t('label.batch') },
    {
      // Expiry, read-only here (edited in the quantity step) — matches the
      // current app's reason-step table (ReturnReasonsTable: batch · expiry ·
      // reason · comment; no quantity column).
      c: { key: 'expiryDate' },
      header: t('label.expiry'),
      ...getDateCell(),
    },
    {
      c: { id: 'returnReasonInput' },
      header: t('label.reason'),
      cell: info => {
        const line = info.row.original;
        return (
          <ReasonSelect
            kind="return"
            label={t('label.reason')}
            hideLabel
            value={line.reasonId ?? undefined}
            onChange={reason => update(line.id, 'reasonId', reason?.id ?? null)}
          />
        );
      },
    },
    {
      c: { key: 'note' },
      header: t('label.comment'),
      cell: info => {
        const line = info.row.original;
        return (
          <TextField
            label={t('label.comment')}
            hideLabel
            size="small"
            value={line.note ?? ''}
            onInput={e =>
              update(line.id, 'note', e.currentTarget.value || null)
            }
          />
        );
      },
    },
  ];

  const reasonRows = () => reasonStepLines(draft.slice());

  return (
    <Dialog
      open
      onClose={props.onClose}
      dismissable={!saving()}
      size="large"
      testId="add-item-modal"
      title={
        props.mode === 'add' ? (
          <ItemSearch
            label={t('heading.return-items')}
            hideLabel
            storeId={props.storeId}
            excludeItemIds={props.excludeItemIds()}
            value={currentItem()?.id}
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
        ) : (
          t('heading.return-items')
        )
      }
      ariaLabel={props.mode === 'add' ? t('heading.return-items') : undefined}
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
                disabled — the blocked-affordances ladder (D25). */}
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
            save path as the detail toolbar. */}
        <div
          style={{
            display: 'flex',
            gap: 'var(--space-6)',
            'align-items': 'center',
            'margin-block': 'var(--space-2)',
          }}
        >
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
              columns={quantityColumns()}
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
            columns={reasonColumns()}
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

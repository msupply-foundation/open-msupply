// The capture window (spec/barcode-scanning ui-surface.md § S2; rules.md §
// Learning a code while receiving): one scan becomes one received line, box
// after box. Opened only by a scan; a scan arriving while it is open saves
// what is on screen and loads the new one.
//
// The primitive half: the detail view creates ONE with createCaptureWindow,
// hands `receive` to its scan control's onScan, and renders <CaptureWindow>
// (./CaptureWindow) over it. The decisions are in ./captureScan; this file
// owns the requests and their sequencing.

import { createMemo, createSignal, type Accessor } from 'solid-js';
import { generateUUID } from '@/uuid';
import { graphqlFetch } from '@/api/graphql';
import { t } from '@/intl';
import {
  labelFields,
  lookUpBarcode,
  saveBarcode,
  scanCode,
} from '@/domain/barcode';
import { lookUpItemById, type ItemOption } from '@/domain/item';
import { createFocusTarget } from '@/ui/utils/createFocusTarget';
import { createFlash } from '@/ui/utils/createFlash';
import {
  InboundShipmentLines,
  type InboundLineFragment,
} from '../inboundShipmentDetail.generated';
import { runInboundBatch } from '../inboundShipmentUpdate';
import {
  borrowDates,
  captureBatch,
  chooseItem,
  codeToLearn,
  draftFromScan,
  matchingLine,
  saveRefusal,
  type CaptureDraft,
  type CaptureItem,
  type CaptureRead,
} from './captureScan';

export type CaptureWindowOptions = {
  storeId: Accessor<string>;
  invoiceId: Accessor<string>;
  isExternal: Accessor<boolean>;
  /** Cost is locked by a source link — a new line's prices start at zero. */
  costLocked: Accessor<boolean>;
  /**
   * A different editing window is open: a scan is refused and dropped, not
   * queued (.41).
   */
  blocked: Accessor<boolean>;
  /** A line saved — the view refetches. */
  onSaved: () => void;
  /**
   * A notice for the host screen: the scan was refused (.41), or the line
   * saved but its code was not learned. Beside the scan action, where the
   * window may no longer be.
   */
  onNotice: (message: string) => void;
};

export type CaptureWindowControl = ReturnType<typeof createCaptureWindow>;

export const createCaptureWindow = (options: CaptureWindowOptions) => {
  const [open, setOpen] = createSignal(false);
  const [draft, setDraft] = createSignal<CaptureDraft>();
  // The scan the window holds — the label's pack size is re-read from it
  // when the user picks an item by hand.
  let read: CaptureRead | undefined;
  // The Item field's item's lines on this shipment, for the match (.35).
  const [itemLines, setItemLines] = createSignal<InboundLineFragment[]>([]);
  const [working, setWorking] = createSignal(false);
  // A refusal or a failed save — replaces the message until the next scan.
  const [refusal, setRefusal] = createSignal<string>();
  const saved = createFlash<string>();
  const quantityField = createFocusTarget();
  const itemField = createFocusTarget();

  const match = createMemo(() => {
    const current = draft();
    return current ? matchingLine(current, itemLines()) : undefined;
  });

  // Fetch the item's lines, then borrow the match's dates for the blanks.
  // A request superseded by a later item is ignored.
  let linesFor: string | undefined;
  const loadItemLines = async (itemId: string | undefined) => {
    linesFor = itemId;
    setItemLines([]);
    if (!itemId) return;
    const result = await graphqlFetch(InboundShipmentLines, {
      storeId: options.storeId(),
      filter: {
        invoiceId: { equalTo: options.invoiceId() },
        itemId: { equalTo: itemId },
        type: { equalAny: ['STOCK_IN'] },
      },
      page: { first: 200 },
    });
    if (linesFor !== itemId) return;
    const lines =
      result.kind === 'success' &&
      result.data.invoiceLines.__typename === 'InvoiceLineConnector'
        ? result.data.invoiceLines.nodes
        : [];
    setItemLines(lines);
    reborrow();
  };

  const reborrow = () =>
    setDraft(current => current && borrowDates(current, match()));

  // Only a change to what the match keys on borrows — a date the user
  // clears stays cleared.
  const update = (patch: Partial<CaptureDraft>) => {
    setDraft(current => current && { ...current, ...patch });
    if ('batch' in patch || 'packSize' in patch) reborrow();
  };

  const reset = () => {
    read = undefined;
    linesFor = undefined;
    setDraft(undefined);
    setItemLines([]);
    setRefusal(undefined);
  };

  const close = () => {
    setOpen(false);
    saved.clear();
    reset();
  };

  /**
   * Save what is on screen: the line first, the book second (rules: "a
   * failure to record it MUST NOT lose the line"). Undefined on success,
   * else the refusal text to show.
   */
  const save = async (): Promise<string | undefined> => {
    const current = draft();
    if (!current) return undefined;
    const refused = saveRefusal(current);
    if (refused) return t(refused);
    const input = captureBatch(current, match(), {
      invoiceId: options.invoiceId(),
      costLocked: options.costLocked(),
      newLineId: generateUUID(),
    });
    if (!input) return undefined;
    const failed = t('error.barcode-scanner-auto-save-failed');
    setWorking(true);
    const outcome = await runInboundBatch(
      options.storeId(),
      options.isExternal(),
      input
    );
    if (!outcome) {
      // Already reported globally.
      setWorking(false);
      return failed;
    }
    const reason =
      outcome.message ??
      (outcome.errors.size > 0 ? [...outcome.errors.values()][0] : undefined);
    if (reason) {
      setWorking(false);
      return `${failed} ${reason}`;
    }
    options.onSaved();
    const learn = codeToLearn(current);
    if (learn) {
      const result = await saveBarcode(options.storeId(), learn);
      if (result.kind === 'error') options.onNotice(result.message);
    }
    setWorking(false);
    return undefined;
  };

  /** Look the scan up and load it into the (now empty) window. */
  const load = async (incoming: CaptureRead) => {
    setWorking(true);
    // A failed lookup is already reported globally; the scan still opens,
    // item unresolved and nothing to learn (draftFromScan).
    const lookup = await lookUpBarcode(options.storeId(), scanCode(incoming));
    let item: CaptureItem | undefined;
    if (lookup.kind === 'known') {
      const resolved = await lookUpItemById(
        options.storeId(),
        lookup.barcode.itemId
      );
      if (resolved.kind === 'found') item = resolved.item;
    }
    read = incoming;
    setRefusal(undefined);
    setDraft(draftFromScan(incoming, lookup, item));
    setOpen(true);
    setWorking(false);
    if (item) {
      quantityField.focus();
      await loadItemLines(item.id);
    } else itemField.focus();
  };

  /** A scan, from the host screen's scan control. */
  const receive = async (incoming: CaptureRead) => {
    // One at a time: a scan landing mid-lookup or mid-save is dropped.
    if (working()) return;
    if (options.blocked()) {
      options.onNotice(t('messages.scan-disabled-warning'));
      return;
    }
    if (open()) {
      // Scanning on saves first (.37); a refusal keeps the entry and drops
      // the incoming scan (.38, .39), as does any other failure.
      const refused = await save();
      if (refused) {
        setRefusal(refused);
        return;
      }
      saved.show(t('messages.inbound-shipment-line-saved'));
      reset();
    }
    await load(incoming);
  };

  const confirm = async () => {
    const refused = await save();
    if (refused) setRefusal(refused);
    else close();
  };

  const pickItem = (option: ItemOption | null) => {
    const current = draft();
    if (!current) return;
    const item = option ?? undefined;
    setDraft(chooseItem(current, item, read && labelFields(read).packSize));
    void loadItemLines(item?.id);
    if (item) quantityField.focus();
  };

  return {
    storeId: options.storeId,
    open,
    draft,
    match,
    working,
    refusal,
    savedNotice: saved.value,
    quantityField,
    itemField,
    receive,
    confirm,
    close,
    update,
    pickItem,
  };
};

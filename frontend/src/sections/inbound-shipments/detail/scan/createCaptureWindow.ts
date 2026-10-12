// The capture window (spec/barcode-scanning ui-surface.md § S2; rules.md §
// Receiving by scanning): one scan becomes one received line, box after box.
// Opened only by a scan; a scan arriving while it is open saves what is on
// screen and loads the new one — except a batch label, which fills in the
// entry on screen (.186), and a code onto an entry a batch label opened,
// which fills in its item (.189). A scan that is neither known nor a product
// code opens no entry: with the window closed it is a notice on the screen;
// with an entry on screen, the entry stays as it is, unsaved (.202, .195).
//
// One scan is worked at a time, so a lookup and a save never interleave. A
// scan arriving while one is in flight — or while OK saves — is dropped with
// a notice, not queued (.200); so is one whose scan-on is refused or fails —
// the entry stays, and the user scans again once it is sorted (.201). A save
// waits for the item's lines, so it adds to the matching line rather than
// inserting a second one (.176).
//
// The primitive half: the detail view creates ONE with createCaptureWindow,
// hands `receive` to its scan control's onScan, and renders <CaptureWindow>
// (./CaptureWindow) over it, and the window's `Chooser` once — the question a
// barcode mapped to several items asks before the window opens. The decisions
// are in ./captureScan; this file owns the requests and their sequencing.

import { createMemo, createSignal, type Accessor } from 'solid-js';
import { generateUUID } from '@/uuid';
import { graphqlFetch } from '@/api/graphql';
import { t } from '@/intl';
import {
  createBarcodeChooser,
  isBatchLabel,
  labelFields,
  lookUpBarcode,
  proposeBarcode,
  scanCode,
  type BarcodeLookup,
  type ScanNoticeShown,
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
  draftFromScan,
  fillFromLabel,
  isUnrecognised,
  matchingLine,
  mergeOntoLabelEntry,
  opensEntryUnseen,
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
   * The line editor or another editing window is open: a scan is refused
   * and discarded (.41).
   */
  blocked: Accessor<boolean>;
  /** A line saved — the view refetches. */
  onSaved: () => void;
  /**
   * A notice for the host screen, beside the scan action, where the window
   * is not open: the scan was refused (.41), dropped while another was in
   * flight (.200), or not recognised (.202).
   */
  onNotice: (notice: ScanNoticeShown) => void;
};

export type CaptureWindowControl = ReturnType<typeof createCaptureWindow>;

export const createCaptureWindow = (options: CaptureWindowOptions) => {
  const [open, setOpen] = createSignal(false);
  const [draft, setDraft] = createSignal<CaptureDraft>();
  // The scan that opened the entry on screen.
  let read: CaptureRead | undefined;
  // The pack size the entry's labels stated — used when the user picks an
  // item by hand. A batch label filled in later can state one too.
  let labelPackSize: number | undefined;
  // The Item field's item's lines on this shipment, for the match (.176).
  const [itemLines, setItemLines] = createSignal<InboundLineFragment[]>([]);
  const [working, setWorking] = createSignal(false);
  // A refusal or a failed save — replaces the message until the next scan.
  const [refusal, setRefusal] = createSignal<string>();
  // The raw content of the last scan, where it was neither known nor a
  // product code — the notice replaces the message until the next scan.
  const [unrecognised, setUnrecognised] = createSignal<string>();
  // A scan is being worked — looked up, chosen, or saved on — or OK is
  // saving (.200).
  let busy = false;
  const saved = createFlash<string>();
  const quantityField = createFocusTarget();
  const itemField = createFocusTarget();
  const chooser = createBarcodeChooser();

  const match = createMemo(() => {
    const current = draft();
    return current ? matchingLine(current, itemLines()) : undefined;
  });

  // Fetch the item's lines, then borrow the match's dates for the blanks.
  // A request superseded by a later item is ignored. `linesReady` settles once
  // the current item's lines are in, so a save never matches against none.
  let linesFor: string | undefined;
  let linesReady: Promise<void> = Promise.resolve();
  const loadItemLines = (itemId: string | undefined) => {
    linesFor = itemId;
    setItemLines([]);
    linesReady = itemId ? fetchItemLines(itemId) : Promise.resolve();
    return linesReady;
  };
  const fetchItemLines = async (itemId: string) => {
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
    labelPackSize = undefined;
    linesFor = undefined;
    setDraft(undefined);
    setItemLines([]);
    setRefusal(undefined);
    setUnrecognised(undefined);
  };

  const close = () => {
    setOpen(false);
    saved.clear();
    reset();
  };

  /**
   * Save what is on screen. The scanned barcode goes with a new line, and is
   * then proposed for the line's item (rules § Learning a barcode). Undefined
   * on success, else the refusal text to show.
   */
  const save = async (): Promise<string | undefined> => {
    await linesReady;
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
    const item = current.item;
    // The line has saved, so this never reports a failure: a refusal here
    // keeps the entry on screen, and saving it again would add its quantity
    // twice. A barcode that isn't learned is learned the next time it's saved.
    if (item && current.barcode)
      await proposeBarcode(options.storeId(), {
        barcode: current.barcode,
        itemId: item.id,
        packSize: current.packSize,
      });
    setWorking(false);
    return undefined;
  };

  /**
   * Look the scan up and load it into the window — empty, or holding an
   * entry a batch label opened, which the scan's item then joins (.189).
   * `looked` is the scan's lookup where `work` already ran it.
   */
  const load = async (
    incoming: CaptureRead,
    onto?: CaptureDraft,
    looked?: BarcodeLookup
  ) => {
    setWorking(true);
    // A failed lookup is already reported globally; the scan still opens,
    // item unresolved and nothing to learn (draftFromScan).
    let lookup: BarcodeLookup =
      looked ?? (await lookUpBarcode(options.storeId(), scanCode(incoming)));
    let item: CaptureItem | undefined;
    if (lookup.kind === 'choose') {
      // Mapped to several items: ask which one is on this box. Closing the
      // question opens nothing, as on issuing (.204) — an entry on screen
      // stays as it was.
      const choice = await chooser.choose(options.storeId(), lookup.barcodes);
      if (choice.kind === 'cancelled') {
        setWorking(false);
        return;
      }
      if (choice.kind === 'chosen') {
        lookup = { kind: 'known', barcode: choice.barcode };
        item = choice.item;
      } else if (choice.kind === 'failed') {
        // As a failed lookup: the entry opens with nothing to propose.
        lookup = { kind: 'failed' };
      } else lookup = { kind: 'unknown' };
    } else if (lookup.kind === 'known') {
      const resolved = await lookUpItemById(
        options.storeId(),
        lookup.barcode.itemId
      );
      if (resolved.kind === 'found') item = resolved.item;
    }
    const loaded = draftFromScan(incoming, lookup, item);
    const incomingPackSize = labelFields(incoming).packSize;
    setDraft(
      onto ? mergeOntoLabelEntry(onto, labelPackSize, loaded, incoming) : loaded
    );
    if (!onto) read = incoming;
    labelPackSize = incomingPackSize ?? (onto ? labelPackSize : undefined);
    setRefusal(undefined);
    setUnrecognised(undefined);
    setOpen(true);
    setWorking(false);
    // Not awaited: the entry is usable while its item's lines load, and a
    // save waits for them (linesReady).
    if (item) {
      quantityField.focus();
      void loadItemLines(item.id);
    } else itemField.focus();
  };

  /**
   * A batch label onto the entry on screen (.186): its values replace the
   * entry's, nothing is saved, and the match follows the new batch.
   */
  const fill = (label: CaptureRead) => {
    const current = draft();
    if (!current) return;
    setRefusal(undefined);
    setUnrecognised(undefined);
    labelPackSize = labelFields(label).packSize ?? labelPackSize;
    update(fillFromLabel(current, label));
    if (current.item) quantityField.focus();
  };

  /**
   * An entry a batch label opened, with no item chosen yet: a scan with a
   * code joins it rather than scanning on (.189).
   */
  const awaitingItem = (current: CaptureDraft | undefined) =>
    current !== undefined &&
    current.item === undefined &&
    read !== undefined &&
    isBatchLabel(read);

  /**
   * Work one scan. Scanning on saves what is on screen first (.37); a
   * refusal or a failed save keeps the entry, and the incoming scan is
   * dropped — the user scans it again once the entry is sorted (.38, .201).
   */
  const work = async (next: CaptureRead) => {
    if (open() && isBatchLabel(next)) {
      fill(next);
      return;
    }
    // A scan that is neither a product code nor a batch label opens an
    // entry only where the lookup knows it, so it is looked up before
    // anything on screen is saved. Unrecognised, it is a notice: on the
    // screen with the window closed, else in the window's message, leaving
    // the entry as it is — nothing saved, nothing cleared.
    let lookup: BarcodeLookup | undefined;
    if (!opensEntryUnseen(next)) {
      setWorking(true);
      lookup = await lookUpBarcode(options.storeId(), scanCode(next));
      setWorking(false);
      if (isUnrecognised(next, lookup)) {
        if (!open()) {
          options.onNotice({
            severity: 'info',
            text: t('messages.receiving-barcode-not-recognised'),
          });
          return;
        }
        setRefusal(undefined);
        setUnrecognised(next.content);
        return;
      }
    }
    if (open() && awaitingItem(draft())) {
      await load(next, draft(), lookup);
      return;
    }
    if (open() && draft()) {
      const refused = await save();
      if (refused) {
        setRefusal(refused);
        return;
      }
      saved.show(t('messages.inbound-shipment-line-saved'));
      reset();
    }
    await load(next, undefined, lookup);
  };

  /** A scan, from the host screen's scan control. */
  const receive = async (incoming: CaptureRead) => {
    if (options.blocked()) {
      options.onNotice({
        severity: 'warning',
        text: t('messages.close-line-editor-to-scan'),
      });
      return;
    }
    // One at a time: a scan arriving mid-lookup, mid-choice or mid-save is
    // dropped, and the user told to scan it again (.200).
    if (busy) {
      const notice = t('messages.scan-still-working');
      if (open()) {
        setUnrecognised(undefined);
        setRefusal(notice);
      } else options.onNotice({ severity: 'warning', text: notice });
      return;
    }
    busy = true;
    try {
      await work(incoming);
    } finally {
      busy = false;
    }
  };

  /** Confirm or cancel: close. */
  const finish = () => close();

  const confirm = async () => {
    if (busy) return;
    busy = true;
    try {
      const refused = await save();
      if (refused) setRefusal(refused);
      else finish();
    } finally {
      busy = false;
    }
  };

  const pickItem = (option: ItemOption | null) => {
    const current = draft();
    if (!current) return;
    const item = option ?? undefined;
    setDraft(chooseItem(current, item, labelPackSize));
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
    unrecognised,
    savedNotice: saved.value,
    quantityField,
    itemField,
    receive,
    confirm,
    close: finish,
    update,
    pickItem,
    Chooser: chooser.Chooser,
  };
};

// The screen side of issuing by scanning, shared by every screen that issues
// (spec/barcode-scanning/rules.md § Issuing by scanning): the outbound
// shipment and the dispensing record. A scan opens the screen's line editor on
// the item its barcode is mapped to — asking which item when it is mapped to
// several — or empty with a warning when it is mapped to nothing yet; the
// editor then carries the scan until its first save sends the barcode
// (./issueScan).
//
// What this owns, so the two screens cannot drift:
//  - one scan at a time — a scan arriving while another is being looked up
//    is dropped with a "still working" notice, as on receiving (.200);
//  - where a scan goes once the editor is open: into the editor while it is
//    waiting for an item (add mode, nothing chosen — "Add item", or after
//    Save & next); a batch label's batch into an editor open on an item
//    (.192); else discarded with "close the line editor to scan";
//  - the notices beside the scan action: a scanner failure, and a discarded
//    scan once the editor has closed;
//  - the item chooser, which the screen renders once (`Chooser`).
//
// What the screen keeps: when it can use a scan at all (`disabled`), whether
// its editor is open, and opening it.

import { createSignal, type Accessor, type Component } from 'solid-js';
import { t } from '@/intl';
import {
  createScanControl,
  shownScanNotice,
  type ScanControl,
  type ScanNoticeShown,
} from './createScanControl';
import { createBarcodeChooser } from './createBarcodeChooser';
import { resolveIssueScan, type IssueScan } from './issueScan';
import { isBatchLabel, labelFields } from './readScan';

/** How an open editor takes a scan while it is waiting for an item. */
export type IssueScanReceiver = (scan: IssueScan) => void;

/**
 * How an editor open on an item takes a batch label's batch (.192): it names
 * no item, so it narrows the stock instead of replacing the item.
 */
export type BatchLabelReceiver = (batch: string) => void;

export type IssueScanHostOptions = {
  /** Names this screen in the Devices diagnostic readout. */
  owner: string;
  storeId: Accessor<string>;
  /**
   * The screen cannot use a scan (not editable, still loading). The scanner
   * stops listening. NOT the editor being open: that is handled here, so the
   * scanner keeps listening behind the editor and can say why a scan went
   * nowhere.
   */
  disabled: Accessor<boolean>;
  /** The screen's line editor is open. */
  editorOpen: Accessor<boolean>;
  /** Open the line editor on a resolved scan. */
  openEditor: (scan: IssueScan) => void;
  /** Scope the resolved item like the editor's item search (a program). */
  masterListId?: Accessor<string | undefined>;
};

export type IssueScanHost = {
  control: ScanControl;
  /** The one notice to show beside the scan action (toolbar row). */
  noticeShown: Accessor<ScanNoticeShown | undefined>;
  /**
   * A scan was discarded while the editor was open on an item. The editor
   * shows it while open; once closed the toolbar notice does, until the next
   * scan or open.
   */
  discarded: Accessor<boolean>;
  /** "Which item is this barcode?" — render once in the screen. */
  Chooser: Component;
  /**
   * The open editor says whether it is waiting for an item, and how to take
   * a scan that names one; `undefined` when it is not (an item is chosen, it
   * is saving, or it closed).
   */
  setReceiver: (receiver: IssueScanReceiver | undefined) => void;
  /**
   * The open editor has an item and can narrow its stock to a batch label's
   * batch; `undefined` when it cannot (no item yet, saving, or closed).
   */
  setBatchLabelReceiver: (receiver: BatchLabelReceiver | undefined) => void;
  /** Every editor open goes through here: a stale notice is dropped. */
  editorOpened: () => void;
  /** The editor closed: a discarded-scan notice no longer applies. */
  editorClosed: () => void;
};

export const createIssueScanHost = (
  options: IssueScanHostOptions
): IssueScanHost => {
  const [discarded, setDiscarded] = createSignal(false);
  // A scan dropped because another was still being looked up (.200).
  const [dropped, setDropped] = createSignal(false);
  const chooser = createBarcodeChooser();
  // Not a signal: read only at the moment a scan lands, never tracked.
  let receiver: IssueScanReceiver | undefined;
  let batchLabelReceiver: BatchLabelReceiver | undefined;
  let resolving = false;

  const control = createScanControl({
    owner: options.owner,
    disabled: options.disabled,
    onScan: read => {
      // A batch label names no item, so an editor open on one takes its
      // batch rather than discarding it (.192). Nothing to look up. A label
      // carrying no batch has nothing to narrow to, and is let go quietly.
      if (
        !resolving &&
        options.editorOpen() &&
        receiver === undefined &&
        batchLabelReceiver &&
        isBatchLabel(read)
      ) {
        const { batch } = labelFields(read);
        if (batch !== undefined) batchLabelReceiver(batch);
        return;
      }
      // One scan at a time: dropped, and the user told to scan again (.200).
      if (resolving) {
        setDropped(true);
        return;
      }
      // No scan with a code into an editor that already has an item: the
      // scan would replace the item the user is issuing. Discarded, and the
      // user is told why (.213).
      if (options.editorOpen() && receiver === undefined) {
        setDiscarded(true);
        return;
      }
      resolving = true;
      setDiscarded(false);
      setDropped(false);
      void resolveIssueScan(options.storeId(), read, {
        masterListId: options.masterListId?.(),
        chooser,
      })
        .then(result => {
          if (!result) {
            // A failed lookup opens nothing; a scan discarded meanwhile has
            // no editor to close, so its notice would mislead.
            if (!options.editorOpen()) setDiscarded(false);
            return;
          }
          if (options.editorOpen()) {
            // The editor may have taken an item while the lookup ran; the
            // scan then lands nowhere, like one arriving now would.
            if (receiver) receiver(result);
            else setDiscarded(true);
            return;
          }
          if (!options.disabled()) options.openEditor(result);
        })
        .finally(() => (resolving = false));
    },
  });

  const noticeShown = shownScanNotice(control, () => {
    if (dropped())
      return { severity: 'warning', text: t('messages.scan-still-working') };
    if (discarded() && !options.editorOpen())
      return {
        severity: 'warning',
        text: t('messages.close-line-editor-to-scan'),
      };
    return undefined;
  });

  return {
    control,
    noticeShown,
    discarded,
    Chooser: chooser.Chooser,
    setReceiver: next => {
      receiver = next;
      // The editor is ready for a scan again: an earlier discard is over.
      if (next) setDiscarded(false);
    },
    setBatchLabelReceiver: next => {
      batchLabelReceiver = next;
    },
    editorOpened: () => undefined,
    editorClosed: () => {
      receiver = undefined;
      batchLabelReceiver = undefined;
      setDiscarded(false);
    },
  };
};

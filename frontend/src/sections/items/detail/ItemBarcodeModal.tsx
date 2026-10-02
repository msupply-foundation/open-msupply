import { createSignal, Show, type Component } from 'solid-js';
import { t } from '../../../intl';
import { Dialog } from '../../../ui/elements/feedback/Dialog';
import { Alert } from '../../../ui/elements/feedback/Alert';
import {
  CancelButton,
  DialogSaveButton,
} from '../../../ui/elements/buttons/StandardButtons';
import { TextField } from '../../../ui/elements/inputs/TextField';
import { NumberField } from '../../../ui/elements/inputs/NumberField';
import { LabelledValue } from '../../../ui/elements/typography/LabelledValue';
import { Stack } from '../../../ui/layout/Stack/Stack';
import { PlusCircleIcon } from '../../../ui/icons';
import { createFocusTarget } from '../../../ui/utils/createFocusTarget';
import { ItemSearch } from '../../../domain/item/ItemSearch';
import {
  addBarcode,
  createScanControl,
  labelFields,
  moveBarcode,
  proposeBarcode,
  scanCode,
  type BarcodeChange,
  ScanFieldButton,
  scanFieldHelper,
  ScanNotice,
} from '../../../domain/barcode';
import {
  EMPTY_DRAFT,
  addInput,
  isDraftValid,
  type BarcodeDraft,
  type ConfirmedBarcode,
  type NamedItem,
} from './barcodeEdit';

// The Barcodes tab's one dialog (spec/items/ui-surface.md S7; barcode-scanning
// rules § Maintaining barcodes). Two entries:
//
//  - Add barcode: a Barcode field (scannable, exactly as the stock line's is)
//    and a Pack size. On central it confirms the barcode for this item,
//    alongside any other items it is confirmed for; elsewhere it proposes it.
//  - Move to another item (central only): an item search, then Save. Stock and
//    shipments that already have the barcode keep it.
//
// Cancel closes the dialog with nothing changed. The panel mounts this fresh
// per open, so the form seeds once (kdd/solid-reactivity-pitfalls § no
// remounts).

/** What the dialog was opened for. */
export type BarcodeEditorState =
  { mode: 'add' } | { mode: 'move'; row: ConfirmedBarcode };

export const ItemBarcodeModal: Component<{
  storeId: string;
  /** The item whose Barcodes tab opened this. */
  item: NamedItem;
  /** Add confirms on central, proposes elsewhere. */
  isCentral: boolean;
  /** Snapshot at open. */
  editor: BarcodeEditorState;
  onClose: () => void;
  /** A save landed — the panel re-queries. */
  onSaved: () => void;
}> = props => {
  const movedRow = (): ConfirmedBarcode | undefined =>
    props.editor.mode === 'move' ? props.editor.row : undefined;
  const barcodeField = createFocusTarget();
  const itemSearch = createFocusTarget();

  const [draft, setDraft] = createSignal<BarcodeDraft>(EMPTY_DRAFT);
  // Move: the item picked to move the barcode to.
  const [moveTarget, setMoveTarget] = createSignal<NamedItem>();
  const [saving, setSaving] = createSignal(false);
  // The inline save-rejection banner — the dialog stays open with entries
  // intact (ui-standards › controls § dialogs).
  const [rejection, setRejection] = createSignal<string>();

  // Scanning into the Barcode field, as on the stock line (barcode-scanning
  // ui-surface § The field scan affordance): the scan's code — never the raw
  // characters — and the label's pack size where it states one. Only while
  // the Add form is what the user sees.
  const scanner = createScanControl({
    owner: 'item-barcodes',
    mode: 'field',
    disabled: () => movedRow() !== undefined || saving(),
    onScan: scan => {
      const code = scanCode(scan);
      const { packSize } = labelFields(scan);
      setDraft(current => ({
        barcode: code ?? current.barcode,
        packSize: packSize ?? current.packSize,
      }));
    },
  });

  const submit = async (run: () => Promise<BarcodeChange>) => {
    if (saving()) return;
    setSaving(true);
    setRejection(undefined);
    const result = await run();
    setSaving(false);
    switch (result.kind) {
      case 'saved':
        props.onSaved();
        // Closure IS the confirmation (ui-standards › controls § dialogs).
        props.onClose();
        return;
      case 'error':
        setRejection(result.message);
        return;
      case 'no-code':
        return;
    }
  };

  const title = () =>
    movedRow() ? t('title.move-barcode') : t('label.add-barcode');

  const onSave = () => {
    const storeId = props.storeId;
    const row = movedRow();
    if (row) {
      const target = moveTarget();
      if (target) void submit(() => moveBarcode(storeId, row.id, target.id));
      return;
    }
    const input = addInput(draft(), props.item.id);
    void submit(() =>
      props.isCentral
        ? addBarcode(storeId, input)
        : proposeBarcode(storeId, input)
    );
  };
  const canSave = () =>
    !saving() &&
    (movedRow() ? moveTarget() !== undefined : isDraftValid(draft()));

  return (
    <Dialog
      open
      testId="item-barcode-modal"
      width="form"
      initialFocus={movedRow() ? itemSearch : barcodeField}
      title={title()}
      icon={movedRow() ? undefined : <PlusCircleIcon />}
      dismissable={!saving()}
      onClose={props.onClose}
      footer={
        <Show when={rejection()}>
          {message => (
            <Alert severity="error" testId="item-barcode-save-error">
              {message()}
            </Alert>
          )}
        </Show>
      }
      actions={
        <>
          <Show when={!saving()}>
            <CancelButton
              data-testid="dialog-button-cancel"
              onClick={props.onClose}
            />
          </Show>
          <DialogSaveButton
            data-testid="dialog-button-ok"
            loading={saving()}
            disabled={!canSave()}
            onClick={onSave}
          />
        </>
      }
    >
      <Show
        when={movedRow()}
        fallback={
          <Stack gap="md">
            <TextField
              ref={barcodeField.ref}
              label={t('label.barcode')}
              data-testid="field-barcode"
              value={draft().barcode}
              disabled={saving()}
              onInput={e =>
                setDraft({ ...draft(), barcode: e.currentTarget.value })
              }
              helperText={scanFieldHelper(scanner)}
              endAction={
                scanner.needsPress() ? (
                  <ScanFieldButton control={scanner} />
                ) : undefined
              }
            />
            <ScanNotice control={scanner} />
            <NumberField
              label={t('label.pack-size')}
              data-testid="field-pack-size"
              min={0}
              decimalLimit={4}
              disabled={saving()}
              value={draft().packSize}
              onChange={packSize => setDraft({ ...draft(), packSize })}
            />
          </Stack>
        }
      >
        {row => (
          <Stack gap="md">
            <LabelledValue variant="field" label={t('label.barcode')}>
              {row().barcode}
            </LabelledValue>
            <ItemSearch
              label={t('label.move-barcode-to')}
              storeId={props.storeId}
              focusTarget={itemSearch}
              excludeItemIds={[props.item.id]}
              clearable={false}
              onSelect={picked =>
                setMoveTarget(
                  picked
                    ? { id: picked.id, code: picked.code, name: picked.name }
                    : undefined
                )
              }
            />
          </Stack>
        )}
      </Show>
    </Dialog>
  );
};

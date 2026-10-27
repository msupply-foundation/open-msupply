import { createMemo, createSignal, Show, type Component } from 'solid-js';
import { t } from '../../../intl';
import { Dialog } from '../../../ui/elements/feedback/Dialog';
import { Alert } from '../../../ui/elements/feedback/Alert';
import {
  CancelButton,
  DialogSaveButton,
} from '../../../ui/elements/buttons/StandardButtons';
import { TextField } from '../../../ui/elements/inputs/TextField';
import { NumberField } from '../../../ui/elements/inputs/NumberField';
import { Select } from '../../../ui/elements/selectors/Select';
import { LabelledValue } from '../../../ui/elements/typography/LabelledValue';
import { Stack } from '../../../ui/layout/Stack/Stack';
import { CheckIcon, PlusCircleIcon } from '../../../ui/icons';
import { createFocusTarget } from '../../../ui/utils/createFocusTarget';
import { NameSearch } from '../../../domain/name/NameSearch';
import {
  addBarcode,
  confirmProposal,
  createScanControl,
  labelFields,
  proposeBarcode,
  scanCode,
  type BarcodeChange,
  ScanFieldButton,
  scanFieldHelper,
  ScanNotice,
} from '../../../domain/barcode';
import {
  AUTO_CREATED_TARGET,
  EMPTY_DRAFT,
  addInput,
  asksManufacturer,
  asksPackSize,
  isDraftValid,
  targetOptions,
  type BarcodeDraft,
  type BarcodeProposal,
  type BarcodeVariant,
  type NamedItem,
} from './barcodeEdit';

// The Barcodes tab's one dialog (spec/items/ui-surface.md S7; barcode-scanning
// rules § Maintaining barcodes). Two entries:
//
//  - Add barcode: a Barcode field (scannable, exactly as the stock line's is),
//    a Pack size and a Manufacturer. On central it confirms the barcode for
//    this item, alongside any other items it is confirmed for; elsewhere it
//    proposes it.
//  - Confirm (central only, from a proposal): the proposal's barcode, pack size
//    and store, read-only.
//
// On central both ask where the barcode goes (Put it on): on its own by
// default — an auto-created variant, out of sight of variant lists — or on one
// of the item's variants (decisions/2026-09-30_barcodes.md, Option 6). An
// existing packaging level brings its own pack size, and a variant its own
// manufacturer, so those fields show only where the barcode gets new ones.
//
// Cancel closes the dialog with nothing changed. The panel mounts this fresh
// per open, so the form seeds once (kdd/solid-reactivity-pitfalls § no
// remounts).

/** What the dialog was opened for. */
export type BarcodeEditorState =
  { mode: 'add' } | { mode: 'confirm'; row: BarcodeProposal };

export const ItemBarcodeModal: Component<{
  storeId: string;
  /** The item whose Barcodes tab opened this. */
  item: NamedItem;
  /** Add confirms on central, proposes elsewhere. */
  isCentral: boolean;
  /** The item's variants, auto-created ones included: where central can put it. */
  variants: BarcodeVariant[];
  /** Snapshot at open. */
  editor: BarcodeEditorState;
  onClose: () => void;
  /** A save landed — the panel re-queries. */
  onSaved: () => void;
}> = props => {
  const confirmed = (): BarcodeProposal | undefined =>
    props.editor.mode === 'confirm' ? props.editor.row : undefined;
  const barcodeField = createFocusTarget();
  const targetField = createFocusTarget();

  const [draft, setDraft] = createSignal<BarcodeDraft>(EMPTY_DRAFT);
  const options = createMemo(() => targetOptions(props.variants));
  const [targetValue, setTargetValue] = createSignal(AUTO_CREATED_TARGET);
  const target = () =>
    (options().find(option => option.value === targetValue()) ?? options()[0]!)
      .target;
  // Away from central nothing is confirmed, so there's nowhere to choose.
  const showsPackSize = () => !props.isCentral || asksPackSize(target());
  const showsManufacturer = () =>
    !props.isCentral || asksManufacturer(target());

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
    disabled: () => confirmed() !== undefined || saving(),
    onScan: scan => {
      const code = scanCode(scan);
      const { packSize } = labelFields(scan);
      setDraft(current => ({
        ...current,
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
    confirmed() ? t('title.confirm-barcode') : t('label.add-barcode');

  const onSave = () => {
    const storeId = props.storeId;
    const where = target();
    const row = confirmed();
    if (row) {
      void submit(() => confirmProposal(storeId, row.id, where));
      return;
    }
    const itemId = props.item.id;
    void submit(() =>
      props.isCentral
        ? addBarcode(storeId, addInput(draft(), itemId, where), where)
        : proposeBarcode(storeId, addInput(draft(), itemId))
    );
  };
  const canSave = () => !saving() && (!!confirmed() || isDraftValid(draft()));

  return (
    <Dialog
      open
      testId="item-barcode-modal"
      width="form"
      initialFocus={confirmed() ? targetField : barcodeField}
      title={title()}
      icon={confirmed() ? <CheckIcon /> : <PlusCircleIcon />}
      dismissable={!saving()}
      // Room for the manufacturer lookup's and Put it on's open listboxes
      // inside the dialog, as on the variant dialog.
      minBodyHeightRem={24}
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
      <Stack gap="md">
        <Show
          when={confirmed()}
          fallback={
            <>
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
            </>
          }
        >
          {row => (
            <>
              <LabelledValue variant="field" label={t('label.barcode')}>
                {row().barcode}
              </LabelledValue>
              <LabelledValue variant="field" label={t('label.pack-size')}>
                {row().packSize ?? ''}
              </LabelledValue>
              <LabelledValue variant="field" label={t('label.barcode-status')}>
                {t('label.barcode-proposed-by', {
                  store: row().store?.storeName ?? row().store?.code ?? '',
                })}
              </LabelledValue>
            </>
          )}
        </Show>
        <Show when={props.isCentral}>
          <Select
            label={t('label.barcode-target')}
            testId="field-barcode-target"
            focusTarget={targetField}
            options={options()}
            value={targetValue()}
            disabled={saving()}
            onValueChange={setTargetValue}
          />
        </Show>
        <Show when={!confirmed() && showsPackSize()}>
          <NumberField
            label={t('label.pack-size')}
            data-testid="field-pack-size"
            min={0}
            decimalLimit={4}
            disabled={saving()}
            value={draft().packSize}
            onChange={packSize => setDraft({ ...draft(), packSize })}
          />
        </Show>
        <Show when={!confirmed() && showsManufacturer()}>
          <NameSearch
            label={t('label.manufacturer')}
            storeId={props.storeId}
            role="manufacturer"
            inputTestId="field-manufacturer"
            disabled={saving()}
            selected={draft().manufacturer}
            onSelect={name =>
              setDraft({
                ...draft(),
                manufacturer: name
                  ? { id: name.id, name: name.name }
                  : undefined,
              })
            }
          />
        </Show>
      </Stack>
    </Dialog>
  );
};

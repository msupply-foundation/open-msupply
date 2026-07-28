import { generateUUID } from '../../../uuid';
import { createSignal, Show, type Component } from 'solid-js';
import { graphqlFetch } from '../../../api/graphql';
import { t } from '../../../intl';
import { Dialog } from '../../../ui/elements/feedback/Dialog';
import { Alert } from '../../../ui/elements/feedback/Alert';
import { Button } from '../../../ui/elements/buttons/Button';
import { NumberField } from '../../../ui/elements/inputs/NumberField';
import { Text } from '../../../ui/elements/typography/Text';
import {
  ArrowRightIcon,
  CheckIcon,
  PlusCircleIcon,
  XCircleIcon,
} from '../../../ui/icons';
import { ItemSearch } from '../../../domain/item/ItemSearch';
import {
  UpsertAncillaryItem,
  type UpsertAncillaryItemResult,
} from './ancillaryItemMutations.generated';
import {
  EMPTY_FORM,
  buildUpsertInput,
  isFormValid,
  rejectionMessage,
  saveRejection,
  type DraftAncillaryItem,
} from './ancillaryItemEdit';

// The S5 create/edit modal (spec/items/ui-surface.md § S5). One surface for
// both modes; the list mounts it fresh per open (props.editor snapshots the
// opening state), so the form seeds once — Save & Next (add mode only)
// advances INSIDE the mounted modal by reseeding signals, never a remount
// (kdd/solid-reactivity-pitfalls § no remounts; mirrors LocationEditModal.tsx).

export type AncillaryRow = {
  id: string;
  itemQuantity: number;
  ancillaryQuantity: number;
  ancillaryItem: { id: string; code: string; name: string } | null;
};

/** What the modal was opened on: a fresh add, or a clicked table row. */
export type AncillaryEditorState =
  { mode: 'create' } | { mode: 'edit'; row: AncillaryRow };

export interface AncillaryItemEditModalProps {
  storeId: string;
  /** The item whose ancillary-supply links this modal edits (the principal). */
  principalItemId: string;
  /** Snapshot at open — the modal seeds its form from it once. */
  editor: AncillaryEditorState;
  /** Every existing link's ancillary item id — excluded from the picker
   * alongside the principal (client mirror of the no-self-link/no-duplicate
   * rules; the server remains the guard). */
  existingAncillaryItemIds: string[];
  onClose: () => void;
  /** A save landed — the panel re-queries so the table reflects it. */
  onSaved: () => void;
}

export const AncillaryItemEditModal: Component<
  AncillaryItemEditModalProps
> = props => {
  const isEdit = () => props.editor.mode === 'edit';
  const editedRow = (): AncillaryRow | undefined =>
    props.editor.mode === 'edit' ? props.editor.row : undefined;

  const [form, setForm] = createSignal<DraftAncillaryItem>(
    props.editor.mode === 'edit'
      ? {
          ancillaryItemId: props.editor.row.ancillaryItem?.id ?? null,
          itemQuantity: props.editor.row.itemQuantity,
          ancillaryQuantity: props.editor.row.ancillaryQuantity,
        }
      : EMPTY_FORM
  );
  // Which affordance is mid-save ('ok' | 'next'), or null — drives each
  // button's own busy spinner and blocks re-entry/dismissal (D22).
  const [saving, setSaving] = createSignal<'ok' | 'next' | null>(null);
  // The inline save-rejection banner — dialog stays open with entries intact
  // (D21/D22).
  const [rejection, setRejection] = createSignal<string>();

  const excludeItemIds = (): string[] => [
    props.principalItemId,
    ...props.existingAncillaryItemIds,
  ];

  const selectedItem = () => {
    const row = editedRow();
    return row?.ancillaryItem
      ? {
          id: row.ancillaryItem.id,
          code: row.ancillaryItem.code,
          name: row.ancillaryItem.name,
        }
      : undefined;
  };

  const save = async (advance: boolean) => {
    if (saving() || !isFormValid(form(), props.principalItemId)) return;
    setSaving(advance ? 'next' : 'ok');
    setRejection(undefined);

    const result = await graphqlFetch(UpsertAncillaryItem, {
      storeId: props.storeId,
      input: buildUpsertInput(
        form(),
        props.principalItemId,
        editedRow()?.id ?? generateUUID()
      ),
    });
    if (result.kind !== 'success') {
      // Transport/unexpected/forbidden → the global modal already surfaced
      // it; stay open so entries aren't lost.
      setSaving(null);
      return;
    }

    const upserted: UpsertAncillaryItemResult['centralServer']['ancillaryItem']['upsertAncillaryItem'] =
      result.data.centralServer.ancillaryItem.upsertAncillaryItem;
    setSaving(null);
    if (upserted.__typename === 'UpsertAncillaryItemError') {
      setRejection(rejectionMessage(saveRejection(upserted.error)));
      return;
    }

    props.onSaved();
    if (!advance) {
      // Success closes the dialog — closure IS the confirmation (D21).
      props.onClose();
      return;
    }
    // Save & Next (add mode only, ui-surface S5): reset to a fresh blank
    // form for another link, without returning to the list.
    setForm(EMPTY_FORM);
  };

  return (
    <Dialog
      open
      testId="ancillary-item-edit-modal"
      title={t('title.ancillary-supply')}
      icon={isEdit() ? undefined : <PlusCircleIcon />}
      dismissable={saving() === null}
      onClose={props.onClose}
      footer={
        <Show when={rejection()}>
          {message => (
            <Alert severity="error" testId="ancillary-item-save-error">
              {message()}
            </Alert>
          )}
        </Show>
      }
      actions={
        <>
          <Show when={saving() === null}>
            <Button
              variant="secondary"
              icon={<XCircleIcon />}
              data-testid="dialog-button-cancel"
              onClick={props.onClose}
            >
              {t('button.cancel')}
            </Button>
          </Show>
          <Button
            icon={<CheckIcon />}
            data-testid="dialog-button-ok"
            loading={saving() === 'ok'}
            disabled={
              !isFormValid(form(), props.principalItemId) || saving() !== null
            }
            onClick={() => void save(false)}
          >
            {t('button.save')}
          </Button>
          <Show when={!isEdit()}>
            <Button
              icon={<ArrowRightIcon />}
              iconPosition="end"
              data-testid="dialog-button-save-and-next"
              loading={saving() === 'next'}
              disabled={
                !isFormValid(form(), props.principalItemId) || saving() !== null
              }
              onClick={() => void save(true)}
            >
              {t('button.save-and-next')}
            </Button>
          </Show>
        </>
      }
    >
      {/* Ancillary item — the item catalogue lookup, excluding the principal
          and every item already linked; locked when editing (ui-surface S5). */}
      <ItemSearch
        label={t('label.ancillary-item')}
        storeId={props.storeId}
        excludeItemIds={excludeItemIds()}
        value={form().ancillaryItemId ?? undefined}
        selectedItem={selectedItem()}
        disabled={isEdit() || saving() !== null}
        onSelect={item =>
          setForm({ ...form(), ancillaryItemId: item?.id ?? null })
        }
      />
      <div style={{ display: 'flex', 'align-items': 'center', gap: '0.5rem' }}>
        <NumberField
          label={t('label.ratio')}
          min={0}
          decimalLimit={4}
          disabled={saving() !== null}
          value={form().itemQuantity}
          onChange={itemQuantity =>
            setForm({ ...form(), itemQuantity: itemQuantity ?? 0 })
          }
        />
        <Text>:</Text>
        <NumberField
          label={t('label.ratio')}
          hideLabel
          min={0}
          decimalLimit={4}
          disabled={saving() !== null}
          helperText={t('description.ancillary-ratio')}
          value={form().ancillaryQuantity}
          onChange={ancillaryQuantity =>
            setForm({ ...form(), ancillaryQuantity: ancillaryQuantity ?? 0 })
          }
        />
      </div>
    </Dialog>
  );
};

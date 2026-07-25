import { Show, type Component } from 'solid-js';
import { t } from '../intl';
import { Dialog } from '../ui/elements/feedback/Dialog';
import { Button } from '../ui/elements/buttons/Button';
import { TextField } from '../ui/elements/inputs/TextField';
import { ItemSearch } from '../domain/item';
import { PlusCircleIcon, XCircleIcon } from '../ui/icons';

// The item a row click opens the editor on — the identity fields the selector
// and the read-only Unit field need. Mirrors the ChosenItem shape the real
// InboundShipmentLineEditModal builds, trimmed to what the showcase surfaces.
export type EditItem = {
  id: string;
  code: string;
  name: string;
  unitName: string | null;
};

export interface LineEditModalProps {
  open: boolean;
  onClose: () => void;
  /** The item the click opened on (row click → UPDATE mode). */
  item: EditItem | null;
}

// The showcase item search needs a storeId, but this open is UPDATE mode (the
// selector is disabled — see below), so it never runs a fetch; a placeholder id
// is enough.
const SHOWCASE_STORE_ID = 'showcase';

// A dev-only Line Edit modal for the Detail-table showcase — the SAME assembly
// as the real InboundShipmentLineEditModal (kdd/stocktake-line-editing): a
// large Dialog whose TITLE is the item selector, an "Add batch" affordance in
// the header, and Cancel / OK & next / OK actions. Card-only (no table view) at
// every width. Step 1 wires the shell + selector + Add batch button and leaves
// the batch card/table area as a placeholder; step 2 slots in the grouped
// DataTable built from the inbound line-edit columns.
const Body: Component<LineEditModalProps> = props => (
  <Dialog
    open
    onClose={props.onClose}
    size="large"
    testId="line-edit-modal"
    title={
      // Update mode: the selector shows the clicked item, disabled — so add and
      // edit read as the same surface (matches the real editor).
      <ItemSearch
        label={t('label.item')}
        hideLabel
        storeId={SHOWCASE_STORE_ID}
        value={props.item?.id}
        selectedItem={props.item ?? undefined}
        disabled
        onSelect={() => {}}
      />
    }
    ariaLabel={t('label.edit-line')}
    headerActions={
      <Button icon={<PlusCircleIcon />} data-testid="add-batch-button">
        {t('label.add-batch')}
      </Button>
    }
    actions={
      <>
        <Button
          variant="secondary"
          icon={<XCircleIcon />}
          data-testid="dialog-button-cancel"
          onClick={props.onClose}
        >
          {t('button.cancel')}
        </Button>
        <Button
          variant="secondary"
          data-testid="dialog-button-next-and-ok"
          onClick={props.onClose}
        >
          {t('button.ok-and-next')}
        </Button>
        <Button data-testid="dialog-button-ok" onClick={props.onClose}>
          {t('button.ok')}
        </Button>
      </>
    }
  >
    {/* Read-only Unit field follows the selector (spec S4). */}
    <Show when={props.item?.unitName}>
      <TextField
        label={t('label.unit')}
        value={props.item?.unitName ?? ''}
        disabled
      />
    </Show>
    {/* Placeholder for the batch card/table area — filled in step 2 with the
        grouped DataTable (batch panel + Pricing / Other disclosures). */}
    <div
      style={{
        display: 'flex',
        'align-items': 'center',
        'justify-content': 'center',
        'min-height': '12rem',
        border: '1px dashed var(--color-border)',
        'border-radius': 'var(--radius-md)',
        color: 'var(--text-secondary)',
      }}
    >
      Batch card / table area
    </div>
  </Dialog>
);

export const LineEditModal: Component<LineEditModalProps> = props => (
  // A fresh mount per open, keyed on the item id, so switching items rebuilds
  // the draft (kdd/solid-reactivity-pitfalls — no leaked state). Sets up the
  // shape step 2's per-item batch draft will rely on.
  <Show when={props.open && (props.item?.id ?? 'add')} keyed>
    <Body {...props} />
  </Show>
);

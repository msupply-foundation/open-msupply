import { createSignal, Show, type Component } from 'solid-js';
import { t } from '../../../../intl';
import { Dialog } from '../../../../ui/elements/feedback/Dialog';
import { createFocusTarget } from '../../../../ui/utils/createFocusTarget';
import { Alert } from '../../../../ui/elements/feedback/Alert';
import { Button } from '../../../../ui/elements/buttons/Button';
import { MasterListSelect } from '../../../../domain/masterList';
import { XCircleIcon } from '../../../../ui/icons';
import { addFromMasterList } from '../inboundShipmentUpdate';

export interface AddFromMasterListModalProps {
  open: boolean;
  onClose: () => void;
  storeId: string;
  invoiceId: string;
  onAdded: () => void;
}

// Bulk-add empty stock lines from a master list (spec AC-ML1). Offered only
// while New and not PO-linked (the toolbar gates the trigger; the server also
// enforces). One empty line per stock item on the list not already present.
export const AddFromMasterListModal: Component<
  AddFromMasterListModalProps
> = props => (
  <Show when={props.open}>
    <Body {...props} />
  </Show>
);

const Body: Component<AddFromMasterListModalProps> = props => {
  const [masterListId, setMasterListId] = createSignal<string>();
  const [saving, setSaving] = createSignal(false);
  const [errorMessage, setErrorMessage] = createSignal<string>();

  const add = async () => {
    const id = masterListId();
    if (!id || saving()) return;
    setSaving(true);
    setErrorMessage(undefined);
    const result = await addFromMasterList(props.storeId, props.invoiceId, id);
    setSaving(false);
    if (result.ok) {
      props.onAdded();
      props.onClose();
    } else if (result.message) {
      setErrorMessage(result.message);
    } else {
      props.onClose();
    }
  };

  // The master-list picker is this dialog's only control, so the dialog opens on it
  // (ui-standards › accessibility › keyboard).
  const picker = createFocusTarget();

  return (
    <Dialog
      open
      initialFocus={picker}
      dismissable={!saving()}
      onClose={props.onClose}
      title={t('label.add-from-master-list')}
      testId="add-master-list-modal"
      actionsLead={
        <Show when={errorMessage()}>
          <Alert severity="error">{errorMessage()}</Alert>
        </Show>
      }
      actions={
        <>
          <Button
            variant="secondary"
            icon={<XCircleIcon />}
            confirms="cancel"
            onClick={props.onClose}
          >
            {t('button.cancel')}
          </Button>
          <Button
            confirms="plain"
            data-testid="dialog-button-ok"
            loading={saving()}
            disabled={!masterListId()}
            onClick={() => void add()}
          >
            {t('button.ok')}
          </Button>
        </>
      }
    >
      <MasterListSelect
        label={t('label.master-list')}
        focusTarget={picker}
        value={masterListId()}
        onChange={id => setMasterListId(id ?? undefined)}
      />
    </Dialog>
  );
};

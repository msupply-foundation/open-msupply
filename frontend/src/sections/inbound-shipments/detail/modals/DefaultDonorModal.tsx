import { createSignal, Show, type Component } from 'solid-js';
import { t } from '../../../../intl';
import { Dialog } from '../../../../ui/elements/feedback/Dialog';
import { Alert } from '../../../../ui/elements/feedback/Alert';
import {
  CancelButton,
  DialogSaveButton,
} from '../../../../ui/elements/buttons/StandardButtons';
import { RadioGroup } from '../../../../ui/elements/inputs/RadioGroup';
import { NameSearch, type NameSeed } from '../../../../domain/name';
import { updateInboundShipment } from '../inboundShipmentUpdate';
import type { InboundInfoFragment } from '../inboundShipmentDetail.generated';

export interface DefaultDonorModalProps {
  open: boolean;
  onClose: () => void;
  storeId: string;
  node: InboundInfoFragment;
  /** Which update twin to write through — the scope the route carries. */
  isExternal: boolean;
  onSaved: (node: InboundInfoFragment) => void;
}

// The default-donor modal (spec S5): a donor lookup + an apply-to-lines choice.
// Sets the shipment-level default donor and applies it to existing lines per
// the chosen mode (rules → default donor). A new line with no donor inherits
// the default. Donor + status can't be set together (server rule) — this modal
// never touches status.
type ApplyMode =
  'NONE' | 'UPDATE_EXISTING_DONOR' | 'ASSIGN_IF_NONE' | 'ASSIGN_TO_ALL';

export const DefaultDonorModal: Component<DefaultDonorModalProps> = props => (
  <Show when={props.open}>
    <Body {...props} />
  </Show>
);

const Body: Component<DefaultDonorModalProps> = props => {
  const [donor, setDonor] = createSignal<NameSeed | null>(
    props.node.defaultDonor
      ? {
          id: props.node.defaultDonor.id,
          name: props.node.defaultDonor.name,
        }
      : null
  );
  const [applyToLines, setApplyToLines] = createSignal<ApplyMode>('NONE');
  const [saving, setSaving] = createSignal(false);
  const [errorMessage, setErrorMessage] = createSignal<string>();

  const save = async () => {
    if (saving()) return;
    setSaving(true);
    setErrorMessage(undefined);
    const result = await updateInboundShipment(
      props.storeId,
      props.isExternal,
      {
        id: props.node.id,
        defaultDonor: {
          donorId: donor()?.id ?? null,
          applyToLines: applyToLines(),
        },
      }
    );
    setSaving(false);
    if (result.kind === 'saved') {
      props.onSaved(result.node);
      props.onClose();
    } else if (result.kind === 'error') {
      setErrorMessage(result.message);
    }
  };

  return (
    <Dialog
      open
      dismissable={!saving()}
      onClose={props.onClose}
      title={t('label.donor')}
      testId="default-donor-modal"
      // Room for the donor lookup's open listbox inside the dialog (#1029):
      // header + field + the listbox's 18rem cap + padding.
      minBodyHeightRem={27}
      actionsLead={
        <Show when={errorMessage()}>
          <Alert severity="error">{errorMessage()}</Alert>
        </Show>
      }
      actions={
        // Cancel · Save (spec S5 layout), icon-less (D55).
        <>
          <CancelButton
            data-testid="dialog-button-cancel"
            onClick={props.onClose}
          />
          <DialogSaveButton
            data-testid="dialog-button-ok"
            loading={saving()}
            onClick={() => void save()}
          />
        </>
      }
    >
      <NameSearch
        label={t('label.donor')}
        storeId={props.storeId}
        role="donor"
        selected={donor() ?? undefined}
        onSelect={setDonor}
      />
      <RadioGroup
        label={t('label.apply-to-lines')}
        value={applyToLines()}
        onChange={value => setApplyToLines(value as ApplyMode)}
        options={[
          { value: 'ASSIGN_TO_ALL', label: t('label.donor-apply-all') },
          {
            value: 'UPDATE_EXISTING_DONOR',
            label: t('label.donor-apply-existing'),
          },
          { value: 'ASSIGN_IF_NONE', label: t('label.donor-apply-if-none') },
          { value: 'NONE', label: t('label.donor-apply-none') },
        ]}
      />
    </Dialog>
  );
};

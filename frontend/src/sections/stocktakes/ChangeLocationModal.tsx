import { createSignal, type Component } from 'solid-js';
import { t } from '../../intl';
import { Dialog } from '../../ui/elements/feedback/Dialog';
import { Button } from '../../ui/elements/buttons/Button';
import { FieldRow } from '../../ui/elements/inputs/FieldRow';
import { CheckIcon, XCircleIcon } from '../../ui/icons';
import { LocationSelect } from '../../domain/location';

// Change-location selection action (OMS): pick one location and apply it to every selected line.
// A location Combobox in a Dialog; confirming emits the chosen location id (or null to clear).
// The view runs the bulk line update and reflects it in place.

export interface ChangeLocationModalProps {
  open: boolean;
  onClose: () => void;
  /** Apply the chosen location id (null = no location) to the selected lines. */
  onConfirm: (locationId: string | null) => void;
}

export const ChangeLocationModal: Component<ChangeLocationModalProps> = (props) => {
  const [locationId, setLocationId] = createSignal<string | null>(null);

  return (
    <Dialog
      open={props.open}
      onClose={props.onClose}
      title={t('stocktake.lines.confirm-title')}
      description={t('stocktake.lines.change-location-message')}
      actions={
        <>
          <Button variant="secondary" icon={<XCircleIcon />} onClick={props.onClose}>
            {t('common.cancel')}
          </Button>
          <Button
            variant="primary"
            icon={<CheckIcon />}
            onClick={() => {
              props.onConfirm(locationId());
              props.onClose();
            }}
          >
            {t('common.apply')}
          </Button>
        </>
      }
    >
      <FieldRow label={t('stocktake.line-edit.location')}>
        <LocationSelect
          label={t('stocktake.line-edit.location')}
          hideLabel
          value={locationId() ?? undefined}
          placeholder={t('stocktake.line-edit.location-none')}
          onChange={(l) => setLocationId(l?.id ?? null)}
        />
      </FieldRow>
    </Dialog>
  );
};

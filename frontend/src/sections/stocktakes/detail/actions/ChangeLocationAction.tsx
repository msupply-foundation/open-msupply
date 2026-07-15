import { createSignal, Show, type Component } from 'solid-js';
import { t } from '../../../../intl';
import { Dialog } from '../../../../ui/elements/feedback/Dialog';
import { Button } from '../../../../ui/elements/buttons/Button';
import { FieldRow } from '../../../../ui/elements/inputs/FieldRow';
import { CheckIcon, MapPinIcon, XCircleIcon } from '../../../../ui/icons';
import { LocationSelect } from '../../../../domain/location';
import { runBatchStocktakeLines, type LineEditCommit } from '../lines/stocktakeLineUpdate';
import type { LineErrors } from '../lines/stocktakeLineErrors';

export interface ChangeLocationActionProps {
  storeId: string;
  selectedIds: () => string[];
  disabled: boolean;
  /** Apply what committed in place (no refetch). */
  onCommit: (commit: LineEditCommit) => void;
  /** Partial failure — stamp the per-line errors (lineId → typename) and jump to those rows. */
  onError: (errors: LineErrors) => void;
}

// The Change-location selection action: its footer button + a confirm modal holding a LocationSelect
// picker, applying the chosen location to every selected line.
//
// The confirm → working dialog is inline (not via a shared ActionModal) so the whole flow is
// readable in one place (kdd/explicit-composition). On resolution the modal always closes: what
// committed splices in via onCommit, and any failed lines surface on the detail rows via onError.
// The phase lives in <Body>, mounted only while open (fresh per open; a late run() lands on a
// disposed scope).
export const ChangeLocationAction: Component<ChangeLocationActionProps> = (props) => {
  const [open, setOpen] = createSignal(false);
  return (
    <>
      <Button
        variant="secondary"
        icon={<MapPinIcon />}
        disabled={props.disabled}
        onClick={() => setOpen(true)}
      >
        {t('stocktake.lines.change-location')}
      </Button>
      <Show when={open()}>
        <Body {...props} onClose={() => setOpen(false)} />
      </Show>
    </>
  );
};

const Body = (props: ChangeLocationActionProps & { onClose: () => void }) => {
  const [locationId, setLocationId] = createSignal<string | null>(null);
  const [working, setWorking] = createSignal(false);

  const run = async () => {
    if (working()) return; // re-entry guard
    setWorking(true);
    const outcome = await runBatchStocktakeLines(props.storeId, {
      update: props.selectedIds().map((id) => ({ id, location: { value: locationId() } })),
    });
    if (outcome) {
      props.onCommit(outcome.commit);
      if (outcome.errors.size > 0) props.onError(outcome.errors);
    }
    props.onClose();
  };

  return (
    <Dialog
      open
      dismissable={!working()}
      onClose={props.onClose}
      icon={<MapPinIcon />}
      title={t('stocktake.lines.change-location')}
      description={
        <>
          <p>{t('stocktake.lines.change-location-message')}</p>
          <FieldRow label={t('stocktake.line-edit.location')}>
            <LocationSelect
              label={t('stocktake.line-edit.location')}
              hideLabel
              value={locationId() ?? undefined}
              placeholder={t('stocktake.line-edit.location-none')}
              onChange={(l) => setLocationId(l?.id ?? null)}
            />
          </FieldRow>
        </>
      }
      actions={
        <>
          <Show when={!working()}>
            <Button variant="secondary" icon={<XCircleIcon />} onClick={props.onClose}>
              {t('common.cancel')}
            </Button>
          </Show>
          <Button variant="primary" icon={<CheckIcon />} loading={working()} onClick={() => void run()}>
            {t('common.apply')}
          </Button>
        </>
      }
    />
  );
};

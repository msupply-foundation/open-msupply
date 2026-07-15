import { createSignal, type Component } from 'solid-js';
import { t } from '../../../intl';
import { Button } from '../../../ui/elements/buttons/Button';
import { FieldRow } from '../../../ui/elements/inputs/FieldRow';
import { CheckIcon, MapPinIcon } from '../../../ui/icons';
import { ActionModal, type ActionResult } from '../../../domain/action';
import { LocationSelect } from '../../../domain/location';
import { runBatchStocktakeLines, type LineEditCommit } from '../stocktakeLineUpdate';
import type { LineErrors } from '../stocktakeLineErrors';
import { lineActionResult } from './lineActionResult';

export interface ChangeLocationActionProps {
  storeId: string;
  selectedIds: () => string[];
  disabled: boolean;
  /** Apply what committed in place (no refetch). */
  onCommit: (commit: LineEditCommit) => void;
  /** Stamp the per-line errors (lineId → typename) so the failed rows show them. */
  onErrors: (errors: LineErrors) => void;
  onShowErrors: (lineIds: string[]) => void;
}

// The Change-location selection action: its footer button + a confirm modal holding a LocationSelect
// picker, applying the chosen location to every selected line. Owns its open + picker state.
export const ChangeLocationAction: Component<ChangeLocationActionProps> = (props) => {
  const [open, setOpen] = createSignal(false);
  const [locationId, setLocationId] = createSignal<string | null>(null);

  const run = async (): Promise<ActionResult> => {
    const outcome = await runBatchStocktakeLines(props.storeId, {
      update: props.selectedIds().map((id) => ({ id, location: { value: locationId() } })),
    });
    if (outcome) {
      props.onCommit(outcome.commit);
      props.onErrors(outcome.errors);
    }
    return lineActionResult(outcome);
  };

  return (
    <>
      <Button
        variant="secondary"
        icon={<MapPinIcon />}
        disabled={props.disabled}
        onClick={() => {
          setLocationId(null);
          setOpen(true);
        }}
      >
        {t('stocktake.lines.change-location')}
      </Button>
      <ActionModal
        open={open()}
        onClose={() => setOpen(false)}
        icon={<MapPinIcon />}
        title={t('stocktake.lines.change-location')}
        confirmLabel={t('common.apply')}
        confirmIcon={<CheckIcon />}
        run={run}
        successMessage={t('stocktake.lines.change-location-success')}
        onShowErrors={props.onShowErrors}
      >
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
      </ActionModal>
    </>
  );
};

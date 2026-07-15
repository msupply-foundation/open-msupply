import { createSignal, type Component } from 'solid-js';
import { t } from '../../../intl';
import { Button } from '../../../ui/elements/buttons/Button';
import { FieldRow } from '../../../ui/elements/inputs/FieldRow';
import { CheckIcon, MapPinIcon } from '../../../ui/icons';
import { SelectionActionModal, type SelectionActionResult } from '../../../domain/selection';
import { LocationSelect } from '../../../domain/location';
import type { StocktakeLineFragment } from '../stocktakeDetail.generated';
import { updateStocktakeLines } from '../stocktakeUpdate';

export interface ChangeLocationActionProps {
  storeId: string;
  selectedIds: () => string[];
  disabled: boolean;
  /** The updated lines — the view splices them back into its rows (no refetch). */
  onUpdated: (lines: StocktakeLineFragment[]) => void;
  onError: (message: string, lineIds: string[]) => void;
  onShowErrors: (lineIds: string[]) => void;
}

// The Change-location selection action: its footer button + a confirm modal holding a LocationSelect
// picker, applying the chosen location to every selected line. Owns its open + picker state.
export const ChangeLocationAction: Component<ChangeLocationActionProps> = (props) => {
  const [open, setOpen] = createSignal(false);
  const [locationId, setLocationId] = createSignal<string | null>(null);

  const run = async (): Promise<SelectionActionResult> => {
    const result = await updateStocktakeLines(
      props.storeId,
      props.selectedIds().map((id) => ({ id, location: { value: locationId() } })),
    );
    if (result.kind === 'failed') return { kind: 'ok' };
    props.onUpdated(result.updated);
    if (result.kind === 'partial') {
      props.onError(result.error.message, result.error.lineIds);
      return { kind: 'error', message: result.error.message, lineIds: result.error.lineIds };
    }
    return { kind: 'ok' };
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
      <SelectionActionModal
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
      </SelectionActionModal>
    </>
  );
};

import { createSignal, Match, Show, Switch, type Component } from 'solid-js';
import { t, tPlural } from '@/intl';
import { Dialog } from '@/ui/elements/feedback/Dialog';
import { createFocusTarget } from '@/ui/utils/createFocusTarget';
import { Alert } from '@/ui/elements/feedback/Alert';
import { Button } from '@/ui/elements/buttons/Button';
import { CancelButton } from '@/ui/elements/buttons/StandardButtons';
import { FieldRow } from '@/ui/elements/inputs/FieldRow';
import { MapPinIcon } from '@/ui/icons';
import {
  LocationVolumeSelect,
  type LocationWithVolume,
} from '@/domain/location';
import {
  runBatchStocktakeLines,
  type LineEditCommit,
} from '../lines/stocktakeLineUpdate';
import type { LineErrors } from '../lines/stocktakeLineErrors';

export interface ChangeLocationActionProps {
  storeId: string;
  selectedIds: () => string[];
  disabled: boolean;
  /** The store's locations with capacity (fetched by the detail view). */
  locations: LocationWithVolume[];
  /**
   * Total volume of the selected lines — the picker's "Available" filter keeps
   * only locations with room for the whole move.
   */
  requiredVolume?: () => number;
  /** Apply what committed in place (no refetch). */
  onCommit: (commit: LineEditCommit) => void;
  /**
   * Partial failure — stamp the per-line errors (lineId → typename) so the
   * rows show them.
   */
  onError: (errors: LineErrors) => void;
  /**
   * The error phase's "Show error lines": filter the list to the stamped error
   * lines.
   */
  onShowErrors: () => void;
}

// The Change-location selection action: its footer button + a confirm →
// working → error modal holding a LocationVolumeSelect picker,
// applying the chosen location to every selected line.
//
// Written inline (not via a shared ActionModal) so the whole flow is readable
// in one place (kdd/explicit-composition). What committed splices in via
// onCommit; a partial failure stamps the offending lines (onError → rows show
// them) and the error phase offers "Show error lines" (onShowErrors). The phase
// lives in <Body>, mounted only while open (fresh per open; a late run() lands
// on a disposed scope).
export const ChangeLocationAction: Component<
  ChangeLocationActionProps
> = props => {
  const [open, setOpen] = createSignal(false);
  return (
    <>
      <Button
        variant="secondary"
        icon={<MapPinIcon />}
        disabled={props.disabled}
        data-testid="change-location-button"
        onClick={() => setOpen(true)}
      >
        {t('button.change-location')}
      </Button>
      <Show when={open()}>
        <Body {...props} onClose={() => setOpen(false)} />
      </Show>
    </>
  );
};

// No success phase: a clean apply CLOSES the dialog — closure is the
// confirmation and the rows' new location behind it is the visible result
// (spec/ui-standards/controls.md § dialogs, D22; § action feedback, D21).
type Phase = 'confirm' | 'working' | 'error';

const Body = (props: ChangeLocationActionProps & { onClose: () => void }) => {
  const [locationId, setLocationId] = createSignal<string | null>(null);
  const [phase, setPhase] = createSignal<Phase>('confirm');
  const [errorCount, setErrorCount] = createSignal(0);

  const run = async () => {
    if (phase() !== 'confirm') return; // re-entry guard
    setPhase('working');
    const outcome = await runBatchStocktakeLines(props.storeId, {
      update: props
        .selectedIds()
        .map(id => ({ id, location: { value: locationId() } })),
    });
    if (!outcome) return props.onClose();
    props.onCommit(outcome.commit);
    // Clean apply: close — the rows already show their new location.
    if (outcome.errors.size === 0) return props.onClose();
    props.onError(outcome.errors); // stamp so the rows show the errors too
    setErrorCount(outcome.errors.size);
    setPhase('error');
  };

  // The location picker is the confirm phase's only control, so the dialog
  // opens on it (ui-standards › accessibility › keyboard).
  const locationPicker = createFocusTarget();

  return (
    <Dialog
      open
      initialFocus={locationPicker}
      dismissable={phase() !== 'working'}
      onClose={props.onClose}
      icon={<MapPinIcon />}
      testId="confirmation-modal"
      title={t('button.change-location')}
      description={
        <Switch
          fallback={
            <>
              <p>{t('messages.confirm-change-location')}</p>
              <FieldRow label={t('label.location')}>
                <LocationVolumeSelect
                  label={t('label.location')}
                  hideLabel
                  focusTarget={locationPicker}
                  locations={props.locations}
                  value={locationId() ?? undefined}
                  requiredVolume={props.requiredVolume?.()}
                  onChange={l => setLocationId(l?.id ?? null)}
                />
              </FieldRow>
            </>
          }
        >
          <Match when={phase() === 'error'}>
            <Alert severity="error">
              {tPlural('messages.line-errors', errorCount())}
            </Alert>
          </Match>
        </Switch>
      }
      actions={
        <Switch
          fallback={
            // confirm / working: Cancel (hidden while working) + the loading
            // Apply.
            <>
              <Show when={phase() === 'confirm'}>
                <CancelButton
                  data-testid="dialog-button-cancel"
                  onClick={props.onClose}
                />
              </Show>
              <Button
                variant="primary"
                loading={phase() === 'working'}
                data-testid="dialog-button-ok"
                onClick={() => void run()}
              >
                {t('button.apply')}
              </Button>
            </>
          }
        >
          <Match when={phase() === 'error'}>
            <CancelButton
              data-testid="dialog-button-cancel"
              onClick={props.onClose}
            />
            <Button
              variant="primary"
              onClick={() => {
                props.onShowErrors();
                props.onClose();
              }}
            >
              {t('button.show-error-lines')}
            </Button>
          </Match>
        </Switch>
      }
    />
  );
};

import { createSignal, Match, Show, Switch, type Component } from 'solid-js';
import { t, tPlural } from '../../../../intl';
import { Dialog } from '../../../../ui/elements/feedback/Dialog';
import { Alert } from '../../../../ui/elements/feedback/Alert';
import { Button } from '../../../../ui/elements/buttons/Button';
import { FieldRow } from '../../../../ui/elements/inputs/FieldRow';
import {
  CheckIcon,
  MapPinIcon,
  SearchIcon,
  XCircleIcon,
} from '../../../../ui/icons';
import { LocationSelect } from '../../../../domain/location';
import {
  runBatchStocktakeLines,
  type LineEditCommit,
} from '../lines/stocktakeLineUpdate';
import type { LineErrors } from '../lines/stocktakeLineErrors';

export interface ChangeLocationActionProps {
  storeId: string;
  selectedIds: () => string[];
  disabled: boolean;
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
// working → success | error modal holding a LocationSelect picker, applying the
// chosen location to every selected line.
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

type Phase = 'confirm' | 'working' | 'success' | 'error';

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
    if (outcome.errors.size === 0) return setPhase('success');
    props.onError(outcome.errors); // stamp so the rows show the errors too
    setErrorCount(outcome.errors.size);
    setPhase('error');
  };

  return (
    <Dialog
      open
      dismissable={phase() !== 'working'}
      onClose={props.onClose}
      icon={<MapPinIcon />}
      title={t('button.change-location')}
      description={
        <Switch
          fallback={
            <>
              <p>{t('messages.confirm-change-location')}</p>
              <FieldRow label={t('label.location')}>
                <LocationSelect
                  label={t('label.location')}
                  hideLabel
                  value={locationId() ?? undefined}
                  onChange={l => setLocationId(l?.id ?? null)}
                />
              </FieldRow>
            </>
          }
        >
          <Match when={phase() === 'success'}>
            {tPlural('messages.changed-location', props.selectedIds().length)}
          </Match>
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
                <Button
                  variant="secondary"
                  icon={<XCircleIcon />}
                  onClick={props.onClose}
                >
                  {t('button.cancel')}
                </Button>
              </Show>
              <Button
                variant="primary"
                icon={<CheckIcon />}
                loading={phase() === 'working'}
                onClick={() => void run()}
              >
                {t('button.apply')}
              </Button>
            </>
          }
        >
          <Match when={phase() === 'success'}>
            <Button
              variant="secondary"
              icon={<CheckIcon />}
              onClick={props.onClose}
            >
              {t('button.ok')}
            </Button>
          </Match>
          <Match when={phase() === 'error'}>
            <Button
              variant="secondary"
              icon={<XCircleIcon />}
              onClick={props.onClose}
            >
              {t('button.cancel')}
            </Button>
            <Button
              variant="primary"
              icon={<SearchIcon />}
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

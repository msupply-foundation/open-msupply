import { createSignal, Match, Show, Switch, type Component } from 'solid-js';
import { t } from '../../../../intl';
import { Dialog } from '../../../../ui/elements/feedback/Dialog';
import { Alert } from '../../../../ui/elements/feedback/Alert';
import { Button } from '../../../../ui/elements/buttons/Button';
import { MapPinIcon, XCircleIcon } from '../../../../ui/icons';
import {
  LocationVolumeSelect,
  type LocationWithVolume,
} from '../../../../domain/location';
import { runInboundBatch } from '../inboundShipmentUpdate';
import type { LineActionProps } from './DeleteLinesAction';

// Bulk "change location" (spec S3 → line-selection actions): set the location
// of every selected line. A batch update using the NullableStringUpdate
// wrapper. Locations are fetched by the detail view and passed in.
type Phase = 'confirm' | 'working' | 'error';

export const ChangeLocationAction: Component<
  LineActionProps & { locations: LocationWithVolume[] }
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

const Body = (
  props: LineActionProps & {
    locations: LocationWithVolume[];
    onClose: () => void;
  }
) => {
  const [phase, setPhase] = createSignal<Phase>('confirm');
  const [locationId, setLocationId] = createSignal<string>();
  const [errorMessage, setErrorMessage] = createSignal<string>();

  const run = async () => {
    if (phase() !== 'confirm') return;
    setPhase('working');
    const outcome = await runInboundBatch(props.storeId, props.isExternal, {
      updateInboundShipmentLines: props.selectedIds().map(id => ({
        id,
        location: { value: locationId() ?? null },
      })),
    });
    if (!outcome) return props.onClose();
    if (outcome.errors.size > 0) {
      props.onError(outcome.errors);
      setErrorMessage([...outcome.errors.values()][0]);
      setPhase('error');
      return;
    }
    props.onChanged();
    props.onClose();
  };

  return (
    <Dialog
      open
      dismissable={phase() !== 'working'}
      onClose={props.onClose}
      icon={<MapPinIcon />}
      testId="change-location-modal"
      title={t('button.change-location')}
      actionsLead={
        <Show when={phase() === 'error'}>
          <Alert severity="error">{errorMessage()}</Alert>
        </Show>
      }
      actions={
        <Switch
          fallback={
            <>
              <Button
                variant="secondary"
                icon={<XCircleIcon />}
                onClick={props.onClose}
              >
                {t('button.cancel')}
              </Button>
              <Button
                data-testid="dialog-button-ok"
                loading={phase() === 'working'}
                onClick={() => void run()}
              >
                {t('button.ok')}
              </Button>
            </>
          }
        >
          <Match when={phase() === 'error'}>
            <Button onClick={props.onClose}>{t('button.close')}</Button>
          </Match>
        </Switch>
      }
    >
      <LocationVolumeSelect
        label={t('label.location')}
        locations={props.locations}
        value={locationId()}
        onChange={location => setLocationId(location?.id)}
      />
    </Dialog>
  );
};

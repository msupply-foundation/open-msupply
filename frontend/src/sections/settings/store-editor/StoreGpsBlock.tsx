import { createEffect, createSignal, Show } from 'solid-js';
import { Button } from '../../../ui/elements/buttons/Button';
import { Alert } from '../../../ui/elements/feedback/Alert';
import { Text } from '../../../ui/elements/typography/Text';
import { LabelledValue } from '../../../ui/elements/typography/LabelledValue';
import { FormSection } from '../../../ui/layout/Form/FormSection';
import { Stack } from '../../../ui/layout/Stack/Stack';
import { HStack } from '../../../ui/layout/Stack/HStack';
import { MapPinIcon } from '../../../ui/icons';
import { t, type LocaleKey } from '../../../intl';
import {
  formatCoordinate,
  geolocationErrorKey,
  hasCoordinates,
  haversineKm,
  roundCoordinate,
} from './storeEditorLogic';

/*
 * The GPS group of the store editor's identity block (spec/settings/rules.md
 * § GPS coordinates, ui-surface § S5):
 *
 *  - The recorded pair shows READ-ONLY, decimal beside its degrees-minutes-
 *    seconds form. Exactly 0,0 is indistinguishable from "never recorded" and
 *    renders as such.
 *  - "Update live location" reads this device's position, rounds it, and
 *    STAGES it into the draft — persisted only by Save, discarded by Cancel.
 *  - Opening with coordinates recorded reads the device position to compute
 *    "Your distance (km)", so the browser may prompt for location permission
 *    on open (captured as-is).
 *  - A geolocation failure shows its reason only while NO coordinates are
 *    recorded; with coordinates present the failure is silent and the stale
 *    distance remains (captured as-is).
 */
export const StoreGpsBlock = (props: {
  latitude: number;
  longitude: number;
  /** No store-properties permission → the capture affordance is blocked. */
  disabled: boolean;
  /** Stage a captured position into the draft (OMS-REG-SET-05.32). */
  onCapture: (latitude: number, longitude: number) => void;
}) => {
  const [fetching, setFetching] = createSignal(false);
  const [distanceKm, setDistanceKm] = createSignal<number>();
  const [errorKey, setErrorKey] = createSignal<LocaleKey>();

  // This device's position, web only — Capacitor's native geolocation path is
  // the Android build's business, and this front end runs in the browser.
  const readPosition = (
    onPosition: (position: GeolocationPosition) => void
  ) => {
    setErrorKey(undefined);
    if (!('geolocation' in navigator)) {
      setErrorKey('error.geolocation-not-supported');
      return;
    }
    setFetching(true);
    navigator.geolocation.getCurrentPosition(
      position => {
        setFetching(false);
        onPosition(position);
      },
      error => {
        setFetching(false);
        setErrorKey(geolocationErrorKey(error.code));
      },
      {
        enableHighAccuracy: true,
        // A bound on the read, unlike the reference client's unbounded call.
        // Without one, a permission prompt the user never answers leaves this
        // block in its "fetching" state forever — with the coordinates hidden
        // behind it. The spec already names the timed-out reason
        // (`error.timeout`), so bounding the read is what makes that captured
        // failure reachable rather than dead copy. Generous enough for a first
        // high-accuracy GPS fix on a tablet, which is the slow case.
        timeout: 30_000,
      }
    );
  };

  // Distance is measured against whatever the draft currently holds — so
  // capturing a live location re-measures (it lands ~0 km away) without the
  // capture and the measurement sharing a request.
  createEffect(() => {
    const latitude = props.latitude;
    const longitude = props.longitude;
    if (!hasCoordinates(latitude, longitude)) return;
    readPosition(position =>
      setDistanceKm(
        haversineKm(
          { latitude, longitude },
          {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          }
        )
      )
    );
  });

  return (
    // A titled field group of the store editor's form — its heading is the
    // section's, and each recorded coordinate is a read-only labelled value
    // (label above, no input chrome), so the group lines up with the property
    // fields below it (D114). The dialog's identity header owns the h2, so this
    // top-level group takes h3 while keeping the group treatment.
    <FormSection
      title={t('label.gps-coordinates')}
      headingLevel="h3"
      heading="group"
    >
      <Show
        when={!fetching()}
        fallback={<Text>{t('label.fetching-coordinates')}</Text>}
      >
        {/* The reason for a failed read is worth words only while there is
            nothing recorded to fall back on. */}
        <Show
          when={
            hasCoordinates(props.latitude, props.longitude)
              ? undefined
              : errorKey()
          }
        >
          {key => (
            <Alert severity="error" testId="store-editor-geolocation-error">
              {t(key())}
            </Alert>
          )}
        </Show>
        <HStack align="end" justify="between">
          <Stack gap="sm">
            {/* The test id stays on the VALUE, not the labelled block: the
                e2e contract reads this node's text as the coordinate alone
                (e2e/TESTIDS.md), and the block's text now includes its label. */}
            <LabelledValue variant="field" label={t('label.latitude')}>
              <span data-testid="store-editor-latitude">
                {formatCoordinate(props.latitude, 'latitude')}
              </span>
            </LabelledValue>
            <LabelledValue variant="field" label={t('label.longitude')}>
              <span data-testid="store-editor-longitude">
                {formatCoordinate(props.longitude, 'longitude')}
              </span>
            </LabelledValue>
          </Stack>
          <Button
            variant="secondary"
            icon={<MapPinIcon />}
            disabled={props.disabled}
            // Staged into the draft, not saved: Save persists it, Cancel
            // discards it (OMS-REG-SET-05.32).
            onClick={() => {
              // Resolved out of props here, in the click itself: the position
              // arrives in a browser callback, outside any tracked scope.
              const stage = props.onCapture;
              readPosition(position =>
                stage(
                  roundCoordinate(position.coords.latitude),
                  roundCoordinate(position.coords.longitude)
                )
              );
            }}
            data-testid="update-live-location"
          >
            {t('label.update-live-location')}
          </Button>
        </HStack>
      </Show>
      <LabelledValue variant="field" label={t('label.distance')}>
        {/* Nothing recorded → nothing to be distant from, so the measurement
            reads 0 rather than lingering from a discarded draft (a capture
            staged and then cancelled). A measurement against coordinates that
            ARE recorded is kept even when a later read fails — the stale
            distance remains, by design (rules § GPS coordinates). */}
        <span data-testid="store-editor-distance">
          {hasCoordinates(props.latitude, props.longitude)
            ? (distanceKm() ?? 0)
            : 0}
        </span>
      </LabelledValue>
    </FormSection>
  );
};

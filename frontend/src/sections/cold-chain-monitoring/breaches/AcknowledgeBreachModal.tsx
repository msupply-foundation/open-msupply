import { createSignal, Show } from 'solid-js';
import type { Component } from 'solid-js';
import { graphqlFetch } from '@/api/graphql';
import { localisedDateTime, t } from '@/intl';
import { userDisplayName } from '@/auth/authContext';
import { Dialog } from '@/ui/elements/feedback/Dialog';
import { Alert } from '@/ui/elements/feedback/Alert';
import { CancelButton, OkButton } from '@/ui/elements/buttons/StandardButtons';
import { TextArea } from '@/ui/elements/inputs/TextArea';
import { LabelledValue } from '@/ui/elements/typography/LabelledValue';
import { Text } from '@/ui/elements/typography/Text';
import { InsetPanel } from '@/ui/layout/InsetPanel/InsetPanel';
import { Stack } from '@/ui/layout/Stack/Stack';
import { createFocusTarget } from '@/ui/utils/createFocusTarget';
import { UpdateTemperatureBreach } from '../monitoring.generated';
import {
  formatDuration,
  formatTemperatureValue,
  hasTemperature,
  isOngoing,
  type BreachRow,
} from '../monitoring/breachDisplay';
import {
  acknowledgeState,
  attributionVars,
  buildAcknowledgeInput,
  canConfirm,
} from './acknowledge';

// S3 — Acknowledge breach (spec/cold-chain-monitoring ui-surface S3; rules ›
// acknowledging a breach). A modal over the Breaches tab, mounted fresh per
// open so the comment seeds empty. Details first — a bordered block naming
// the breach — then, by the breach's state, EITHER the ongoing notice (no
// comment field at all, confirm disabled) OR the comment field. Both guards
// are this modal's alone: the server would acknowledge an ongoing breach and
// accept a blank comment (contract).
//
// Success closes the modal; the row's change to Acknowledged and the band's
// falling count are the confirmation (ui-standards › action feedback — no
// toast). A rejection keeps the modal open with the comment intact and states
// the server's reason inline.

export interface AcknowledgeBreachModalProps {
  storeId: string;
  /** Snapshot at open. */
  breach: BreachRow;
  onClose: () => void;
  /** The acknowledgement landed — re-read the list and the band. */
  onAcknowledged: () => void;
}

export const AcknowledgeBreachModal: Component<
  AcknowledgeBreachModalProps
> = props => {
  const [comment, setComment] = createSignal('');
  const [saving, setSaving] = createSignal(false);
  const [error, setError] = createSignal<string>();
  const commentField = createFocusTarget();

  const state = () => acknowledgeState(props.breach);
  const confirmable = () => canConfirm(props.breach, comment());

  const save = async () => {
    if (saving() || !confirmable()) return;
    setSaving(true);
    setError(undefined);
    // The attribution is composed HERE — the server stores the comment
    // verbatim (contract): "Acknowledged by {name} on {date}: {comment}."
    const composed = t(
      'format.comment',
      attributionVars(
        comment(),
        userDisplayName(),
        localisedDateTime(new Date())
      )
    );
    // Every rejection is a top-level error with its reason in the details —
    // the response union has no error member (contract ⚠️ wire trap) — so
    // the errors are taken here and shown in place.
    const result = await graphqlFetch(
      UpdateTemperatureBreach,
      {
        storeId: props.storeId,
        input: buildAcknowledgeInput(props.breach.id, composed),
      },
      { returnGraphqlErrors: true }
    );
    setSaving(false);
    if (result.kind === 'graphqlError') {
      setError(result.message);
      return;
    }
    if (result.kind !== 'success') return;
    props.onAcknowledged();
    props.onClose();
  };

  return (
    <Dialog
      open
      testId="acknowledge-breach-modal"
      title={t('heading.acknowledgeBreach')}
      dismissable={!saving()}
      onClose={props.onClose}
      initialFocus={state() === 'ended' ? commentField : undefined}
      actions={
        <>
          <Show when={!saving()}>
            <CancelButton
              data-testid="dialog-button-cancel"
              onClick={props.onClose}
            />
          </Show>
          {/* Disabled while the breach is ongoing, and until a non-blank
                comment is entered (`.18`, `.19`). */}
          <OkButton
            data-testid="dialog-button-ok"
            loading={saving()}
            disabled={!confirmable() || saving()}
            onClick={() => void save()}
          />
        </>
      }
    >
      <Stack gap="md">
        <Text variant="heading" level={3}>
          {t('heading.details')}
        </Text>
        <InsetPanel>
          <Stack gap="sm">
            <LabelledValue variant="field" label={t('label.breach-start')}>
              {t('messages.ago', {
                time: formatDuration(
                  props.breach.startDatetime,
                  new Date().toISOString()
                ),
              })}
            </LabelledValue>
            <LabelledValue variant="field" label={t('label.duration')}>
              {isOngoing(props.breach)
                ? t('label.ongoing')
                : formatDuration(
                    props.breach.startDatetime,
                    props.breach.endDatetime!
                  )}
            </LabelledValue>
            {/* Shown wherever a temperature exists — 0 °C included; omitted
                  only where the breach has none (rules › temperature display). */}
            <Show when={hasTemperature(props.breach.maxOrMinTemperature)}>
              <LabelledValue
                variant="field"
                label={t('messages.max-or-min-temperature')}
              >
                {t('messages.temperature', {
                  temperature: formatTemperatureValue(
                    props.breach.maxOrMinTemperature!
                  ),
                })}
              </LabelledValue>
            </Show>
            <LabelledValue variant="field" label={t('label.sensor-name')}>
              {props.breach.sensor?.name ?? ''}
            </LabelledValue>
          </Stack>
        </InsetPanel>
        <Show
          when={state() === 'ended'}
          fallback={
            // An ongoing breach: informational only — no comment field is
            // offered at all (`.17`, `.18`).
            <Alert severity="error" testId="breach-ongoing-notice">
              {t('messages.breach-ongoing')}
            </Alert>
          }
        >
          <Text variant="heading" level={3}>
            {t('label.comment')}
          </Text>
          <TextArea
            ref={commentField.ref}
            label={t('label.comment')}
            hideLabel
            data-testid="acknowledge-breach-comment"
            helperText={t('messages.acknowledge-breach-helptext')}
            disabled={saving()}
            value={comment()}
            onInput={e => setComment(e.currentTarget.value)}
          />
        </Show>
        <Show when={error()}>
          {message => (
            <Alert severity="error" testId="acknowledge-breach-error">
              {message()}
            </Alert>
          )}
        </Show>
      </Stack>
    </Dialog>
  );
};

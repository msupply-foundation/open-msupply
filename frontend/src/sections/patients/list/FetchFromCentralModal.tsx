import { createEffect, createSignal, Show, type Component } from 'solid-js';
import { t, localisedDate } from '../../../intl';
import { Dialog } from '../../../ui/elements/feedback/Dialog';
import { Button } from '../../../ui/elements/buttons/Button';
import { Alert } from '../../../ui/elements/feedback/Alert';
import { Spinner } from '../../../ui/elements/feedback/Spinner';
import { LabelledValue } from '../../../ui/elements/typography/LabelledValue';
import { Stack } from '../../../ui/layout/Stack/Stack';
import { Text } from '../../../ui/elements/typography/Text';
import { DownloadIcon, XCircleIcon } from '../../../ui/icons';
import {
  linkPatientToStore,
  type CentralPatient,
} from '../../../domain/patient';
import { EMPTY_FIELD_VALUE } from '../../../domain/customFields';

// S2b — retrieve a central-only patient into the store (spec/patients FL3,
// AC-S4/S5). Opened from a step-② download row. Confirms, links + syncs, then
// offers "View patient"; central-unreachable is the one decoded error.

type Phase = 'confirm' | 'fetching' | 'done' | 'unreachable';

export interface FetchFromCentralModalProps {
  open: boolean;
  storeId: string;
  candidate: CentralPatient | undefined;
  onClose: () => void;
  onViewPatient: (patientId: string) => void;
}

export const FetchFromCentralModal: Component<
  FetchFromCentralModalProps
> = props => {
  const [phase, setPhase] = createSignal<Phase>('confirm');
  const [error, setError] = createSignal('');

  // Reset to the confirm phase whenever a new candidate is opened.
  createEffect(() => {
    if (props.open) {
      setPhase('confirm');
      setError('');
    }
  });

  const fullName = () => {
    const c = props.candidate;
    return c ? `${c.firstName} ${c.lastName}`.trim() : '';
  };

  const retrieve = async () => {
    const c = props.candidate;
    if (!c) return;
    setPhase('fetching');
    const outcome = await linkPatientToStore(props.storeId, c.id);
    if (outcome.kind === 'ok') {
      setPhase('done');
    } else if (outcome.kind === 'unreachable') {
      setError(outcome.message || t('messages.failed-to-reach-central'));
      setPhase('unreachable');
    } else {
      // Handled globally (transport / unexpected) — close.
      props.onClose();
    }
  };

  const actions = () => {
    switch (phase()) {
      case 'confirm':
        return (
          <>
            <Button
              variant="secondary"
              icon={<XCircleIcon />}
              confirms="cancel"
              data-testid="dialog-button-cancel"
              onClick={props.onClose}
            >
              {t('button.cancel')}
            </Button>
            <Button
              icon={<DownloadIcon />}
              confirms="plain"
              data-testid="dialog-button-ok"
              onClick={() => void retrieve()}
            >
              {t('button.ok')}
            </Button>
          </>
        );
      case 'fetching':
        return null;
      case 'done':
        return (
          <Button
            confirms="plain"
            data-testid="dialog-button-ok"
            onClick={() =>
              props.candidate && props.onViewPatient(props.candidate.id)
            }
          >
            {t('button.view-patient')}
          </Button>
        );
      case 'unreachable':
        return (
          <Button
            variant="secondary"
            confirms="cancel"
            data-testid="dialog-button-cancel"
            onClick={props.onClose}
          >
            {t('button.cancel')}
          </Button>
        );
    }
  };

  return (
    <Dialog
      open={props.open}
      testId="patient-retrieval-modal"
      title={t('title.patient-retrieval-modal')}
      icon={<DownloadIcon />}
      dismissable={phase() !== 'fetching'}
      onClose={props.onClose}
      widthRem={34}
      actions={actions()}
    >
      <Show when={props.candidate}>
        {candidate => (
          <>
            <Show when={phase() === 'confirm'}>
              {/* The candidate's facts are never editable here, so each is a
                  read-only labelled value — not a FieldRow, whose control
                  hides its own label (ui-standards/components › typography).
                  Their own Stack holds the block together: the dialog body's
                  gap is the between-blocks rhythm, too airy between fields. */}
              <Stack gap="md">
                <LabelledValue variant="field" label={t('label.patient-id')}>
                  {candidate().code}
                </LabelledValue>
                <LabelledValue variant="field" label={t('label.first-name')}>
                  {candidate().firstName}
                </LabelledValue>
                <LabelledValue variant="field" label={t('label.last-name')}>
                  {candidate().lastName}
                </LabelledValue>
                <LabelledValue variant="field" label={t('label.date-of-birth')}>
                  {candidate().dateOfBirth
                    ? localisedDate(candidate().dateOfBirth as string)
                    : EMPTY_FIELD_VALUE}
                </LabelledValue>
              </Stack>
              <Alert severity="info">
                {t('messages.confirm-patient-retrieval', { name: fullName() })}
              </Alert>
            </Show>
            <Show when={phase() === 'fetching'}>
              <Spinner center />
              <Text variant="body">{t('messages.fetching-patient-data')}</Text>
            </Show>
            <Show when={phase() === 'done'}>
              <Alert severity="success">
                {t('messages.fetching-patient-data-done')}
              </Alert>
            </Show>
            <Show when={phase() === 'unreachable'}>
              <Alert severity="error">{error()}</Alert>
            </Show>
          </>
        )}
      </Show>
    </Dialog>
  );
};

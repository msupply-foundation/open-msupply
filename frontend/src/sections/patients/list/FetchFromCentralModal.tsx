import { createEffect, createSignal, Show, type Component } from 'solid-js';
import { t, localisedDate } from '../../../intl';
import { Dialog } from '../../../ui/elements/feedback/Dialog';
import { Button } from '../../../ui/elements/buttons/Button';
import { Alert } from '../../../ui/elements/feedback/Alert';
import { Spinner } from '../../../ui/elements/feedback/Spinner';
import { FieldRow } from '../../../ui/elements/inputs/FieldRow';
import { Text } from '../../../ui/elements/typography/Text';
import { DownloadIcon, XCircleIcon } from '../../../ui/icons';
import {
  linkPatientToStore,
  type CentralPatient,
} from '../../../domain/patient';

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
              data-testid="dialog-button-cancel"
              onClick={props.onClose}
            >
              {t('button.cancel')}
            </Button>
            <Button
              icon={<DownloadIcon />}
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
              <FieldRow label={t('label.patient-id')}>
                <Text variant="body">{candidate().code}</Text>
              </FieldRow>
              <FieldRow label={t('label.first-name')}>
                <Text variant="body">{candidate().firstName}</Text>
              </FieldRow>
              <FieldRow label={t('label.last-name')}>
                <Text variant="body">{candidate().lastName}</Text>
              </FieldRow>
              <FieldRow label={t('label.date-of-birth')}>
                <Text variant="body">
                  {candidate().dateOfBirth
                    ? localisedDate(candidate().dateOfBirth as string)
                    : '—'}
                </Text>
              </FieldRow>
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

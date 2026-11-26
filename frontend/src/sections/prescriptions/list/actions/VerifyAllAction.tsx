import { createResource, createSignal, Match, Show, Switch } from 'solid-js';
import type { Component } from 'solid-js';
import { graphqlFetch } from '@/api/graphql';
import { t } from '@/intl';
import { Dialog } from '@/ui/elements/feedback/Dialog';
import { Alert } from '@/ui/elements/feedback/Alert';
import { Button } from '@/ui/elements/buttons/Button';
import { CancelButton } from '@/ui/elements/buttons/StandardButtons';
import { Select } from '@/ui/elements/selectors/Select';
import { Stack } from '@/ui/layout/Stack/Stack';
import { CheckCircleIcon } from '@/ui/icons';
import {
  PrescriptionsToVerify,
  VerifyPrescriptions,
} from '../prescriptions.generated';
import {
  countMessage,
  lastMonth,
  monthEnd,
  monthLabel,
  splitToVerify,
  verifiableMonths,
  verifyOutcome,
  type CountKey,
  type MonthKey,
} from '../verifyAll';

export interface VerifyAllActionProps {
  storeId: string;
  /**
   * Records were verified, or a Verify's reply never came and they may have
   * been: the list reads again.
   */
  onVerified: () => void;
}

// Verify all (spec/prescriptions rules › verifying the month's records,
// ui-surface S1): the Simple store's Dispensing records action that verifies
// every Picked record picked in or before a chosen month, in one batch. The
// list only offers it in such a store, to staff who can change dispensing
// records (OMS-REG-DIS-12.306–.308).
export const VerifyAllAction: Component<VerifyAllActionProps> = props => {
  const [open, setOpen] = createSignal(false);
  return (
    <>
      <Button
        variant="secondary"
        icon={<CheckCircleIcon />}
        data-testid="verify-all-button"
        onClick={() => setOpen(true)}
      >
        {t('button.verify-all')}
      </Button>
      <Show when={open()}>
        <Body {...props} onClose={() => setOpen(false)} />
      </Show>
    </>
  );
};

type Phase = 'confirm' | 'verifying' | 'done';

const Body = (props: VerifyAllActionProps & { onClose: () => void }) => {
  // Body mounts per open, so the months are this month's when it opens.
  const today = new Date();
  const months = verifiableMonths(today);
  const [month, setMonth] = createSignal<MonthKey>(lastMonth(today));
  const [phase, setPhase] = createSignal<Phase>('confirm');
  // The last Verify was refused: nothing was verified (OMS-REG-DIS-12.317).
  const [refused, setRefused] = createSignal(false);
  const [verifiedCount, setVerifiedCount] = createSignal(0);
  // Records the last Verify's read left out, for the done message.
  const [doneLeftOut, setDoneLeftOut] = createSignal(0);

  const read = async (storeId: string, m: MonthKey) => {
    const result = await graphqlFetch(PrescriptionsToVerify, {
      storeId,
      pickedUpTo: monthEnd(m),
    });
    return result.kind === 'success'
      ? splitToVerify(result.data.invoices.nodes)
      : null;
  };

  // How many records the month takes, and how many it leaves out
  // (OMS-REG-DIS-12.310, .322), read again on every month and after a Verify
  // that didn't finish. Never throws: null means it couldn't be read
  // (OMS-REG-DIS-12.320).
  const [count, { refetch }] = createResource(
    () => ({ storeId: props.storeId, month: month() }),
    source => read(source.storeId, source.month)
  );
  // Read without suspending: the dialog is open over the list
  // (kdd/solid-reactivity-pitfalls § no remounts on interaction). While a new
  // number is read, none shows, so a month never shows another's number.
  const settled = () =>
    count.state === 'ready' ? (count.latest ?? null) : undefined;
  const number = () => settled()?.ids.length ?? 0;
  const leftOut = () => settled()?.leftOut ?? 0;

  const chosenLabel = () => monthLabel(month());
  const busy = () => phase() === 'verifying';

  const counted = (key: CountKey, n: number) =>
    countMessage(key, n, chosenLabel());

  const verify = async () => {
    if (phase() !== 'confirm') return; // re-entry guard (OMS-REG-DIS-12.319)
    setPhase('verifying');
    setRefused(false);
    // The records to verify are read now, not when the number was: one picked
    // since is verified too (OMS-REG-DIS-12.316).
    const toVerify = await read(props.storeId, month());
    const ids = toVerify?.ids ?? [];
    if (ids.length === 0) {
      // Nothing to send, or the read failed (the app's error dialog says
      // so): show the number as it stands now.
      setPhase('confirm');
      void refetch();
      return;
    }
    // No returnGraphqlErrors: a record the server won't verify comes back as a
    // row in a success reply, so a GraphQL error here is a refused permission
    // or a server fault, the app's own dialogs' to report.
    const result = await graphqlFetch(VerifyPrescriptions, {
      storeId: props.storeId,
      updates: ids.map(id => ({ id, status: 'VERIFIED' as const })),
    });
    const outcome = verifyOutcome(result, ids.length);
    if (outcome.kind === 'verified') {
      setVerifiedCount(outcome.count);
      setDoneLeftOut(toVerify?.leftOut ?? 0);
      setPhase('done');
      props.onVerified();
      return;
    }
    // A reply that never came may still have verified them: the list behind
    // reads again too, so it never shows a verified record as Picked.
    if (outcome.kind === 'reported') props.onVerified();
    // Refused: nothing was verified, and it says so. Either way the number is
    // read again, which shows what happened (OMS-REG-DIS-12.318).
    setRefused(outcome.kind === 'refused');
    setPhase('confirm');
    void refetch();
  };

  return (
    <Dialog
      open
      dismissable={!busy()}
      onClose={props.onClose}
      icon={<CheckCircleIcon />}
      testId="verify-all-modal"
      title={t('heading.verify-all')}
      actions={
        <Show
          when={phase() !== 'done'}
          fallback={
            <Button
              variant="secondary"
              confirms="plain"
              data-testid="dialog-button-close"
              onClick={props.onClose}
            >
              {t('button.close')}
            </Button>
          }
        >
          <Show when={!busy()}>
            <CancelButton
              data-testid="dialog-button-cancel"
              onClick={props.onClose}
            />
          </Show>
          <Button
            variant="primary"
            confirms="plain"
            data-testid="verify-all-confirm-button"
            loading={busy()}
            disabled={number() === 0}
            onClick={() => void verify()}
          >
            {t('button.verify')}
          </Button>
        </Show>
      }
    >
      <Show
        when={phase() !== 'done'}
        fallback={
          <Stack>
            <Alert severity="success" testId="verify-all-done">
              {counted('messages.verify-all-done', verifiedCount())}
            </Alert>
            <Show when={doneLeftOut() > 0}>
              <Alert severity="warning" testId="verify-all-left-out">
                {counted('messages.verify-all-left-out', doneLeftOut())}
              </Alert>
            </Show>
          </Stack>
        }
      >
        <Stack>
          <Select
            label={t('label.verify-month')}
            options={months.map(m => ({
              value: m,
              label: monthLabel(m),
            }))}
            value={month()}
            onValueChange={value => {
              setRefused(false);
              setMonth(value);
            }}
            required
            disabled={busy()}
            testId="verify-all-month"
          />
          <Show when={refused()}>
            <Alert severity="error" testId="verify-all-failed">
              {t('messages.verify-all-failed')}
            </Alert>
          </Show>
          <Switch>
            <Match when={settled() === undefined}>
              <Alert severity="neutral" testId="verify-all-loading">
                {t('loading')}
              </Alert>
            </Match>
            <Match when={settled() === null}>
              <Alert severity="error" testId="verify-all-not-read">
                {t('messages.verify-all-not-read')}
                <Button
                  variant="ghost"
                  data-testid="verify-all-read-again-button"
                  onClick={() => void refetch()}
                >
                  {t('button.try-again')}
                </Button>
              </Alert>
            </Match>
            <Match when={number() === 0}>
              <Alert severity="info" testId="verify-all-none">
                {t('messages.verify-all-none', { month: chosenLabel() })}
              </Alert>
            </Match>
            <Match when={number() > 0}>
              <Alert severity="info" testId="verify-all-count">
                {counted('messages.verify-all-count', number())}
              </Alert>
            </Match>
          </Switch>
          <Show when={leftOut() > 0}>
            <Alert severity="warning" testId="verify-all-left-out">
              {counted('messages.verify-all-left-out', leftOut())}
            </Alert>
          </Show>
        </Stack>
      </Show>
    </Dialog>
  );
};

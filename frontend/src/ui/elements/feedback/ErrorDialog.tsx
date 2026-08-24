import { Show, type Component } from 'solid-js';
import { Dynamic } from 'solid-js/web';
import { t } from '../../../intl';
import type { LocaleKey } from '../../../intl';
import { Dialog } from './Dialog';
import { Alert } from './Alert';
import { Button } from '../buttons/Button';
import {
  AlertTriangleIcon,
  ClockIcon,
  WifiOffIcon,
  type IconProps,
} from '../../icons';
import styles from './ErrorDialog.module.css';

/**
 * The failure condition the dialog maps to its fixed copy
 * (ui-standards › error dialogs; spec/startup/rules.md § unexpected API
 * errors, D109).
 */
export type ErrorDialogCondition =
  'unreachable' | 'timeout' | 'server' | 'unknown';

/** The support-facing block behind Show details. */
export interface ErrorDialogDetails {
  /** Quotable, timestamp-based reference, e.g. "3f9a-2026-08-13T02:41Z". */
  reference: string;
  /** The raw technical string — never shown in the message itself. */
  cause: string;
  /** The current store, when one is entered. */
  store?: string;
  /** The request that failed, e.g. "mutation upsertStocktakeLines". */
  request?: string;
}

export interface ErrorDialogProps {
  open: boolean;
  condition: ErrorDialogCondition;
  /**
   * Support block for the Show details disclosure. Only the `server` and
   * `unknown` conditions render it (collapsed / open respectively) — the
   * self-explanatory conditions have nothing for support to look up, so the
   * disclosure is omitted there even when details are passed.
   */
  details?: ErrorDialogDetails;
  /**
   * The failure interrupted an edit (a mutation): adds the reassurance line
   * that the user's entries are still on the screen behind, and suppresses
   * the dashboard affordance — leaving the screen would discard the entry.
   */
  duringEdit?: boolean;
  /** Close — dismisses in place, leaving the user exactly where they were. */
  onClose: () => void;
  /** The primary fix — Retry (unreachable) / Try again (everything else). */
  onRetry: () => void;
  /**
   * Go to dashboard — a quiet tertiary affordance at the actions row's
   * inline-start, never a peer button, for when the current page is itself
   * the source of the error. Omit it where there is no dashboard to reach;
   * ignored during an edit.
   */
  onDashboard?: () => void;
  /** `data-testid` for the <dialog> element (e2e/TESTIDS.md). */
  testId?: string;
}

/*
 * One fixed wording per condition — the whole point of the component
 * (ui-standards › error dialogs): a health worker understands what happened
 * from the title and buttons alone, and the raw technical string stays behind
 * Show details for support. Calm copy, no exclamation marks, and the primary
 * button is the fix.
 */
const COPY: Record<
  ErrorDialogCondition,
  {
    title: LocaleKey;
    body: LocaleKey;
    primary: LocaleKey;
    icon: Component<IconProps>;
    details: 'none' | 'collapsed' | 'open';
  }
> = {
  unreachable: {
    title: 'error.cant-reach-server',
    body: 'error.cant-reach-server-body',
    primary: 'button.retry',
    icon: WifiOffIcon,
    details: 'none',
  },
  timeout: {
    title: 'error.connection-timed-out',
    body: 'error.connection-timed-out-body',
    primary: 'button.try-again',
    icon: ClockIcon,
    details: 'none',
  },
  server: {
    title: 'error.something-wrong',
    body: 'error.server-error-body',
    primary: 'button.try-again',
    icon: AlertTriangleIcon,
    details: 'collapsed',
  },
  // The unmapped fallback opens its details — the one condition where the raw
  // detail is the only clue to what happened.
  unknown: {
    title: 'error.something-wrong',
    body: 'error.unmapped-body',
    primary: 'button.try-again',
    icon: AlertTriangleIcon,
    details: 'open',
  },
};

/*
 * ErrorDialog — the blocking error modal, one per failure condition
 * (ui-standards › error dialogs). Composes <Dialog>; the app's single
 * consumer is the global unexpected-error modal (spec/startup S5), and the
 * showcase demos each condition.
 */
export const ErrorDialog = (props: ErrorDialogProps) => {
  const copy = () => COPY[props.condition];

  return (
    <Dialog
      open={props.open}
      onClose={props.onClose}
      title={t(copy().title)}
      icon={
        <span
          class={styles.icon}
          data-tone={
            props.condition === 'server' || props.condition === 'unknown'
              ? 'critical'
              : 'caution'
          }
        >
          <Dynamic component={copy().icon} />
        </span>
      }
      description={t(copy().body)}
      testId={props.testId}
      /*
       * No submit key (spec/keyboard KB-E2's "a dialog MAY opt out of
       * Enter-to-confirm entirely"): this dialog appears unprompted, possibly
       * mid-keystroke, and its primary is a full-page reload — a stray Enter
       * must neither discard the screen nor dismiss the error unseen. Escape
       * still closes (the dialog is dismissable, and Close claims the cancel
       * role).
       */
      enterConfirms={false}
      actionsLead={
        <Show when={props.onDashboard && !props.duringEdit}>
          <Button
            variant="ghost"
            data-testid="unexpected-error-dashboard"
            onClick={() => props.onDashboard?.()}
          >
            {t('button.go-to-dashboard')}
          </Button>
        </Show>
      }
      actions={
        <>
          <Button
            variant="secondary"
            confirms="cancel"
            data-testid="unexpected-error-close"
            onClick={() => props.onClose()}
          >
            {t('button.close')}
          </Button>
          <Button
            data-testid="unexpected-error-retry"
            onClick={() => props.onRetry()}
          >
            {t(copy().primary)}
          </Button>
        </>
      }
    >
      {/* The reassurance line sits in the body, under the guidance and above
          the details divider (ui-standards › error dialogs, edit modifier). */}
      <Show when={props.duringEdit}>
        <Alert severity="success">{t('error.edit-preserved')}</Alert>
      </Show>
      <Show when={copy().details !== 'none' ? props.details : undefined}>
        {details => (
          <details class={styles.details} open={copy().details === 'open'}>
            <summary>{t('error.show-details')}</summary>
            <div class={styles.block}>
              <span class={styles.label}>{t('error.details-reference')}:</span>
              <span class={styles.value}>{details().reference}</span>
              <span class={styles.label}>{t('error.details-cause')}:</span>
              <span class={styles.value}>{details().cause}</span>
              <Show when={details().store}>
                <span class={styles.label}>{t('error.details-store')}:</span>
                <span class={styles.value}>{details().store}</span>
              </Show>
              <Show when={details().request}>
                <span class={styles.label}>{t('error.details-request')}:</span>
                <span class={styles.value}>{details().request}</span>
              </Show>
              <span class={styles.share}>{t('error.share-reference')}</span>
            </div>
          </details>
        )}
      </Show>
    </Dialog>
  );
};

import {
  createSignal,
  For,
  onCleanup,
  onMount,
  type Component,
} from 'solid-js';
import { Dynamic, Portal } from 'solid-js/web';
import {
  AlertCircleIcon,
  CheckIcon,
  InfoIcon,
  CloseIcon,
  type IconProps,
} from '../../icons';
import { t } from '../../../intl';
import { IconButton } from '../buttons/IconButton';
import styles from './Toast.module.css';

export type ToastSeverity = 'success' | 'info' | 'error';

export interface ToastOptions {
  message: string;
  /** Defaults to 'info'. Drives the icon + tint (Alert's severity recipe). */
  severity?: ToastSeverity;
  /** Auto-dismiss delay, in ms. Default 5000. */
  durationMs?: number;
}

interface ToastItem {
  id: number;
  message: string;
  severity: ToastSeverity;
  durationMs: number;
}

/* Same glyph choices as Alert, for the three severities a toast uses. */
const ICONS: Record<ToastSeverity, Component<IconProps>> = {
  success: CheckIcon,
  info: InfoIcon,
  error: AlertCircleIcon,
};

// Module-level queue (kdd/state-management: global signal state is deliberate;
// this is client-rendered). Toasts are whole immutable objects added/removed by
// reference — never a field mutated — so <For> keeps live cards in place and
// only adds/removes the changed one (no remount of the survivors).
const [toasts, setToasts] = createSignal<ToastItem[]>([]);
let nextId = 0;

/** Enqueue a transient toast. Returns its id (also dismissable early). */
export const showToast = (options: ToastOptions): number => {
  const id = ++nextId;
  setToasts(current => [
    ...current,
    {
      id,
      message: options.message,
      severity: options.severity ?? 'info',
      durationMs: options.durationMs ?? 5000,
    },
  ]);
  return id;
};

/** Remove a toast early (also called by the auto-dismiss timer + close button). */
export const dismissToast = (id: number): void => {
  setToasts(current => current.filter(toast => toast.id !== id));
};

const ToastCard = (props: { toast: ToastItem }) => {
  // Auto-dismiss: one timer per card, cleared if the card leaves first.
  onMount(() => {
    const timer = setTimeout(
      () => dismissToast(props.toast.id),
      props.toast.durationMs
    );
    onCleanup(() => clearTimeout(timer));
  });

  return (
    <div class={styles.toast} data-severity={props.toast.severity}>
      <span class={styles.icon} aria-hidden="true">
        <Dynamic component={ICONS[props.toast.severity]} />
      </span>
      <span class={styles.message}>{props.toast.message}</span>
      <IconButton
        class={styles.dismiss}
        size="small"
        label={t('common.close')}
        icon={<CloseIcon />}
        onClick={() => dismissToast(props.toast.id)}
      />
    </div>
  );
};

/*
 * ToastRegion — the single host for transient toasts, rendered ONCE at the app
 * root (near the global modals). Notifications are pushed from anywhere via the
 * module-level showToast(); this region renders the live queue. It's a polite
 * live region (role="status" + aria-live="polite") so a screen reader announces
 * each toast as it appears without interrupting; each toast auto-dismisses
 * (default ~5s) and has an explicit dismiss button. Portaled to <body> so it
 * floats above page content regardless of where it's mounted. Reuses Alert's
 * severity iconography + tint tokens.
 */
export const ToastRegion = () => (
  <Portal>
    <div class={styles.region} role="status" aria-live="polite">
      <For each={toasts()}>{toast => <ToastCard toast={toast} />}</For>
    </div>
  </Portal>
);

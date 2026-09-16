import { createSignal, onMount, Show, type Component } from 'solid-js';
import {
  rememberedDiscoveryReturn,
  withLng,
} from '../../discovery/discoveryReturn';
import { getLegacyShell, type LegacyShell } from '../../platform/legacyShell';
import { TransferHorizontalIcon } from '../icons';
import { locale, t } from '../../intl';
import styles from '../styles/LoginInitLayout.module.css';

/**
 * "Change server", for the two pre-session screens (login, initialisation).
 *
 * Two ways to get back, in strict order of preference:
 *
 * 1. The hand-off's return URL, when the shell sent one — a plain link back
 *    to the discovery page, carrying the language active at click time
 *    (src/discovery/discoveryReturn.ts, AC-DT16/23/24). This is the designed
 *    path and the only one that lands on the new page with its flags.
 * 2. Otherwise the legacy shell bridge, where one answers
 *    (src/platform/legacyShell.ts) — a shell released before the page
 *    existed, which never sends the parameter. Lands on that shell's own
 *    discovery screen.
 *
 * Neither, in a browser tab or a served deployment: nothing renders, which is
 * what every non-shell deployment should see.
 *
 * The URL is read once — it is fixed while this screen shows — and the bridge
 * is only asked for when there is no URL, so a current shell never makes the
 * call.
 */
export const ChangeServerAction: Component<{ testId: string }> = props => {
  const url = rememberedDiscoveryReturn(window.location.search);
  const [legacy, setLegacy] = createSignal<LegacyShell>();

  onMount(() => {
    if (!url) void getLegacyShell().then(setLegacy);
  });

  const label = () => (
    <>
      <TransferHorizontalIcon class={styles.secondaryActionIcon} />
      {t('messages.change-server')}
    </>
  );

  return (
    <Show
      when={url}
      fallback={
        <Show when={legacy()}>
          <button
            type="button"
            class={styles.secondaryAction}
            onClick={() => legacy()?.goBackToDiscovery()}
            data-testid={props.testId}
          >
            {label()}
          </button>
        </Show>
      }
    >
      {/* href re-reads locale(): the way back carries the language ACTIVE at
          click time, so a change made here arrives back at discovery too. */}
      <a
        class={styles.secondaryAction}
        href={withLng(url!, locale())}
        data-testid={props.testId}
      >
        {label()}
      </a>
    </Show>
  );
};

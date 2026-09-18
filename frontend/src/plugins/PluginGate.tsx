import { createSignal, onMount, Show } from 'solid-js';
import type { JSX } from 'solid-js';
import { t } from '../intl';
import styles from '../ui/styles/shared.module.css';
import { ensurePluginsLoaded } from './loader';
import { recordPagePathCollisions } from './pluginPages';

/*
 * The boot gate (spec/plugins/rules.md § lifecycle).
 *
 * Loading starts as soon as a session exists and completes before the first
 * operational screen renders, so a contribution never pops into an
 * already-rendered screen. Store context is deliberately NOT a precondition: it
 * is a render-time input to each contribution's `when` gate
 * (src/plugins/slotContext.ts), so the gate does not serialise plugin loading
 * behind the store guard.
 *
 * A plain signal flipped in onMount, NOT a createResource: a resource read here
 * would suspend the boundary it sits in and remount everything below it on any
 * later refetch (kdd/solid-reactivity-pitfalls § no remounts on interaction).
 * `ensurePluginsLoaded` never rejects and is idempotent, so the gate always
 * opens, exactly once, however often this component mounts.
 *
 * The fallback is the app's own startup markup — the same one `App`'s loading
 * phase shows — so the gate reads as a continuation of startup, not as a second
 * kind of loading screen.
 */
export const PluginGate = (props: { children?: JSX.Element }): JSX.Element => {
  const [ready, setReady] = createSignal(false);

  onMount(() => {
    void ensurePluginsLoaded().then(() => {
      // A page path collision is a fact about the loaded SET, so it is
      // checked once the set is complete — the winner is deterministic either
      // way (pluginPages.activePages); this only names the loser.
      // Guarded because it runs between loading settling and the gate opening:
      // diagnostics are advisory, and a throw here would otherwise hold the
      // whole app at the loading screen forever, silently.
      try {
        recordPagePathCollisions();
      } catch (error) {
        console.error('[plugins] recording page collisions failed', error);
      }
      setReady(true);
    });
  });

  return (
    <Show
      when={ready()}
      fallback={
        <div class={styles.page}>
          <p>{t('loading')}</p>
        </div>
      }
    >
      {props.children}
    </Show>
  );
};

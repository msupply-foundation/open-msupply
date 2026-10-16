import { createSignal, type Accessor } from 'solid-js';

/*
 * The state behind a switch that saves as soon as it is flipped: it shows
 * `override ?? stored` (the idiom DisplaySettingsSection uses). The flip holds
 * while its save is in flight, and the override drops once the save settles,
 * so a failed save reverts the switch to the stored value. The switch is a
 * native checkbox that flips itself, so without the override a failure would
 * leave it flipped: `stored` never changed, so nothing would write it back.
 *
 * `save` updates `stored` itself on success, before it resolves, so the switch
 * never flickers back while the override drops. Its own failure surface stays
 * with the caller.
 *
 * Kept apart from the component so the revert can be tested without a DOM
 * (vitest.workspace.ts runs component tests in node).
 */
export const createSaveOnToggle = (
  stored: Accessor<boolean>,
  save: (next: boolean) => Promise<void>
) => {
  const [override, setOverride] = createSignal<boolean>();
  const [busy, setBusy] = createSignal(false);

  const checked = () => override() ?? stored();

  const toggle = async (next: boolean) => {
    if (busy()) return;
    setBusy(true);
    setOverride(next);
    try {
      await save(next);
    } finally {
      setOverride(undefined);
      setBusy(false);
    }
  };

  return { checked, busy, toggle };
};

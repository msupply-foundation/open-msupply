import type { Component } from 'solid-js';
import { ConfirmDialog } from '../../ui/elements/feedback/ConfirmDialog';
import { t } from '../../intl';
import {
  createConfirmOnLeave,
  type ConfirmOnLeaveOptions,
} from './createConfirmOnLeave';

/*
 * The dirty-discard guard AND its prompt in one component — the app-wide
 * "you have unsaved changes" behaviour (spec/patients/ui-surface.md § the
 * patient edit form) packaged for the PLUGIN boundary
 * (spec/plugins/sdk-contract.md § SDK surface — Navigation).
 *
 * ── Why this is one component, when the host splits the two ─────────────────
 * A host screen calls `createConfirmOnLeave` and renders its own
 * `ConfirmDialog` — behaviour and presentation kept apart
 * (kdd/explicit-composition). A plugin cannot do either half:
 *
 *  1. `ConfirmDialog` is not in the SDK's export set, and adding it would put
 *     a CSS-bearing component into the surface every plugin pays for
 *     (sdk-contract § UI kit — "every eager export is host startup weight").
 *  2. The COPY is out of reach regardless: `pluginIntl` namespaces every key
 *     under the plugin's own code (src/plugin-sdk/intl.ts), so a plugin can
 *     never address `messages.discard-changes` and would have to ship its own
 *     wording — which would drift from the app's, in every locale.
 *  3. And the guard itself cannot be an EAGER SDK export: it imports
 *     `@solidjs/router`, which runs `saveCurrentDepth()` at module scope and
 *     touches `window` on import. The SDK barrel MUST stay free of
 *     module-scope side effects — it is evaluated by the facade entry before
 *     any plugin code runs — so exporting the primitive would break the
 *     barrel anywhere there is no DOM.
 *
 * Fusing them is what resolves (3): the whole thing reaches a plugin as ONE
 * lazy export, so the router is imported when this renders and never sits in
 * the eager graph. The composition split the host enjoys is a luxury of being
 * able to import both halves; this is the same behaviour with the seam moved.
 *
 * ── It MUST render from the surface's first paint ───────────────────────────
 * Bind `isDirty` and leave it mounted; never mount it when the form becomes
 * dirty or when a prompt is wanted. Being lazy, a first mount driven by an
 * interaction suspends the open screen's `<Suspense>` boundary and remounts
 * everything inside it (kdd/solid-reactivity-pitfalls § no remounts on
 * interaction) — which would destroy the edit buffer the guard exists to
 * protect, at the exact moment it is protecting it. Always-mounted costs
 * nothing: a closed `ConfirmDialog` renders no dialog content, and the guard
 * is inert while `isDirty()` is false.
 */
export const UnsavedChangesGuard: Component<ConfirmOnLeaveOptions> = props => {
  // Read through arrows and a getter rather than destructuring: these are
  // Solid props, and the guard calls them long after setup.
  const guard = createConfirmOnLeave({
    isDirty: () => props.isDirty(),
    onDiscard: () => props.onDiscard?.(),
    get sameRouteIsNotLeave() {
      return props.sameRouteIsNotLeave;
    },
  });

  return (
    <ConfirmDialog
      open={guard.open()}
      title={t('heading.are-you-sure')}
      message={t('messages.discard-changes')}
      confirmLabel={t('button.discard')}
      onConfirm={guard.confirm}
      onClose={guard.cancel}
    />
  );
};

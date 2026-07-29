/*
 * The `prescription.payment-form` slot region — the seam a plugin's payment
 * form renders into inside the prescription payment window
 * (spec/plugins/ui-surface.md S1, spec/prescriptions/ui-surface.md S5: "A
 * plugin slot may extend this form").
 *
 * A slot region imposes no layout: contributions become direct children of the
 * dialog body and adopt its geometry, so an empty region renders nothing and
 * reserves no space (there is no wrapper element).
 *
 * Three properties this component is responsible for, each a MUST in
 * spec/plugins/rules.md:
 *
 * - **No remounts on host state.** `<For>` keys on the contribution objects,
 * and
 *   `contributionsFor` re-evaluates only when the REGISTRY changes — not when
 *   the prescription's numbers do. So typing in a plugin field, or the host
 *   recomputing the insurance split, never tears down the plugin's own draft
 *   state (kdd/solid-reactivity-pitfalls § no remounts on interaction). The DTO
 *   reaches the component through getters, so it stays reactive without the
 *   list's identity moving.
 * - **A hidden contribution costs nothing.** `when` is evaluated per
 *   contribution inside a `<Show>`, not filtered out of the list: a gate
 *   flipping (store preferences arriving) shows or hides ONE contribution
 *   rather than rebuilding the region and remounting its siblings — and a
 *   hidden contribution never renders, so it never fetches.
 * - **Error isolation.** Each contribution sits in its own `ErrorBoundary`: one
 *   throwing contribution shows a neutral line in its own place, and every
 *   sibling — and the host dialog — keeps working.
 *
 * Each contribution also gets its OWN `FormParticipation` view of the window's
 * save coordinator, created inside this `<For>` — so the `onCleanup` behind it
 * belongs to that contribution, and a contribution that leaves releases its
 * handlers and can no longer affect a save.
 */
import { ErrorBoundary, For, Show, createMemo, type JSX } from 'solid-js';
import { t } from '../intl';
import { contributionsFor } from './registry';
import { pluginRuntimeFor } from './loader';
import type { SaveCoordinator } from './formParticipation';
import { PluginRuntimeProvider } from './sdk/pluginRuntime';
import { SLOTS, type PrescriptionPaymentDto } from './sdk/types';

export interface PrescriptionPaymentSlotProps {
  prescription: PrescriptionPaymentDto;
  coordinator: SaveCoordinator;
}

export const PrescriptionPaymentSlot = (
  props: PrescriptionPaymentSlotProps
): JSX.Element => {
  const contributions = createMemo(() =>
    contributionsFor(SLOTS.prescriptionPaymentForm)
  );

  return (
    <For each={contributions()}>
      {resolved => {
        const runtime = pluginRuntimeFor(resolved.pluginCode);
        return (
          <Show when={resolved.contribution.when?.(runtime.context) ?? true}>
            <ErrorBoundary
              fallback={error => {
                console.error(
                  `Plugin contribution "${resolved.key}" failed to render`,
                  error
                );
                return <p>{t('error.plugin-unavailable')}</p>;
              }}
            >
              <PluginRuntimeProvider runtime={runtime}>
                {/* The participation is created INSIDE the Show, so its cleanup
                    belongs to the visible contribution rather than to the list
                    item. A gate flipping to false must release the
                    contribution's validity entries along with its handlers —
                    otherwise a hidden contribution's stale "invalid" would keep
                    blocking the host's save with no field on screen to fix. */}
                <resolved.contribution.Component
                  prescription={props.prescription}
                  form={props.coordinator.participationFor(resolved.key)}
                />
              </PluginRuntimeProvider>
            </ErrorBoundary>
          </Show>
        );
      }}
    </For>
  );
};

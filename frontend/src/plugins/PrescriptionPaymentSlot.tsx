/*
 * The `prescription.paymentForm` slot region — the seam a plugin's payment
 * form renders into inside the prescription payment window
 * (spec/plugins/ui-surface.md § S1, spec/prescriptions/ui-surface.md § S5: "A
 * plugin slot may extend this form").
 *
 * Composition follows the other slots: ONE `createMemo` over
 * `visibleContributions`, so the array the outlet `<For>`s over keeps its
 * identity and mounted contributions are never torn down by an unrelated
 * update (kdd/solid-reactivity-pitfalls). The outlet contributes the
 * no-seam/no-remount/error-isolation guarantees (PluginSlotOutlet).
 *
 * What is particular to this slot is FORM PARTICIPATION: each contribution
 * gets its OWN `FormParticipation` view of the window's save coordinator,
 * created inside the contribution's mount — so the `onCleanup` behind it
 * belongs to that contribution, and one that leaves (unmounted, `when` gate
 * flipped, or replaced) releases its handlers and validity entries and can no
 * longer affect a save (AC-PLUG-F4). The prescription DTO reaches the
 * contribution through the outlet's getter-bound props, so the host
 * recomputing the insurance split updates a LIVE form instead of remounting
 * it.
 */
import { createComponent, createMemo, type JSX } from 'solid-js';
import type {
  PrescriptionPaymentView,
  PrescriptionPaymentFormProps,
} from '../plugin-sdk/types';
import { t } from '../intl';
import {
  PluginSlotOutlet,
  type PluginSlotContribution,
} from '../ui/elements/plugins/PluginSlotOutlet';
import { contributionId, visibleContributions } from './PluginSlot';
import type { SaveCoordinator } from './formParticipation';

type SlotProps = { prescription: PrescriptionPaymentView };

export interface PrescriptionPaymentSlotProps {
  prescription: PrescriptionPaymentView;
  coordinator: SaveCoordinator;
}

export const PrescriptionPaymentSlot = (
  props: PrescriptionPaymentSlotProps
): JSX.Element => {
  const contributions = createMemo(() =>
    visibleContributions('prescription.paymentForm').map(contribution => {
      const key = contributionId(contribution);
      /*
       * Binds the per-contribution `form` alongside the outlet's shared slot
       * props. Runs at the contribution's OWN mount (inside the outlet's error
       * boundary), which is what scopes `participationFor`'s cleanup to the
       * contribution rather than to this memo.
       */
      const Bound = (bound: SlotProps): JSX.Element =>
        createComponent<PrescriptionPaymentFormProps>(contribution.Component, {
          get prescription() {
            return bound.prescription;
          },
          form: props.coordinator.participationFor(key),
        });
      return {
        id: key,
        Component: Bound,
      } satisfies PluginSlotContribution<SlotProps>;
    })
  );

  return (
    <PluginSlotOutlet
      contributions={contributions()}
      slotProps={() => ({ prescription: props.prescription })}
      errorFallback={t('error.plugin-unavailable')}
    />
  );
};

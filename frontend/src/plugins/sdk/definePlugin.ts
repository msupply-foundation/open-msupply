/*
 * `definePlugin` and the per-slot `contribute` helpers
 * (spec/plugins/sdk-contract.md § entry contract).
 *
 * `definePlugin` is declarative and returns its argument unchanged — it exists
 * for the TYPE, not for behaviour: the bundle's default export is checked
 * against `PluginDefinition` at the plugin's own compile time, which is how a
 * malformed manifest becomes a build error in the plugin's CI rather than a
 * skipped plugin in the field.
 *
 * `contribute.<slot>` is the only sanctioned way to build a contribution. It
 * stamps the slot id, so the id and the prop DTO can never drift apart: a
 * payment-form component with the wrong props fails to compile at the
 * `contribute.prescriptionPaymentForm(...)` call, not at render.
 */
import {
  SLOTS,
  type Contribution,
  type PluginDefinition,
  type PrescriptionPaymentFormProps,
  type SlotContribution,
} from './types';

export const definePlugin = (definition: PluginDefinition): PluginDefinition =>
  definition;

export const contribute = {
  prescriptionPaymentForm: (
    contribution: Contribution<PrescriptionPaymentFormProps>
  ): SlotContribution => ({
    slot: SLOTS.prescriptionPaymentForm,
    ...contribution,
  }),
};

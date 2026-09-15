/*
 * The host side of the new-order gate — the one CONSULTED slot
 * (spec/plugins/sdk-contract.md § the new-order gate slot): nothing renders;
 * the internal-orders list asks it whether the store-wide recent-stocktake
 * warning is superseded by a plugin's own item-level measure
 * (spec/internal-orders/rules.md § creation).
 *
 * Consulted at the moment New order is invoked, not held reactively: the
 * answer typically comes from the plugin's own data read, and the create flow
 * already has an in-flight state covering exactly this window. `when`-gating
 * is evaluated here rather than through `visibleContributions`, whose filter
 * runs plugin `when` untrapped — fine under a render boundary, but this path
 * has none, and a throwing gate must fail alone (rules § error isolation)
 * instead of rejecting the whole consult.
 */
import { recordPluginDiagnostic } from './diagnostics';
import { describeError } from './loader';
import { contributionId } from './PluginSlot';
import { contributionsFor } from './registry';
import { slotContext } from './slotContext';

/**
 * True when any visible gate contribution answers that it supersedes the
 * recent-stocktake warning for the entered store. Every gate is asked in
 * parallel; a gate whose `when` or resolver throws (or rejects) answers
 * `false` for itself only, recorded in diagnostics — a failing plugin never
 * stands the host's warning down, never blocks another plugin's answer, and
 * never rejects the consult (rules § error isolation). Never rejects.
 */
export const newOrderWarningSuperseded = async (): Promise<boolean> => {
  const gates = contributionsFor('internalOrders.newOrderGate')();
  if (gates.length === 0) return false;
  const ctx = slotContext();
  const answers = await Promise.all(
    gates.map(async gate => {
      try {
        if (gate.when && !gate.when(ctx)) return false;
        return await gate.supersedes(ctx);
      } catch (thrown) {
        recordPluginDiagnostic({
          level: 'error',
          pluginCode: gate.pluginCode,
          message: `new-order gate "${contributionId(gate)}" failed (${describeError(
            thrown
          )}) — the recent-stocktake warning is NOT superseded by it`,
        });
        return false;
      }
    })
  );
  return answers.includes(true);
};

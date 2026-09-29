/*
 * The host side of warning suppression — the one CONSULTED slot
 * (spec/plugins/sdk-contract.md § the warning-suppression slot): nothing
 * renders; a host surface asks whether one of its published warnings is
 * suppressed — replaced by a plugin's own measure. The first consumer is the
 * internal-orders list, asking whether the store-wide recent-stocktake
 * warning is superseded by a plugin's own item-level measure
 * (spec/internal-orders/rules.md § creation).
 *
 * Consulted at the moment the warning would otherwise show, not held
 * reactively: the answer typically comes from the plugin's own data read, and
 * the consulting flow already has an in-flight state covering exactly this
 * window. `when`-gating is evaluated here rather than through
 * `visibleContributions`, whose filter runs plugin `when` untrapped — fine
 * under a render boundary, but this path has none, and a throwing resolver
 * must fail alone (rules § error isolation) instead of rejecting the whole
 * consult.
 */
import type { HostWarningId } from '../plugin-sdk/types';
import { recordPluginDiagnostic } from './diagnostics';
import { describeError } from './loader';
import { contributionId } from './PluginSlot';
import { contributionsFor } from './registry';
import { slotContext } from './slotContext';

/**
 * True when any visible suppression contribution naming `warning` answers
 * that its plugin's own measure replaces it for the entered store. Every
 * candidate is asked in parallel; one whose `when` or resolver throws (or
 * rejects) answers `false` for itself only, recorded in diagnostics — a
 * failing plugin never stands the host's warning down, never blocks another
 * plugin's answer, and never rejects the consult (rules § error isolation).
 * Never rejects.
 */
export const warningSuppressed = async (
  warning: HostWarningId
): Promise<boolean> => {
  const candidates = contributionsFor('host.warningSuppression')().filter(
    contribution => contribution.warning === warning
  );
  if (candidates.length === 0) return false;
  const ctx = slotContext();
  const answers = await Promise.all(
    candidates.map(async contribution => {
      try {
        if (contribution.when && !contribution.when(ctx)) return false;
        return await contribution.suppresses(ctx);
      } catch (thrown) {
        recordPluginDiagnostic({
          level: 'error',
          pluginCode: contribution.pluginCode,
          message: `warning suppression "${contributionId(contribution)}" failed (${describeError(
            thrown
          )}) — the "${warning}" warning is NOT suppressed by it`,
        });
        return false;
      }
    })
  );
  return answers.includes(true);
};

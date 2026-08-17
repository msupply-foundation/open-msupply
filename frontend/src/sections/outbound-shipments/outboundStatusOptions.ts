import { outboundShipmentPreferences } from '@/store/storeContext';
import {
  STATUS_FLOW,
  statusIndex,
  type OutboundStatus,
} from './outboundStatus';

// The statuses the _invoice status options_ preference allows, in flow order
// (rules.md § preference gates: limits the list filter, crumbs, and confirm
// options). An empty preference list means "no restriction". The raw gate
// values come from the global outboundShipmentPreferences accessor (the
// guard-3 store context); this is the outbound-only mapping of that set onto
// STATUS_FLOW, reused by the supplier-/customer-returns filters.
export const allowedStatuses = (): readonly OutboundStatus[] => {
  const options = outboundShipmentPreferences().invoiceStatusOptions;
  const allowed = STATUS_FLOW.filter(status =>
    (options as readonly string[]).includes(status)
  );
  return allowed.length ? allowed : STATUS_FLOW;
};

// The lifecycle indicator's current step within a preference-limited sequence
// (OMS-REG-DIST-04.22): a current status the preference EXCLUDES displays as
// the nearest included EARLIER status — the LAST allowed entry at or before
// the current flow index (`allowed` is already in ascending flow order); −1
// when the current status precedes every allowed entry (nothing lights up). A
// plain loop rather than Array#findLastIndex: eslint-plugin-solid doesn't
// recognise it as a safe callback host (unlike findIndex/map/etc.), so it
// misreports reactive reads in the predicate as untracked at component call
// sites.
export const indicatorStep = (
  allowed: readonly OutboundStatus[],
  currentIndex: number
): number => {
  let result = -1;
  for (let i = 0; i < allowed.length; i++) {
    if (statusIndex(allowed[i]) <= currentIndex) result = i;
    else break;
  }
  return result;
};

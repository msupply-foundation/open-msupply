import { outboundShipmentPreferences } from '@/store/storeContext';
import { STATUS_FLOW, type OutboundStatus } from './outboundStatus';

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

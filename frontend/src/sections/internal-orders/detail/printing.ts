// The printing indicator-seed gate (spec/internal-orders rules › printing,
// AC-PR4): a NON-emergency program order from a store-backed supplier whose
// program defines indicators — the same gate as the Indicators tab — is
// generated with three extra argument keys seeded beside the standard ones:
// the order's program, its period, and the active store's own customer
// identity. Any other order sends only the standard seeds. Pure — the view
// supplies the fetched indicator count and the store's name id.

import type { InternalOrderInfoFragment } from './internalOrderDetail.generated';

export type IndicatorSeedSource = Pick<
  InternalOrderInfoFragment,
  'program' | 'period' | 'isEmergency' | 'otherParty'
>;

export const indicatorSeedArgs = (
  node: IndicatorSeedSource,
  indicatorsDefined: boolean,
  customerNameId: string | undefined
): Record<string, string> | undefined => {
  if (
    !node.program ||
    !node.period ||
    node.isEmergency === true ||
    !node.otherParty.store ||
    !indicatorsDefined ||
    !customerNameId
  )
    return undefined;
  return {
    programId: node.program.id,
    periodId: node.period.id,
    customerNameId,
  };
};

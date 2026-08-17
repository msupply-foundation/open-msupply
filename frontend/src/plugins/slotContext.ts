import type { SlotContext } from '../plugin-sdk/types';
import { currentStoreId, storeContext } from '../store/storeContext';

/*
 * The session facts a contribution's `when` gate reads
 * (spec/plugins/sdk-contract.md § contributions).
 *
 * A plain accessor, not a memo or a store: it reads the store-context signals
 * fresh on every call, so it is correct both inside a reactive root (a store
 * switch re-evaluates every `when`) and outside one (tests). It is a
 * RENDER-time input, never a load precondition — plugins finish loading before
 * the first operational screen, while the store context is still resolving,
 * and each region re-evaluates `when` when it lands (rules § lifecycle).
 *
 * Session-scoped only. Per-record gating belongs inside the contribution's own
 * render, so moving between rows never re-runs `when`.
 */
export const slotContext = (): SlotContext => {
  const context = storeContext();
  const me = context?.me;
  return {
    storeId: currentStoreId(),
    // Passed through as the wire's own `UserPermission` values (SCREAMING_CASE)
    // — not remapped to a parallel vocabulary (kdd/type-safety). The query is
    // already scoped to the entered store, so every node's list applies.
    permissions:
      me && me.__typename === 'UserNode'
        ? me.permissions.nodes.flatMap(node => node.permissions)
        : [],
    storePreferences: {
      // The CIV aggregate-AMC gate, from the guard-3 store-preference read.
      // `false` while the context is unresolved — the safe default is OFF, so a
      // gated contribution never renders before its preference is known (the
      // app-wide *Preferences rule). Reactive: a post-sync refetch or a store
      // switch re-evaluates every `when`.
      useConsumptionAndStockFromCustomersForInternalOrders:
        context?.storePreferences
          .useConsumptionAndStockFromCustomersForInternalOrders ?? false,
    },
  };
};

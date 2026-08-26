import type { SlotContext, SlotStoreMode } from '../plugin-sdk/types';
import {
  currentStoreId,
  currentStoreMode,
  storeContext,
} from '../store/storeContext';

// The host's wire `storeMode` → the SDK's domain word. A total map, keyed off
// the host accessor's own union, so a mode added to the schema fails THIS
// build rather than silently arriving at plugins as the wrong word.
const slotStoreModes: Record<
  NonNullable<ReturnType<typeof currentStoreMode>>,
  SlotStoreMode
> = { STORE: 'store', DISPENSARY: 'dispensary' };

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
  const mode = currentStoreMode();
  return {
    storeId: currentStoreId(),
    // Passed through as the wire's own `UserPermission` values (SCREAMING_CASE)
    // — not remapped to a parallel vocabulary (kdd/type-safety). The query is
    // already scoped to the entered store, so every node's list applies.
    permissions:
      me && me.__typename === 'UserNode'
        ? me.permissions.nodes.flatMap(node => node.permissions)
        : [],
    // The entered store's mode, from the me/login store list (no query of its
    // own). Undefined while the store is unresolved — the boundary reports "not
    // known", it does not guess a mode, which is what preserves the host's
    // safe-default-OFF rule for a positive gate (`=== 'dispensary'` is false
    // until the mode lands, so a gated contribution never flashes in).
    // Reactive: a store switch re-evaluates every `when`.
    storeMode: mode && slotStoreModes[mode],
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

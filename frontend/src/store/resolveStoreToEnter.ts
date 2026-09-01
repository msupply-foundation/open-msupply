// Spec (SL-2): the store to enter, in priority order — the URL's store, the
// only store the user has, or (before any store has been entered this
// session) the user's saved always-open store (SL-9). A saved id that no
// longer names one of the user's stores is ignored (OMS-REG-LGN-02.27). Pure,
// so the priority order is unit-testable without mounting the guard; the
// guard derives every argument reactively.
export const resolveStoreToEnter = <S extends { id: string }>(
  stores: S[],
  urlStoreId: string | undefined,
  alwaysOpenStoreId: string | undefined,
  storeEnteredThisSession: boolean
): S | undefined =>
  stores.find(s => s.id === urlStoreId) ??
  (stores.length === 1 ? stores[0] : undefined) ??
  (storeEnteredThisSession
    ? undefined
    : stores.find(s => s.id === alwaysOpenStoreId));

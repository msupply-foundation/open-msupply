/*
 * Who reaches the register (spec/sync-message/rules.md § reach and visibility).
 * The destination and its gate are specified once in
 * spec/navigation › central administration destinations: the CENTRAL server
 * gate plus the SERVER ADMIN one, composed — the nav registry declares them as
 * the single `centralAdmin` capability, and this route guard applies the same
 * pair so direct-URL entry is blocked as well as the menu entry hidden.
 *
 * A pure predicate so the anchor-citing test can state the rule without a
 * router (OMS-REG-MNG-04.1); the runtime signals are read at the call site.
 */
export const canReachRegister = (
  isCentralServer: boolean,
  hasServerAdmin: boolean
): boolean => isCentralServer && hasServerAdmin;

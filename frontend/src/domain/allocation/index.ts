// Shared issue-side allocation policy (spec/stock-allocation): pure batch-
// choice functions any issuing vertical composes into its line editor. No
// fetches, no i18n, no vertical types — consumers feed structural batch
// shapes and consumer-resolved preference values (kdd/domain-modules).

export {
  distributeIssue,
  type DistributableLine,
  type Distribution,
} from './distributeIssue';
export {
  autoAllocateBarReasons,
  barReasons,
  isBarred,
  rowHasAllocatableStock,
  fefoCompare,
  type AllocationPreferences,
  type BarrableBatch,
  type BarReason,
} from './policy';
export {
  clampManualPacks,
  lensToUnits,
  availableUnits,
  issuedUnits,
  distinctPackSizes,
  type AllocateUnit,
  type UnitCountableBatch,
} from './units';
export { deriveIssueWarnings, type IssueWarning } from './warnings';

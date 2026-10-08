// The VvmStatus domain module (kdd/domain-modules): the store-scoped resource +
// type (for non-select reads like resolving a label) and the reusable
// VvmStatusSelect picker. Gated at the call site by the manageVvmStatusForStock
// store preference (spec/stocktakes › store-preference gates).
export { vvmStatusesResource, type VvmStatus } from './vvmStatusResource';
export { VvmStatusSelect, type VvmStatusSelectProps } from './VvmStatusSelect';

// The discard-on-leave guard (kdd/domain-modules): intercepts every navigation
// away from a dirty detail form — route change, tab switch, browser back, and
// (via beforeunload) reload / tab close — and drives a caller-rendered discard
// prompt. Not an entity module — a reusable primitive like createDebouncedEdit,
// lifted out of the patient detail view for other detail views to reuse.
export {
  createConfirmOnLeave,
  type ConfirmOnLeave,
  type ConfirmOnLeaveOptions,
} from './createConfirmOnLeave';
// Guard and prompt fused, for the plugin boundary — a plugin can reach
// neither ConfirmDialog nor the host locale keys, and cannot import the
// primitive eagerly at all (@solidjs/router touches `window` on import).
// Host screens keep the split above. See the file header.
//
// NOT re-exported by src/plugin-sdk/index.ts directly: it reaches plugins as
// a LAZY wrapper (src/plugin-sdk/lazyComponents.ts), which is what keeps the
// router out of the SDK's eager graph.
export { UnsavedChangesGuard } from './UnsavedChangesGuard';

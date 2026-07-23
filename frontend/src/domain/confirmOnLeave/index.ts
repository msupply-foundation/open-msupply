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

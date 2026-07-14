// The Reason-options domain module (kdd/domain-modules): the store-scoped resource + type, and the
// reusable ReasonSelect picker (with per-kind filtering — adjustment / reduction).
export { reasonOptionsResource, type ReasonOption } from './reasonOptionsResource';
export {
  ReasonSelect,
  reasonsOfKind,
  type ReasonSelectProps,
  type ReasonKind,
} from './ReasonSelect';

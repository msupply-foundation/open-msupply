// The Action domain module (kdd/domain-modules + kdd/action-modal): a reusable confirm → working →
// success | error modal for any action that runs a mutation and may report per-line errors — the
// stocktake bulk selection actions and finalise both drive it.
export { ActionModal, type ActionModalProps, type ActionResult } from './ActionModal';

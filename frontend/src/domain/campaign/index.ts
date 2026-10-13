// The Campaign domain module (kdd/domain-modules): the store-scoped campaigns
// resource + type, the per-item programs fetch + type, and the two reusable
// pickers they back — ActivitySelect (the Activity field, campaign-backed,
// tiering the register into its Routine and Campaign kinds) and ProgramSelect,
// independent fields written to their own wire columns
// (spec/ui-standards › activity / item-program selectors; spec/stocktakes S4).
export { campaignsResource, type Campaign } from './campaignsResource';
export { campaignKindLabel, type CampaignKind } from './campaignKind';
export {
  fetchItemPrograms,
  fetchSharedItemPrograms,
  type ItemProgram,
} from './itemProgramsResource';
export { ActivitySelect, type ActivitySelectProps } from './ActivitySelect';
export {
  activityOptions,
  spansBothTiers,
  type ActivityOption,
  type KindFilter,
  type SelectedCampaign,
} from './activityOptions';
export { ProgramSelect, type ProgramSelectProps } from './ProgramSelect';

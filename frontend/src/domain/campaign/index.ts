// The Campaign domain module (kdd/domain-modules): the store-scoped campaigns
// resource + type, the per-item programs fetch + type, and the reusable
// CampaignOrProgramSelect picker that merges the two into one
// mutually-exclusive field (spec/ui-standards › campaign-or-program lookup;
// spec/stocktakes S4).
export { campaignsResource, type Campaign } from './campaignsResource';
export { fetchItemPrograms, type ItemProgram } from './itemProgramsResource';
export {
  CampaignOrProgramSelect,
  type CampaignOrProgramSelectProps,
  type CampaignOrProgram,
} from './CampaignOrProgramSelect';

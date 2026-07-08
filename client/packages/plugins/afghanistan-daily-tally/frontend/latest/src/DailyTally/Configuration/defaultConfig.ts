import { DailyTallyConfig } from '../types';

// Seed config used by the host's PluginConfigModal when no plugin_data row
// exists yet. The admin must add demographic groups (with counters + doses),
// optional summary tables / non-vaccine items, and wastage reasons before the
// runtime can be used — the DetailView surfaces a "no configuration" message
// when no demographic groups are configured.
export const DEFAULT_DAILY_TALLY_CONFIG: DailyTallyConfig = {
  demographic_groups: [],
  non_vaccine_items: [],
  summary_tables: [],
  wastage_reasons: {
    open_vial: '',
    negative_adjustment: '',
  },
};

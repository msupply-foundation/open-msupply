// The preference-catalogue domain module (kdd/domain-modules): grouping and
// filtering a served preference catalogue, shared by the global preferences
// page and the store editor's Preferences tab.
export {
  filterCatalogue,
  groupCatalogue,
  matchesPreferenceFilter,
  PREFERENCE_GROUPS,
  type CatalogueGroup,
  type GroupedCatalogue,
  type PreferenceGroupDef,
  type PreferenceGroupLabelKey,
} from './catalogue';
export {
  createCatalogueView,
  type CatalogueView,
  type CatalogueViewOptions,
} from './createCatalogueView';

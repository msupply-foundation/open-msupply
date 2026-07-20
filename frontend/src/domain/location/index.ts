// The Location domain module (kdd/domain-modules): the store-scoped resource +
// types + local-fetch helpers, and the two reusable pickers — the volume-blind
// LocationSelect and the volume-aware LocationVolumeSelect (see
// spec/ui-standards/components.md → Location lookup — plain vs volume-aware).
export {
  fetchLocations,
  fetchLocationsWithVolume,
  type Location,
  type LocationWithVolume,
} from './locationResource';
export { LocationSelect, type LocationSelectProps } from './LocationSelect';
export {
  LocationVolumeSelect,
  type LocationVolumeSelectProps,
} from './LocationVolumeSelect';
export { getVolumeUsedPercentage, availableVolume } from './volume';

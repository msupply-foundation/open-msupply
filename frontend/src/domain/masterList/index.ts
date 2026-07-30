// The Master-list domain module (kdd/domain-modules): the store-scoped
// resource + type (for lookups) and the reusable MasterListSelect picker.
export { masterListsResource, type MasterList } from './masterListResource';
export {
  MasterListSelect,
  type MasterListSelectProps,
} from './MasterListSelect';
export {
  MasterListPickerModal,
  type MasterListPickerModalProps,
} from './MasterListPickerModal';

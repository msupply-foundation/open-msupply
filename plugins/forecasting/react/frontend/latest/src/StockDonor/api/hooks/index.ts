import { Utils } from './utils';
import { Document } from './document';

export const usePluginData = {
  api: Utils.usePluginApi,
  data: Document.usePluginData,
  insert: Document.useInsertPluginData,
  update: Document.useUpdatePluginData,
};

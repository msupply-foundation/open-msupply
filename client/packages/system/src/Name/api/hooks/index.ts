import { Document } from './document';
import { Utils } from './utils';

export const useName = {
  api: Utils.useNameApi,
  document: {
    get: Document.useName,
    customers: Document.useCustomers,
    internalSuppliers: Document.useInternalSuppliers,
    list: Document.useNames,
    suppliers: Document.useSuppliers,
    facilities: Document.useFacilities,
    donors: Document.useDonors,
    properties: Document.useNameProperties,
  },
};

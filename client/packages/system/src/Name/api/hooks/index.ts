import { Document } from './document';
import { Utils } from './utils';

export const useName = {
  api: Utils.useNameApi,
  document: {
    get: Document.useName,
    updateProperties: Document.useUpdateProperties,
    customers: Document.useCustomers,
    customersInfinite: Document.useCustomersInfinite,
    internalSuppliers: Document.useInternalSuppliers,
    internalSuppliersInfinite: Document.useInternalSuppliersInfinite,
    list: Document.useNames,
    suppliers: Document.useSuppliers,
    suppliersInfinite: Document.useSuppliersInfinite,
    externalSuppliersInfinite: Document.useExternalSuppliersInfinite,
    manufacturers: Document.useManufacturers,
    manufacturersInfinite: Document.useManufacturersInfinite,
    stores: Document.useStores,
    storesAll: Document.useStoresAll,
    donors: Document.useDonors,
    donorsInfinite: Document.useDonorsInfinite,
    properties: Document.useNameProperties,
  },
  utils: {
    nextStoreId: Utils.useNextStoreId,
  },
};

import { Document } from './document';
import { Lines } from './line';
import { Utils } from './utils';

export const useReturns = {
  document: {
    listCustomer: Document.useCustomerReturns,
    listAllCustomer: Document.useCustomerReturnsAll,
    listSupplier: Document.useSupplierReturns,
    listAllSupplier: Document.useSupplierReturnsAll,
    supplierReturn: Document.useSupplierReturn,
    customerReturn: Document.useCustomerReturn,

    insertSupplierReturn: Document.useInsertSupplierReturn,
    updateSupplierReturn: Document.useUpdateSupplierReturn,
    updateOtherParty: Document.useUpdateSupplierReturnOtherParty,
    deleteSupplier: Document.useSupplierReturnDelete,
    deleteSupplierRows: Document.useSupplierDeleteRows,

    insertCustomerReturn: Document.useInsertCustomerReturn,
    updateCustomerReturn: Document.useUpdateCustomerReturn,
    deleteCustomer: Document.useCustomerReturnDelete,
    deleteCustomerRows: Document.useCustomerDeleteRows,
  },
  lines: {
    supplierReturnLines: Lines.useSupplierReturnLines,
    supplierReturnRows: Lines.useSupplierReturnRows,
    updateSupplierLines: Lines.useUpdateSupplierReturnLines,

    generateCustomerReturnLines: Lines.useGenerateCustomerReturnLines,
    customerReturnRows: Lines.useCustomerReturnRows,
    updateCustomerLines: Lines.useUpdateCustomerReturnLines,
    deleteSelectedCustomerLines: Lines.useDeleteSelectedCustomerReturnLines,
    deleteSelectedSupplierLines: Lines.useDeleteSelectedSupplierReturnLines,
  },
  utils: {
    api: Utils.useReturnsApi,
    customerIsDisabled: Utils.useCustomerReturnIsDisabled,
    supplierIsDisabled: Utils.useSupplierReturnIsDisabled,
  },
};

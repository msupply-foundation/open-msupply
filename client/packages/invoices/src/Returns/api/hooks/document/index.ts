import { useInsertCustomerReturn } from './useInsertCustomerReturn';
import { useSupplierDeleteRows } from './useSupplierDeleteRows';
import { useSupplierReturns } from './useSupplierReturns';
import { useSupplierReturnsAll } from './useSupplierReturnsAll';
import { useCustomerReturns } from './useCustomerReturns';
import { useCustomerReturnsAll } from './useCustomerReturnsAll';
import { useCustomerDeleteRows } from './useCustomerDeleteRows';
import { useSupplierReturn } from './useSupplierReturn';
import { useInsertSupplierReturn } from './useInsertSupplierReturn';
import { useCustomerReturn } from './useCustomerReturn';
import { useCustomerReturnDelete } from './useCustomerDelete';
import { useUpdateCustomerReturn } from './useUpdateCustomerReturn';
import { useSupplierReturnDelete } from './useSupplierDelete';
import { useUpdateSupplierReturn } from './useUpdateSupplierReturn';
import { useUpdateSupplierReturnOtherParty } from './useUpdateSupplierReturnOtherParty';

export const Document = {
  useSupplierReturn,
  useSupplierReturns,
  useSupplierReturnsAll,
  useCustomerReturns,
  useCustomerReturn,
  useCustomerReturnsAll,

  useSupplierDeleteRows,
  useCustomerDeleteRows,
  useInsertSupplierReturn,
  useUpdateSupplierReturn,
  useUpdateSupplierReturnOtherParty,
  useSupplierReturnDelete,

  useInsertCustomerReturn,
  useUpdateCustomerReturn,
  useCustomerReturnDelete,
};

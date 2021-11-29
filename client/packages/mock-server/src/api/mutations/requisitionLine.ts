import {
  UpdateSupplierRequisitionLineInput,
  InsertSupplierRequisitionLineInput,
  DeleteSupplierRequisitionLineInput,
  UpdateCustomerRequisitionLineInput,
  InsertCustomerRequisitionLineInput,
  DeleteCustomerRequisitionLineInput,
  DeleteResponse,
} from '@openmsupply-client/common/src/types';
import { ResolverService } from './../resolvers';
import { ResolvedRequisitionLine } from './../../data/types';
import { db } from '../../data';

export const RequisitionLineMutation = {
  supplier: {
    update: (
      input: UpdateSupplierRequisitionLineInput
    ): ResolvedRequisitionLine => {
      db.requisitionLine.supplier.update(input);
      const resolvedReq = ResolverService.requisitionLine.byId(input.id);
      return resolvedReq;
    },
    insert: (
      input: InsertSupplierRequisitionLineInput
    ): ResolvedRequisitionLine => {
      db.requisitionLine.supplier.insert(input);
      const resolvedReq = ResolverService.requisitionLine.byId(input.id);
      return resolvedReq;
    },
    delete: (input: DeleteSupplierRequisitionLineInput): DeleteResponse => {
      return db.requisitionLine.supplier.delete(input);
    },
  },
  customer: {
    update: (
      input: UpdateCustomerRequisitionLineInput
    ): ResolvedRequisitionLine => {
      db.requisitionLine.customer.update(input);
      const resolvedReq = ResolverService.requisitionLine.byId(input.id);
      return resolvedReq;
    },
    insert: (
      input: InsertCustomerRequisitionLineInput
    ): ResolvedRequisitionLine => {
      db.requisitionLine.customer.insert(input);
      const resolvedReq = ResolverService.requisitionLine.byId(input.id);
      return resolvedReq;
    },
    delete: (input: DeleteCustomerRequisitionLineInput): DeleteResponse => {
      return db.requisitionLine.customer.delete(input);
    },
  },
};

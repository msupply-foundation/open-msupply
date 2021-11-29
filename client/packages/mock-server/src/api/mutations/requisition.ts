import {
  UpdateSupplierRequisitionInput,
  InsertSupplierRequisitionInput,
  DeleteSupplierRequisitionInput,
  UpdateCustomerRequisitionInput,
  InsertCustomerRequisitionInput,
  DeleteCustomerRequisitionInput,
  DeleteResponse,
} from '@openmsupply-client/common/src/types';
import { ResolverService } from './../resolvers';
import { ResolvedRequisition } from './../../data/types';
import { db } from '../../data';

export const RequisitionMutation = {
  supplier: {
    update: (input: UpdateSupplierRequisitionInput): ResolvedRequisition => {
      db.requisition.supplier.update(input);
      const resolvedReq = ResolverService.requisition.get.byId(input.id);
      return resolvedReq;
    },
    insert: (input: InsertSupplierRequisitionInput): ResolvedRequisition => {
      db.requisition.supplier.insert(input);
      const resolvedReq = ResolverService.requisition.get.byId(input.id);
      return resolvedReq;
    },
    delete: (input: DeleteSupplierRequisitionInput): DeleteResponse => {
      return db.requisition.supplier.delete(input);
    },
  },
  customer: {
    update: (input: UpdateCustomerRequisitionInput): ResolvedRequisition => {
      db.requisition.customer.update(input);
      const resolvedReq = ResolverService.requisition.get.byId(input.id);
      return resolvedReq;
    },
    insert: (input: InsertCustomerRequisitionInput): ResolvedRequisition => {
      db.requisition.customer.insert(input);
      const resolvedReq = ResolverService.requisition.get.byId(input.id);
      return resolvedReq;
    },
    delete: (input: DeleteCustomerRequisitionInput): DeleteResponse => {
      return db.requisition.customer.delete(input);
    },
  },
};

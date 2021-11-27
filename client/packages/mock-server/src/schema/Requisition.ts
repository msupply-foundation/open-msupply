import {
  UpdateSupplierRequisitionInput,
  InsertSupplierRequisitionInput,
  DeleteSupplierRequisitionInput,
  UpdateCustomerRequisitionInput,
  InsertCustomerRequisitionInput,
  DeleteCustomerRequisitionInput,
  RequisitionListParameters,
} from './../../../common/src/types/schema';
import { MutationService } from '../api/mutations';
import { ResolverService } from './../api/resolvers';

const QueryResolvers = {
  requisition: (id: string) => {
    return ResolverService.requisition.get.byId(id);
  },
  requisitions: (_: any, vars: { params: RequisitionListParameters }) => {
    return ResolverService.requisition.get.list(vars.params);
  },
};

const MutationResolvers = {
  updateSupplierRequisition: (
    _: any,
    { input }: { input: UpdateSupplierRequisitionInput }
  ) => {
    return {
      __typename: 'RequisitionNode',
      ...MutationService.requisition.supplier.update(input),
    };
  },
  insertSupplierRequisition: (
    _: any,
    { input }: { input: InsertSupplierRequisitionInput }
  ) => {
    return {
      __typename: 'RequisitionNode',
      ...MutationService.requisition.supplier.insert(input),
    };
  },
  deleteSupplierRequisition: (
    _: any,
    { input }: { input: DeleteSupplierRequisitionInput }
  ) => {
    return {
      __typename: 'DeleteResponse',
      ...MutationService.requisition.supplier.delete(input),
    };
  },
  updateCustomerRequisition: (
    _: any,
    { input }: { input: UpdateCustomerRequisitionInput }
  ) => {
    return {
      __typename: 'RequisitionNode',
      ...MutationService.requisition.customer.update(input),
    };
  },
  insertCustomerRequisition: (
    _: any,
    { input }: { input: InsertCustomerRequisitionInput }
  ) => {
    return {
      __typename: 'RequisitionNode',
      ...MutationService.requisition.customer.insert(input),
    };
  },
  deleteCustomerRequisition: (
    _: any,
    { input }: { input: DeleteCustomerRequisitionInput }
  ) => {
    return {
      __typename: 'DeleteResponse',
      ...MutationService.requisition.customer.delete(input),
    };
  },
};

export const Requisition = {
  QueryResolvers,
  MutationResolvers,
};

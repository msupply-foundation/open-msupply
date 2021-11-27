import {
  UpdateSupplierRequisitionInput,
  InsertSupplierRequisitionInput,
  DeleteSupplierRequisitionInput,
  UpdateCustomerRequisitionInput,
  InsertCustomerRequisitionInput,
  DeleteCustomerRequisitionInput,
  RequisitionListParameters,
  BatchSupplierRequisitionInput,
  BatchCustomerRequisitionInput,
  BatchSupplierRequisitionResponse,
  BatchCustomerRequisitionResponse,
  InsertSupplierRequisitionResponse,
  InsertSupplierRequisitionResponseWithId,
  UpdateSupplierRequisitionResponse,
  UpdateSupplierRequisitionResponseWithId,
  DeleteSupplierRequisitionResponse,
  DeleteSupplierRequisitionResponseWithId,
  InsertCustomerRequisitionResponse,
  InsertCustomerRequisitionResponseWithId,
  UpdateCustomerRequisitionResponse,
  UpdateCustomerRequisitionResponseWithId,
  DeleteCustomerRequisitionResponse,
  DeleteCustomerRequisitionResponseWithId,
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
  ): UpdateSupplierRequisitionResponse => {
    return {
      __typename: 'RequisitionNode',
      ...MutationService.requisition.supplier.update(input),
    };
  },
  insertSupplierRequisition: (
    _: any,
    { input }: { input: InsertSupplierRequisitionInput }
  ): InsertSupplierRequisitionResponse => {
    return {
      __typename: 'RequisitionNode',
      ...MutationService.requisition.supplier.insert(input),
    };
  },
  deleteSupplierRequisition: (
    _: any,
    { input }: { input: DeleteSupplierRequisitionInput }
  ): DeleteSupplierRequisitionResponse => {
    return {
      __typename: 'DeleteResponse',
      ...MutationService.requisition.supplier.delete(input),
    };
  },
  updateCustomerRequisition: (
    _: any,
    { input }: { input: UpdateCustomerRequisitionInput }
  ): UpdateCustomerRequisitionResponse => {
    return {
      __typename: 'RequisitionNode',
      ...MutationService.requisition.customer.update(input),
    };
  },
  insertCustomerRequisition: (
    _: any,
    { input }: { input: InsertCustomerRequisitionInput }
  ): InsertCustomerRequisitionResponse => {
    return {
      __typename: 'RequisitionNode',
      ...MutationService.requisition.customer.insert(input),
    };
  },
  deleteCustomerRequisition: (
    _: any,
    { input }: { input: DeleteCustomerRequisitionInput }
  ): DeleteCustomerRequisitionResponse => {
    return {
      __typename: 'DeleteResponse',
      ...MutationService.requisition.customer.delete(input),
    };
  },
  batchSupplierRequisition: (
    _: any,
    vars: BatchSupplierRequisitionInput
  ): BatchSupplierRequisitionResponse => {
    const response: BatchSupplierRequisitionResponse = {
      __typename: 'BatchSupplierRequisitionResponse',
    };

    if (vars.insertSupplierRequisitions) {
      response.insertSupplierRequisitions = vars.insertSupplierRequisitions.map(
        insert => {
          const regularInsertResponse =
            MutationResolvers.insertSupplierRequisition(_, {
              input: insert,
            });
          const batchInsertResponse: InsertSupplierRequisitionResponseWithId = {
            __typename: 'InsertSupplierRequisitionResponseWithId',
            id: insert.id,
            response: regularInsertResponse,
          };

          return batchInsertResponse;
        }
      );
    }

    if (vars.updateSupplierRequisitions) {
      response.updateSupplierRequisitions = vars.updateSupplierRequisitions.map(
        insert => {
          const regularInsertResponse =
            MutationResolvers.updateSupplierRequisition(_, {
              input: insert,
            });
          const batchUpdateResponse: UpdateSupplierRequisitionResponseWithId = {
            __typename: 'UpdateSupplierRequisitionResponseWithId',
            id: insert.id,
            response: regularInsertResponse,
          };

          return batchUpdateResponse;
        }
      );
    }

    if (vars.deleteSupplierRequisitions) {
      response.deleteSupplierRequisitions = vars.deleteSupplierRequisitions.map(
        insert => {
          const regularInsertResponse =
            MutationResolvers.deleteSupplierRequisition(_, {
              input: insert,
            });
          const batchDeleteResponse: DeleteSupplierRequisitionResponseWithId = {
            __typename: 'DeleteSupplierRequisitionResponseWithId',
            id: insert.id,
            response: regularInsertResponse,
          };

          return batchDeleteResponse;
        }
      );
    }

    return response;
  },
  batchCustomerRequisition: (_: any, vars: BatchCustomerRequisitionInput) => {
    const response: BatchCustomerRequisitionResponse = {
      __typename: 'BatchCustomerRequisitionResponse',
    };

    if (vars.insertCustomerRequisitions) {
      response.insertCustomerRequisitions = vars.insertCustomerRequisitions.map(
        insert => {
          const regularInsertResponse =
            MutationResolvers.insertCustomerRequisition(_, {
              input: insert,
            });
          const batchInsertResponse: InsertCustomerRequisitionResponseWithId = {
            __typename: 'InsertCustomerRequisitionResponseWithId',
            id: insert.id,
            response: regularInsertResponse,
          };

          return batchInsertResponse;
        }
      );
    }

    if (vars.updateCustomerRequisitions) {
      response.updateCustomerRequisitions = vars.updateCustomerRequisitions.map(
        insert => {
          const regularInsertResponse =
            MutationResolvers.updateCustomerRequisition(_, {
              input: insert,
            });
          const batchUpdateResponse: UpdateCustomerRequisitionResponseWithId = {
            __typename: 'UpdateCustomerRequisitionResponseWithId',
            id: insert.id,
            response: regularInsertResponse,
          };

          return batchUpdateResponse;
        }
      );
    }

    if (vars.deleteCustomerRequisitions) {
      response.deleteCustomerRequisitions = vars.deleteCustomerRequisitions.map(
        insert => {
          const regularInsertResponse =
            MutationResolvers.deleteCustomerRequisition(_, {
              input: insert,
            });
          const batchDeleteResponse: DeleteCustomerRequisitionResponseWithId = {
            __typename: 'DeleteCustomerRequisitionResponseWithId',
            id: insert.id,
            response: regularInsertResponse,
          };

          return batchDeleteResponse;
        }
      );
    }

    return response;
  },
};

export const Requisition = {
  QueryResolvers,
  MutationResolvers,
};

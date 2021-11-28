import {
  RequisitionListParameters,
  BatchSupplierRequisitionInput,
  BatchCustomerRequisitionInput,
  BatchSupplierRequisitionResponse,
  BatchCustomerRequisitionResponse,
  UpdateSupplierRequisitionInput,
  InsertSupplierRequisitionInput,
  DeleteSupplierRequisitionInput,
  UpdateCustomerRequisitionInput,
  InsertCustomerRequisitionInput,
  DeleteCustomerRequisitionInput,
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
  UpdateSupplierRequisitionLineInput,
  InsertSupplierRequisitionLineInput,
  DeleteSupplierRequisitionLineInput,
  UpdateCustomerRequisitionLineInput,
  InsertCustomerRequisitionLineInput,
  DeleteCustomerRequisitionLineInput,
  InsertSupplierRequisitionLineResponse,
  InsertSupplierRequisitionLineResponseWithId,
  UpdateSupplierRequisitionLineResponse,
  UpdateSupplierRequisitionLineResponseWithId,
  DeleteSupplierRequisitionLineResponse,
  DeleteSupplierRequisitionLineResponseWithId,
  InsertCustomerRequisitionLineResponse,
  InsertCustomerRequisitionLineResponseWithId,
  UpdateCustomerRequisitionLineResponse,
  UpdateCustomerRequisitionLineResponseWithId,
  DeleteCustomerRequisitionLineResponse,
  DeleteCustomerRequisitionLineResponseWithId,
  RequisitionsResponse,
  RequisitionResponse,
} from './../../../common/src/types/schema';
import { MutationService } from '../api/mutations';
import { ResolverService } from './../api/resolvers';

const QueryResolvers = {
  requisition: (id: string): RequisitionResponse => {
    return ResolverService.requisition.get.byId(id);
  },
  requisitions: (
    _: unknown,
    vars: { params: RequisitionListParameters }
  ): RequisitionsResponse => {
    return ResolverService.requisition.get.list(vars.params);
  },
};

const MutationResolvers = {
  updateSupplierRequisition: (
    _: unknown,
    { input }: { input: UpdateSupplierRequisitionInput }
  ): UpdateSupplierRequisitionResponse => {
    return MutationService.requisition.supplier.update(input);
  },
  insertSupplierRequisition: (
    _: unknown,
    { input }: { input: InsertSupplierRequisitionInput }
  ): InsertSupplierRequisitionResponse => {
    return MutationService.requisition.supplier.insert(input);
  },
  deleteSupplierRequisition: (
    _: unknown,
    { input }: { input: DeleteSupplierRequisitionInput }
  ): DeleteSupplierRequisitionResponse => {
    return {
      __typename: 'DeleteResponse',
      ...MutationService.requisition.supplier.delete(input),
    };
  },
  updateCustomerRequisition: (
    _: unknown,
    { input }: { input: UpdateCustomerRequisitionInput }
  ): UpdateCustomerRequisitionResponse => {
    return MutationService.requisition.customer.update(input);
  },
  insertCustomerRequisition: (
    _: unknown,
    { input }: { input: InsertCustomerRequisitionInput }
  ): InsertCustomerRequisitionResponse => {
    return MutationService.requisition.customer.insert(input);
  },
  deleteCustomerRequisition: (
    _: unknown,
    { input }: { input: DeleteCustomerRequisitionInput }
  ): DeleteCustomerRequisitionResponse => {
    return {
      __typename: 'DeleteResponse',
      ...MutationService.requisition.customer.delete(input),
    };
  },

  updateCustomerRequisitionLine: (
    _: unknown,
    { input }: { input: UpdateCustomerRequisitionLineInput }
  ): UpdateCustomerRequisitionLineResponse => {
    return MutationService.requisitionLine.customer.update(input);
  },
  insertCustomerRequisitionLine: (
    _: unknown,
    { input }: { input: InsertCustomerRequisitionLineInput }
  ): InsertCustomerRequisitionLineResponse => {
    return MutationService.requisitionLine.customer.insert(input);
  },
  deleteCustomerRequisitionLine: (
    _: unknown,
    { input }: { input: DeleteCustomerRequisitionLineInput }
  ): DeleteCustomerRequisitionLineResponse => {
    return {
      __typename: 'DeleteResponse',
      ...MutationService.requisitionLine.customer.delete(input),
    };
  },

  updateSupplierRequisitionLine: (
    _: unknown,
    { input }: { input: UpdateSupplierRequisitionLineInput }
  ): UpdateSupplierRequisitionLineResponse => {
    return MutationService.requisitionLine.supplier.update(input);
  },
  insertSupplierRequisitionLine: (
    _: unknown,
    { input }: { input: InsertSupplierRequisitionLineInput }
  ): InsertSupplierRequisitionLineResponse => {
    return MutationService.requisitionLine.supplier.insert(input);
  },
  deleteSupplierRequisitionLine: (
    _: unknown,
    { input }: { input: DeleteSupplierRequisitionLineInput }
  ): DeleteSupplierRequisitionLineResponse => {
    return {
      __typename: 'DeleteResponse',
      ...MutationService.requisitionLine.supplier.delete(input),
    };
  },

  batchSupplierRequisition: (
    _: unknown,
    vars: BatchSupplierRequisitionInput
  ): BatchSupplierRequisitionResponse => {
    const response: BatchSupplierRequisitionResponse = {
      __typename: 'BatchSupplierRequisitionResponse',
    };

    if (vars.insertSupplierRequisitions) {
      response.insertSupplierRequisitions = vars.insertSupplierRequisitions.map(
        input => {
          const regularInsertResponse =
            MutationResolvers.insertSupplierRequisition(_, { input });
          const batchInsertResponse: InsertSupplierRequisitionResponseWithId = {
            __typename: 'InsertSupplierRequisitionResponseWithId',
            id: input.id,
            response: regularInsertResponse,
          };

          return batchInsertResponse;
        }
      );
    }

    if (vars.updateSupplierRequisitions) {
      response.updateSupplierRequisitions = vars.updateSupplierRequisitions.map(
        input => {
          const regularUpdateResponse =
            MutationResolvers.updateSupplierRequisition(_, { input });
          const batchUpdateResponse: UpdateSupplierRequisitionResponseWithId = {
            __typename: 'UpdateSupplierRequisitionResponseWithId',
            id: input.id,
            response: regularUpdateResponse,
          };

          return batchUpdateResponse;
        }
      );
    }

    if (vars.deleteSupplierRequisitions) {
      response.deleteSupplierRequisitions = vars.deleteSupplierRequisitions.map(
        input => {
          const regularDeleteResponse =
            MutationResolvers.deleteSupplierRequisition(_, { input });
          const batchDeleteResponse: DeleteSupplierRequisitionResponseWithId = {
            __typename: 'DeleteSupplierRequisitionResponseWithId',
            id: input.id,
            response: regularDeleteResponse,
          };

          return batchDeleteResponse;
        }
      );
    }

    if (vars.insertSupplierRequisitionLines) {
      response.insertSupplierRequisitionLines =
        vars.insertSupplierRequisitionLines.map(input => {
          const regularInsertResponse =
            MutationResolvers.insertSupplierRequisitionLine(_, { input });
          const batchInsertResponse: InsertSupplierRequisitionLineResponseWithId =
            {
              __typename: 'InsertSupplierRequisitionLineResponseWithId',
              id: input.id,
              response: regularInsertResponse,
            };

          return batchInsertResponse;
        });
    }

    if (vars.updateSupplierRequisitionLines) {
      response.updateSupplierRequisitionLines =
        vars.updateSupplierRequisitionLines.map(input => {
          const regularUpdateResponse =
            MutationResolvers.updateSupplierRequisitionLine(_, { input });
          const batchInsertResponse: UpdateSupplierRequisitionLineResponseWithId =
            {
              __typename: 'UpdateSupplierRequisitionLineResponseWithId',
              id: input.id,
              response: regularUpdateResponse,
            };

          return batchInsertResponse;
        });
    }

    if (vars.deleteSupplierRequisitionLines) {
      response.deleteSupplierRequisitionLines =
        vars.deleteSupplierRequisitionLines.map(input => {
          const regularDeleteResponse =
            MutationResolvers.deleteSupplierRequisitionLine(_, { input });
          const batchInsertResponse: DeleteSupplierRequisitionLineResponseWithId =
            {
              __typename: 'DeleteSupplierRequisitionLineResponseWithId',
              id: input.id,
              response: regularDeleteResponse,
            };

          return batchInsertResponse;
        });
    }

    return response;
  },

  batchCustomerRequisition: (
    _: unknown,
    vars: BatchCustomerRequisitionInput
  ): BatchCustomerRequisitionResponse => {
    const response: BatchCustomerRequisitionResponse = {
      __typename: 'BatchCustomerRequisitionResponse',
    };

    console.log('-------------------------------------------');
    console.log('vars', vars);
    console.log('-------------------------------------------');

    if (vars.insertCustomerRequisitions) {
      response.insertCustomerRequisitions = vars.insertCustomerRequisitions.map(
        input => {
          const regularInsertResponse =
            MutationResolvers.insertCustomerRequisition(_, { input });
          const batchInsertResponse: InsertCustomerRequisitionResponseWithId = {
            __typename: 'InsertCustomerRequisitionResponseWithId',
            id: input.id,
            response: regularInsertResponse,
          };

          return batchInsertResponse;
        }
      );
    }

    if (vars.updateCustomerRequisitions) {
      response.updateCustomerRequisitions = vars.updateCustomerRequisitions.map(
        input => {
          const regularInsertResponse =
            MutationResolvers.updateCustomerRequisition(_, { input });
          const batchUpdateResponse: UpdateCustomerRequisitionResponseWithId = {
            __typename: 'UpdateCustomerRequisitionResponseWithId',
            id: input.id,
            response: regularInsertResponse,
          };

          return batchUpdateResponse;
        }
      );
    }

    if (vars.deleteCustomerRequisitions) {
      response.deleteCustomerRequisitions = vars.deleteCustomerRequisitions.map(
        input => {
          const regularInsertResponse =
            MutationResolvers.deleteCustomerRequisition(_, {
              input,
            });
          const batchDeleteResponse: DeleteCustomerRequisitionResponseWithId = {
            __typename: 'DeleteCustomerRequisitionResponseWithId',
            id: input.id,
            response: regularInsertResponse,
          };

          return batchDeleteResponse;
        }
      );
    }

    if (vars.insertCustomerRequisitionLines) {
      response.insertCustomerRequisitionLines =
        vars.insertCustomerRequisitionLines.map(input => {
          const regularInsertResponse =
            MutationResolvers.insertCustomerRequisitionLine(_, { input });
          const batchInsertResponse: InsertCustomerRequisitionLineResponseWithId =
            {
              __typename: 'InsertCustomerRequisitionLineResponseWithId',
              id: input.id,
              response: regularInsertResponse,
            };

          return batchInsertResponse;
        });
    }

    if (vars.updateCustomerRequisitionLines) {
      response.updateCustomerRequisitionLines =
        vars.updateCustomerRequisitionLines.map(input => {
          const regularInsertResponse =
            MutationResolvers.updateCustomerRequisitionLine(_, {
              input,
            });
          const batchInsertResponse: UpdateCustomerRequisitionLineResponseWithId =
            {
              __typename: 'UpdateCustomerRequisitionLineResponseWithId',
              id: input.id,
              response: regularInsertResponse,
            };

          return batchInsertResponse;
        });
    }

    if (vars.deleteCustomerRequisitionLines) {
      response.deleteCustomerRequisitionLines =
        vars.deleteCustomerRequisitionLines.map(input => {
          const regularDeleteResponse =
            MutationResolvers.deleteCustomerRequisitionLine(_, {
              input,
            });
          const batchDeleteResponse: DeleteCustomerRequisitionLineResponseWithId =
            {
              __typename: 'DeleteCustomerRequisitionLineResponseWithId',
              id: input.id,
              response: regularDeleteResponse,
            };

          return batchDeleteResponse;
        });
    }

    return response;
  },
};

export const Requisition = {
  QueryResolvers,
  MutationResolvers,
};

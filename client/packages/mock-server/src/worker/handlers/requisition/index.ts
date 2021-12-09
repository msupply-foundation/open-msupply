import {
  mockRequisitionQuery,
  mockRequisitionsQuery,
  mockDeleteSupplierRequisitionsMutation,
  mockDeleteCustomerRequisitionsMutation,
  mockInsertSupplierRequisitionMutation,
  mockInsertCustomerRequisitionMutation,
  mockUpsertSupplierRequisitionMutation,
  mockUpsertCustomerRequisitionMutation,
  DeleteSupplierRequisitionInput,
  BatchSupplierRequisitionInput,
  BatchCustomerRequisitionInput,
  DeleteCustomerRequisitionInput,
  mockUpdateCustomerRequisitionMutation,
} from '@openmsupply-client/common/src/types';
import { ResolverService } from '../../../api/resolvers';
import { MutationService } from '../../../api/mutations';
import { Requisition as RequisitionSchema } from '../../../schema/Requisition';

const invoiceQuery = mockRequisitionQuery((req, res, ctx) => {
  return res(
    ctx.data({
      requisition: ResolverService.requisition.get.byId(req.variables.id),
    })
  );
});

const invoicesQuery = mockRequisitionsQuery((req, res, ctx) => {
  return res(
    ctx.data({
      requisitions: ResolverService.requisition.get.list(req.variables.params),
    })
  );
});

const updateCustomerRequisition = mockUpdateCustomerRequisitionMutation(
  (req, res, ctx) => {
    return res(
      ctx.data({
        updateCustomerRequisition: MutationService.requisition.customer.update(
          req.variables.input
        ),
      })
    );
  }
);

const updateSupplierRequisition = mockUpdateCustomerRequisitionMutation(
  (req, res, ctx) => {
    return res(
      ctx.data({
        updateCustomerRequisition: MutationService.requisition.customer.update(
          req.variables.input
        ),
      })
    );
  }
);

const deleteSupplierRequisitionsMutation =
  mockDeleteSupplierRequisitionsMutation((req, res, ctx) => {
    const { ids } = req.variables;
    const deleteSupplierRequisitions: DeleteSupplierRequisitionInput[] =
      Array.isArray(ids) ? ids : ids ? [ids] : [];

    const params: BatchSupplierRequisitionInput = {
      deleteSupplierRequisitions,
    };
    return res(
      ctx.data({
        batchSupplierRequisition: {
          __typename: 'BatchSupplierRequisitionResponse',
          deleteSupplierRequisitions:
            RequisitionSchema.MutationResolvers.batchSupplierRequisition(
              null,
              params
            ).deleteSupplierRequisitions?.map?.(response => ({
              // The type for DeleteSupplierRequisitionResponseWithId has an optional
              // typename for some unknown reason, so re-add the typename to keep typescript happy.
              __typename: 'DeleteSupplierRequisitionResponseWithId',
              ...response,
            })) ?? [],
        },
      })
    );
  });

const deleteCustomerRequisitionsMutation =
  mockDeleteCustomerRequisitionsMutation((req, res, ctx) => {
    const { ids } = req.variables;
    const deleteCustomerRequisitions: DeleteCustomerRequisitionInput[] =
      Array.isArray(ids) ? ids : ids ? [ids] : [];
    const params: BatchCustomerRequisitionInput = {
      deleteCustomerRequisitions,
    };
    return res(
      ctx.data({
        batchCustomerRequisition: {
          __typename: 'BatchCustomerRequisitionResponse',
          deleteCustomerRequisitions:
            RequisitionSchema.MutationResolvers.batchCustomerRequisition(
              null,
              params
            ).deleteCustomerRequisitions?.map?.(response => ({
              // The type for DeleteSupplierRequisitionResponseWithId has an optional
              // typename for some unknown reason, so re-add the typename to keep typescript happy.
              __typename: 'DeleteCustomerRequisitionResponseWithId',
              ...response,
            })) ?? [],
        },
      })
    );
  });

const insertSupplierRequisitionMutation = mockInsertSupplierRequisitionMutation(
  (req, res, ctx) => {
    return res(
      ctx.data({
        insertSupplierRequisition: {
          ...MutationService.requisition.supplier.insert(req.variables.input),
        },
      })
    );
  }
);

const insertCustomerRequisitionMutation = mockInsertCustomerRequisitionMutation(
  (req, res, ctx) => {
    return res(
      ctx.data({
        insertCustomerRequisition: {
          ...MutationService.requisition.customer.insert(req.variables.input),
        },
      })
    );
  }
);

const upsertSupplierRequisitionMutation = mockUpsertSupplierRequisitionMutation(
  (req, res, ctx) => {
    // This whole thing is a little unfortunate.
    // The variables can technically be arrays or a single object as is just normal
    // for graphql (If the array is a single element in variables, you can just send the
    // single element) - generally your graphql server framework (i.e. apollo) will parse this
    // into an array for you - so i've manually parsed it here.
    // Then, the graphql code gen types generally have `__typename` as an optional field as it's
    // not always queried for - but in the types returned by queries, when you specify the type name,
    // it becomes mandatory to have this in the response, so we have to manually add it.
    const params = {
      ...req.variables,
      deleteSupplierRequisitionLines: Array.isArray(
        req.variables.deleteSupplierRequisitionLines
      )
        ? req.variables.deleteSupplierRequisitionLines
        : req.variables.deleteSupplierRequisitionLines
        ? [req.variables.deleteSupplierRequisitionLines]
        : [],
      insertSupplierRequisitionLines: Array.isArray(
        req.variables.insertSupplierRequisitionLines
      )
        ? req.variables.insertSupplierRequisitionLines
        : req.variables.insertSupplierRequisitionLines
        ? [req.variables.insertSupplierRequisitionLines]
        : [],
      updateSupplierRequisitionLines: Array.isArray(
        req.variables.updateSupplierRequisitionLines
      )
        ? req.variables.updateSupplierRequisitionLines
        : req.variables.updateSupplierRequisitionLines
        ? [req.variables.updateSupplierRequisitionLines]
        : [],
      updateSupplierRequisitions: Array.isArray(
        req.variables.updateSupplierRequisitions
      )
        ? req.variables.updateSupplierRequisitions
        : req.variables.updateSupplierRequisitions
        ? [req.variables.updateSupplierRequisitions]
        : [],
    };

    const response =
      RequisitionSchema.MutationResolvers.batchSupplierRequisition(
        null,
        params
      );

    const updateSupplierRequisitions: {
      __typename: 'UpdateSupplierRequisitionResponseWithId';
      id: string;
    }[] =
      response.updateSupplierRequisitions?.map?.(r => ({
        __typename: 'UpdateSupplierRequisitionResponseWithId',
        id: r.id,
      })) ?? [];

    const insertSupplierRequisitionLines: {
      __typename: 'InsertSupplierRequisitionLineResponseWithId';
      id: string;
    }[] =
      response.insertSupplierRequisitionLines?.map?.(r => ({
        __typename: 'InsertSupplierRequisitionLineResponseWithId',
        id: r.id,
      })) ?? [];

    const deleteSupplierRequisitionLines: {
      __typename: 'DeleteSupplierRequisitionLineResponseWithId';
      id: string;
    }[] =
      response.deleteSupplierRequisitionLines?.map?.(r => ({
        __typename: 'DeleteSupplierRequisitionLineResponseWithId',
        id: r.id,
      })) ?? [];

    const updateSupplierRequisitionLines: {
      __typename: 'UpdateSupplierRequisitionLineResponseWithId';
      id: string;
    }[] =
      response.updateSupplierRequisitionLines?.map?.(r => ({
        __typename: 'UpdateSupplierRequisitionLineResponseWithId',
        id: r.id,
      })) ?? [];

    return res(
      ctx.data({
        batchSupplierRequisition: {
          __typename: 'BatchSupplierRequisitionResponse',
          updateSupplierRequisitions,
          insertSupplierRequisitionLines,
          deleteSupplierRequisitionLines,
          updateSupplierRequisitionLines,
        },
      })
    );
  }
);

const upsertCustomerRequisitionMutation = mockUpsertCustomerRequisitionMutation(
  (req, res, ctx) => {
    // This whole thing is a little unfortunate.
    // The variables can technically be arrays or a single object as is just normal
    // for graphql (If the array is a single element in variables, you can just send the
    // single element) - generally your graphql server framework (i.e. apollo) will parse this
    // into an array for you - so i've manually parsed it here.
    // Then, the graphql code gen types generally have `__typename` as an optional field as it's
    // not always queried for - but in the types returned by queries, when you specify the type name,
    // it becomes mandatory to have this in the response, so we have to manually add it.
    const params = {
      ...req.variables,
      deleteCustomerRequisitionLines: Array.isArray(
        req.variables.deleteCustomerRequisitionLines
      )
        ? req.variables.deleteCustomerRequisitionLines
        : req.variables.deleteCustomerRequisitionLines
        ? [req.variables.deleteCustomerRequisitionLines]
        : [],
      insertCustomerRequisitionLines: Array.isArray(
        req.variables.insertCustomerRequisitionLines
      )
        ? req.variables.insertCustomerRequisitionLines
        : req.variables.insertCustomerRequisitionLines
        ? [req.variables.insertCustomerRequisitionLines]
        : [],
      updateCustomerRequisitionLines: Array.isArray(
        req.variables.updateCustomerRequisitionLines
      )
        ? req.variables.updateCustomerRequisitionLines
        : req.variables.updateCustomerRequisitionLines
        ? [req.variables.updateCustomerRequisitionLines]
        : [],
      updateCustomerRequisitions: Array.isArray(
        req.variables.updateCustomerRequisitions
      )
        ? req.variables.updateCustomerRequisitions
        : req.variables.updateCustomerRequisitions
        ? [req.variables.updateCustomerRequisitions]
        : [],
    };

    const response =
      RequisitionSchema.MutationResolvers.batchCustomerRequisition(
        null,
        params
      );

    const updateCustomerRequisitions: {
      __typename: 'UpdateCustomerRequisitionResponseWithId';
      id: string;
    }[] =
      response.updateCustomerRequisitions?.map?.(r => ({
        __typename: 'UpdateCustomerRequisitionResponseWithId',
        id: r.id,
      })) ?? [];

    const insertCustomerRequisitionLines: {
      __typename: 'InsertCustomerRequisitionLineResponseWithId';
      id: string;
    }[] =
      response.insertCustomerRequisitionLines?.map?.(r => ({
        __typename: 'InsertCustomerRequisitionLineResponseWithId',
        id: r.id,
      })) ?? [];

    const deleteCustomerRequisitionLines: {
      __typename: 'DeleteCustomerRequisitionLineResponseWithId';
      id: string;
    }[] =
      response.deleteCustomerRequisitionLines?.map?.(r => ({
        __typename: 'DeleteCustomerRequisitionLineResponseWithId',
        id: r.id,
      })) ?? [];

    const updateCustomerRequisitionLines: {
      __typename: 'UpdateCustomerRequisitionLineResponseWithId';
      id: string;
    }[] =
      response.updateCustomerRequisitionLines?.map?.(r => ({
        __typename: 'UpdateCustomerRequisitionLineResponseWithId',
        id: r.id,
      })) ?? [];

    return res(
      ctx.data({
        batchCustomerRequisition: {
          __typename: 'BatchCustomerRequisitionResponse',
          updateCustomerRequisitions,
          insertCustomerRequisitionLines,
          deleteCustomerRequisitionLines,
          updateCustomerRequisitionLines,
        },
      })
    );
  }
);

export const RequisitionHandlers = [
  invoiceQuery,
  invoicesQuery,
  deleteSupplierRequisitionsMutation,
  deleteCustomerRequisitionsMutation,
  insertSupplierRequisitionMutation,
  insertCustomerRequisitionMutation,
  upsertSupplierRequisitionMutation,
  upsertCustomerRequisitionMutation,
  updateCustomerRequisition,
  updateSupplierRequisition,
];

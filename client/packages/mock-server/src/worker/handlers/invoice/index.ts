import {
  mockInvoiceQuery,
  mockInvoicesQuery,
  mockDeleteInboundShipmentsMutation,
  mockDeleteOutboundShipmentsMutation,
  mockInsertInboundShipmentMutation,
  mockInsertOutboundShipmentMutation,
  mockUpsertInboundShipmentMutation,
  mockUpsertOutboundShipmentMutation,
  DeleteInboundShipmentInput,
  BatchInboundShipmentInput,
  BatchOutboundShipmentInput,
} from '@openmsupply-client/common/src/types';
import { ResolverService } from '../../../api/resolvers';
import { Invoice as InvoiceSchema } from '../../../schema/Invoice';

const invoiceQuery = mockInvoiceQuery((req, res, ctx) => {
  const invoice = ResolverService.invoice.byId(req.variables.id);
  return res(
    ctx.data({
      invoice: {
        ...invoice,
        otherParty: { ...invoice.otherParty, __typename: 'NameNode' },
      },
    })
  );
});

const invoicesQuery = mockInvoicesQuery((req, res, ctx) => {
  return res(
    ctx.data({ invoices: ResolverService.invoice.list(req.variables) })
  );
});

const deleteInboundShipmentsMutation = mockDeleteInboundShipmentsMutation(
  (req, res, ctx) => {
    const { ids } = req.variables;
    const deleteInboundShipments: DeleteInboundShipmentInput[] = Array.isArray(
      ids
    )
      ? ids
      : ids
      ? [ids]
      : [];

    const params: BatchInboundShipmentInput = {
      deleteInboundShipments,
    };
    return res(
      ctx.data({
        batchInboundShipment: {
          __typename: 'BatchInboundShipmentResponse',
          deleteInboundShipments:
            InvoiceSchema.MutationResolvers.batchInboundShipment(
              null,
              params
            ).deleteInboundShipments?.map?.(response => ({
              // The type for DeleteInboundShipmentResponseWithId has an optional
              // typename for some unknown reason, so re-add the typename to keep typescript happy.
              __typename: 'DeleteInboundShipmentResponseWithId',
              ...response,
            })) ?? [],
        },
      })
    );
  }
);

const deleteOutboundShipmentsMutation = mockDeleteOutboundShipmentsMutation(
  (req, res, ctx) => {
    const { ids } = req.variables;
    const deleteOutboundShipments: string[] = Array.isArray(ids)
      ? ids
      : ids
      ? [ids]
      : [];
    const params: BatchOutboundShipmentInput = {
      deleteOutboundShipments,
    };
    return res(
      ctx.data({
        batchOutboundShipment: {
          __typename: 'BatchOutboundShipmentResponse',
          deleteOutboundShipments:
            InvoiceSchema.MutationResolvers.batchOutboundShipment(
              null,
              params
            ).deleteOutboundShipments?.map?.(response => ({
              // The type for DeleteInboundShipmentResponseWithId has an optional
              // typename for some unknown reason, so re-add the typename to keep typescript happy.
              __typename: 'DeleteOutboundShipmentResponseWithId',
              ...response,
            })) ?? [],
        },
      })
    );
  }
);

const insertInboundShipmentMutation = mockInsertInboundShipmentMutation(
  (req, res, ctx) => {
    return res(
      ctx.data({
        insertInboundShipment: {
          __typename: 'InvoiceNode',
          ...InvoiceSchema.MutationResolvers.insertInboundShipment(null, {
            input: req.variables,
          }),
        },
      })
    );
  }
);

const insertOutboundShipmentMutation = mockInsertOutboundShipmentMutation(
  (req, res, ctx) => {
    return res(
      ctx.data({
        insertOutboundShipment: {
          __typename: 'InvoiceNode',
          ...InvoiceSchema.MutationResolvers.insertOutboundShipment(null, {
            input: req.variables,
          }),
        },
      })
    );
  }
);

const upsertInboundShipmentMutation = mockUpsertInboundShipmentMutation(
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
      deleteInboundShipmentLines: Array.isArray(
        req.variables.deleteInboundShipmentLines
      )
        ? req.variables.deleteInboundShipmentLines
        : req.variables.deleteInboundShipmentLines
        ? [req.variables.deleteInboundShipmentLines]
        : [],
      insertInboundShipmentLines: Array.isArray(
        req.variables.insertInboundShipmentLines
      )
        ? req.variables.insertInboundShipmentLines
        : req.variables.insertInboundShipmentLines
        ? [req.variables.insertInboundShipmentLines]
        : [],
      updateInboundShipmentLines: Array.isArray(
        req.variables.updateInboundShipmentLines
      )
        ? req.variables.updateInboundShipmentLines
        : req.variables.updateInboundShipmentLines
        ? [req.variables.updateInboundShipmentLines]
        : [],
      updateInboundShipments: Array.isArray(
        req.variables.updateInboundShipments
      )
        ? req.variables.updateInboundShipments
        : req.variables.updateInboundShipments
        ? [req.variables.updateInboundShipments]
        : [],
    };

    const response = InvoiceSchema.MutationResolvers.batchInboundShipment(
      null,
      params
    );

    const updateInboundShipments: {
      __typename: 'UpdateInboundShipmentResponseWithId';
      id: string;
    }[] =
      response.updateInboundShipments?.map?.(r => ({
        __typename: 'UpdateInboundShipmentResponseWithId',
        id: r.id,
      })) ?? [];

    const insertInboundShipmentLines: {
      __typename: 'InsertInboundShipmentLineResponseWithId';
      id: string;
    }[] =
      response.insertInboundShipmentLines?.map?.(r => ({
        __typename: 'InsertInboundShipmentLineResponseWithId',
        id: r.id,
      })) ?? [];

    const deleteInboundShipmentLines: {
      __typename: 'DeleteInboundShipmentLineResponseWithId';
      id: string;
    }[] =
      response.deleteInboundShipmentLines?.map?.(r => ({
        __typename: 'DeleteInboundShipmentLineResponseWithId',
        id: r.id,
      })) ?? [];

    const updateInboundShipmentLines: {
      __typename: 'UpdateInboundShipmentLineResponseWithId';
      id: string;
    }[] =
      response.updateInboundShipmentLines?.map?.(r => ({
        __typename: 'UpdateInboundShipmentLineResponseWithId',
        id: r.id,
      })) ?? [];

    return res(
      ctx.data({
        batchInboundShipment: {
          __typename: 'BatchInboundShipmentResponse',
          updateInboundShipments,
          insertInboundShipmentLines,
          deleteInboundShipmentLines,
          updateInboundShipmentLines,
        },
      })
    );
  }
);

const upsertOutboundShipmentMutation = mockUpsertOutboundShipmentMutation(
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
      deleteOutboundShipmentLines: Array.isArray(
        req.variables.deleteOutboundShipmentLines
      )
        ? req.variables.deleteOutboundShipmentLines
        : req.variables.deleteOutboundShipmentLines
        ? [req.variables.deleteOutboundShipmentLines]
        : [],
      insertOutboundShipmentLines: Array.isArray(
        req.variables.insertOutboundShipmentLines
      )
        ? req.variables.insertOutboundShipmentLines
        : req.variables.insertOutboundShipmentLines
        ? [req.variables.insertOutboundShipmentLines]
        : [],
      updateOutboundShipmentLines: Array.isArray(
        req.variables.updateOutboundShipmentLines
      )
        ? req.variables.updateOutboundShipmentLines
        : req.variables.updateOutboundShipmentLines
        ? [req.variables.updateOutboundShipmentLines]
        : [],
      updateOutboundShipments: Array.isArray(
        req.variables.updateOutboundShipments
      )
        ? req.variables.updateOutboundShipments
        : req.variables.updateOutboundShipments
        ? [req.variables.updateOutboundShipments]
        : [],
    };

    const response = InvoiceSchema.MutationResolvers.batchOutboundShipment(
      null,
      params
    );

    const updateOutboundShipments: {
      __typename: 'UpdateOutboundShipmentResponseWithId';
      id: string;
    }[] =
      response.updateOutboundShipments?.map?.(r => ({
        __typename: 'UpdateOutboundShipmentResponseWithId',
        id: r.id,
      })) ?? [];

    const insertOutboundShipmentLines: {
      __typename: 'InsertOutboundShipmentLineResponseWithId';
      id: string;
    }[] =
      response.insertOutboundShipmentLines?.map?.(r => ({
        __typename: 'InsertOutboundShipmentLineResponseWithId',
        id: r.id,
      })) ?? [];

    const deleteOutboundShipmentLines: {
      __typename: 'DeleteOutboundShipmentLineResponseWithId';
      id: string;
    }[] =
      response.deleteOutboundShipmentLines?.map?.(r => ({
        __typename: 'DeleteOutboundShipmentLineResponseWithId',
        id: r.id,
      })) ?? [];

    const updateOutboundShipmentLines: {
      __typename: 'UpdateOutboundShipmentLineResponseWithId';
      id: string;
    }[] =
      response.updateOutboundShipmentLines?.map?.(r => ({
        __typename: 'UpdateOutboundShipmentLineResponseWithId',
        id: r.id,
      })) ?? [];

    return res(
      ctx.data({
        batchOutboundShipment: {
          __typename: 'BatchOutboundShipmentResponse',
          updateOutboundShipments,
          insertOutboundShipmentLines,
          deleteOutboundShipmentLines,
          updateOutboundShipmentLines,
        },
      })
    );
  }
);

export const InvoiceHandlers = [
  invoiceQuery,
  invoicesQuery,
  deleteInboundShipmentsMutation,
  deleteOutboundShipmentsMutation,
  insertInboundShipmentMutation,
  insertOutboundShipmentMutation,
  upsertInboundShipmentMutation,
  upsertOutboundShipmentMutation,
];

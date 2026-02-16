import namesQueryText from './graphql/customer.graphql';
import itemsQueryText from './graphql/items.graphql';
import batchOutboundShipmentMutationText from './graphql/batchOutboundShipment.graphql';
import saveOutboundShipmentItemLines from './graphql/saveOutboundShipmentItemLines.graphql';
import checkOutboundShipmentExistsText from './graphql/checkOutboundShipmentById.graphql';
import {
  BatchOutboundShipmentMutation,
  BatchOutboundShipmentMutationVariables,
  ItemsQuery,
  ItemsQueryVariables,
  NamesQuery,
  NamesQueryVariables,
  SaveOutboundShipmentItemLinesMutation,
  CheckInvoiceExistsQueryVariables,
  CheckInvoiceExistsQuery,
} from './generated-types/graphql';
import { MutationsSaveOutboundShipmentItemLinesArgs } from './../codegenTypes';
import { Graphql, ItemsEndpointResponse } from './types';

export const customerQuery = (
  variables: NamesQueryVariables
): { result?: NamesQuery; customerError?: Graphql['output'] } => {
  try {
    const result = use_graphql({
      query: namesQueryText,
      variables,
    }) as NamesQuery;
    if (!result || result.names.nodes.length < 1) {
      return {
        customerError: {
          success: false,
          message: `No customer found with code: ${variables.filter?.code?.equalTo} (codes are case sensitive)`,
          items: [],
        },
      };
    }
    return { result };
  } catch (error) {
    return {
      customerError: {
        success: false,
        message: `Error getting customer: ${error}`,
        items: [],
      },
    };
  }
};

export const itemsQuery = (
  storeId: string,
  universalCode: string
): { result?: ItemsQuery; itemsError?: ItemsEndpointResponse } => {
  try {
    const result = use_graphql({
      query: itemsQueryText,
      variables: {
        storeId,
        filter: { universalCode: { equalTo: universalCode } },
      } as ItemsQueryVariables,
    }) as ItemsQuery;
    if (!result || result.items.totalCount < 1) {
      return {
        itemsError: {
          universalCode,
          success: false,
          message: `No item found for universalCode: ${universalCode}`,
        },
      };
    }
    return { result };
  } catch (error) {
    return {
      itemsError: {
        universalCode,
        success: false,
        message: `Error getting items: ${error}`,
      },
    };
  }
};

export const batchOutboundShipmentQuery = (
  variables: BatchOutboundShipmentMutationVariables
): BatchOutboundShipmentMutation => {
  return use_graphql({
    query: batchOutboundShipmentMutationText,
    variables,
  }) as BatchOutboundShipmentMutation;
};

export const batchDeleteOutboundShipmentMutation = (
  storeId: string,
  shipmentId: string
): undefined => {
  const variables: BatchOutboundShipmentMutationVariables = {
    storeId: storeId,
    input: {
      deleteOutboundShipments: [shipmentId],
    },
  };
  try {
    use_graphql({
      query: batchOutboundShipmentMutationText,
      variables,
    }) as BatchOutboundShipmentMutation;
  } catch (error) {
    // just log if we fail to delete
    log({ t: 'deleteOutboundShipmentError', error });
  }
};

export const saveOutboundShipmentLineItemsMutation = (
  variables: MutationsSaveOutboundShipmentItemLinesArgs
): SaveOutboundShipmentItemLinesMutation => {
  return use_graphql({
    query: saveOutboundShipmentItemLines,
    variables,
  }) as SaveOutboundShipmentItemLinesMutation;
};

export const checkOutboundShipmentExistsQuery = (
  variables: CheckInvoiceExistsQueryVariables
): { invoiceIdError?: Graphql['output'] } => {
  try {
    const result = use_graphql({
      query: checkOutboundShipmentExistsText,
      variables,
    }) as CheckInvoiceExistsQuery;

    if (result.invoice.__typename === 'InvoiceNode' && result.invoice.id) {
      return {
        invoiceIdError: {
          success: false,
          message: `InvoiceId - ${variables.id} already exists. Shipment No.: ${result.invoice.invoiceNumber}`,
          items: [],
        },
      };
    }

    return { invoiceIdError: undefined };
  } catch (error) {
    return {
      invoiceIdError: {
        success: false,
        message: `Error checking UUID exists for invoiceId. error: ${error}`,
        items: [],
      },
    };
  }
};

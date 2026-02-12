import namesQueryText from './graphql/customer.graphql';
import itemsQueryText from './graphql/items.graphql';
import batchOutboundShipmentMutationText from './graphql/batchOutboundShipment.graphql';
import insertOutboundShipmentLineText from './graphql/insertOutboundShipmentUnallocatedLine.graphql';
import saveOutboundShipmentItemLines from './graphql/saveOutboundShipmentItemLines.graphql';
import {
  BatchOutboundShipmentMutation,
  BatchOutboundShipmentMutationVariables,
  ItemsQuery,
  ItemsQueryVariables,
  NamesQuery,
  NamesQueryVariables,
  InsertOutboundShipmentUnallocatedLineMutation,
  InsertOutboundShipmentUnallocatedLineMutationVariables,
  SaveOutboundShipmentItemLinesMutation,
} from './generated-types/graphql';
import { MutationsSaveOutboundShipmentItemLinesArgs } from './../codegenTypes';
import { Graphql } from './types';

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
          message: `No customer found for filter: ${JSON.stringify(variables.filter)}`,
        },
      };
    }
    return { result };
  } catch (error) {
    return {
      customerError: {
        success: false,
        message: `Error getting customer: ${error}`,
      },
    };
  }
};

export const itemsQuery = (
  variables: ItemsQueryVariables
): { result?: ItemsQuery; itemsError?: Graphql['output'] } => {
  try {
    const result = use_graphql({
      query: itemsQueryText,
      variables,
    }) as ItemsQuery;
    if (!result || result.items.totalCount < 1) {
      return {
        itemsError: {
          success: false,
          message: `No items found for items filter: ${JSON.stringify(variables.filter)}`,
        },
      };
    }
    return { result };
  } catch (error) {
    return {
      itemsError: {
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

export const insertOutboundShipmentLineQuery = (
  variables: InsertOutboundShipmentUnallocatedLineMutationVariables
): InsertOutboundShipmentUnallocatedLineMutation => {
  return use_graphql({
    query: insertOutboundShipmentLineText,
    variables,
  }) as InsertOutboundShipmentUnallocatedLineMutation;
};

export const batchDeleteOutboundShipmentQuery = (
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

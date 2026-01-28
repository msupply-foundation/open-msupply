/* eslint-disable camelcase */
import { BackendPlugins } from '@common/types';
import { IssueStockEndpointInput, IssueStockEndpointResponse } from './types';
import namesQueryText from './graphql/customer.graphql';
import itemsQueryText from './graphql/items.graphql';
import outboundShipmentMutationText from './graphql/batchOutboundShipment.graphql';
import {
  BatchOutboundShipmentMutation,
  BatchOutboundShipmentMutationVariables,
  ItemsQuery,
  ItemsQueryVariables,
  NamesQuery,
  NamesQueryVariables,
} from './generated-types/graphql';
import { UpdateOutboundShipmentStatusInput } from '../codegenTypes';
import { uuidv7 } from 'uuidv7';

type Graphql = {
  input: IssueStockEndpointInput;
  output: IssueStockEndpointResponse;
};

const customerQuery = (variables: NamesQueryVariables): { result?: NamesQuery; customerError?: Graphql['output'] } => {
  try {
    const result = use_graphql({ query: namesQueryText, variables }) as NamesQuery;
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

const itemsQuery = (variables: ItemsQueryVariables): { result?: ItemsQuery; itemsError?: Graphql['output'] } => {
  try {
    const result = use_graphql({ query: itemsQueryText, variables }) as ItemsQuery;
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

const batchOutboundShipmentQuery = (
  variables: BatchOutboundShipmentMutationVariables
): BatchOutboundShipmentMutation => {
  return use_graphql({
    query: outboundShipmentMutationText,
    variables,
  }) as BatchOutboundShipmentMutation;
};

const batchDeleteOutboundShipmentQuery = (storeId: string, shipmentId: string): undefined => {
  const variables: BatchOutboundShipmentMutationVariables = {
    storeId: storeId,
    input: {
      deleteOutboundShipments: [shipmentId],
    },
  };
  try {
    use_graphql({
      query: outboundShipmentMutationText,
      variables,
    }) as BatchOutboundShipmentMutation;
  } catch (error) {
    log({ t: 'deleteOutboundShipmentError', error });
  }
};

const plugins: BackendPlugins = {
  graphql_query: ({ input }): Graphql['output'] => {
    const inp = input as Graphql['input'];

    // --- the first store in my data set
    // --- has no stock, and will never issue stock. Also, isVisible = false for most stores
    // const issueingStoreId = store_id;

    const { stores: activeStores } = get_active_stores_on_site();
    if (!activeStores || activeStores.length < 1) {
      return { success: false, message: 'No active stores found' };
    }

    const issueingStoreId = activeStores[0].store_row.id;

    const { result: customerQueryResult, customerError } = customerQuery({
      storeId: issueingStoreId,
      filter: inp.customerFilter,
    });

    if (customerError) return customerError;
    if (!customerQueryResult) {
      return {
        success: false,
        message: `Error getting customer with filter of: ${inp.customerFilter}`,
      };
    }

    const customer = customerQueryResult.names.nodes[0];
    const customerId = customerQueryResult.names.nodes[0].id;

    const { result: itemsQueryResult, itemsError } = itemsQuery({
      storeId: issueingStoreId,
      filter: inp.itemFilter,
    });

    if (itemsError) return itemsError;
    if (!itemsQueryResult) {
      return {
        success: false,
        message: `Error getting item with filter of: ${inp.itemFilter}`,
      };
    }

    const foundItem = itemsQueryResult.items.nodes[0];

    if (foundItem.availableStockOnHand < inp.quantity) {
      return {
        success: false,
        message: `Not enough stock to fullfil order. Available stock for code ${foundItem.code}: ${foundItem.availableStockOnHand}  Qty requested: ${inp.quantity}`,
      };
    }

    const shipmentId = uuidv7();
    const shipmentLineId = uuidv7();

    // Create outbound shipment
    const outboundShipmentInput: BatchOutboundShipmentMutationVariables = {
      storeId: issueingStoreId,
      input: {
        continueOnError: false,
        insertOutboundShipments: [
          {
            id: shipmentId,
            otherPartyId: customerId,
          },
        ],
        insertOutboundShipmentUnallocatedLines: [
          {
            id: shipmentLineId,
            invoiceId: shipmentId,
            itemId: foundItem.id,
            quantity: inp.quantity,
          },
        ],
      },
    };

    try {
      const insertOutboundShipmentUnallocatedResult = batchOutboundShipmentQuery(outboundShipmentInput);

      if (!insertOutboundShipmentUnallocatedResult) {
        batchDeleteOutboundShipmentQuery(issueingStoreId, shipmentId);
        throw Error(`Failed to issue the stock for item code: ${foundItem.code}, quantity: ${inp.quantity}`);
      }
    } catch (error) {
      return {
        success: true,
        message: `${error}`,
      };
    }

    // Allocate the outbound shipment lines

    try {
      const allocateOutboundShipmentInput: BatchOutboundShipmentMutationVariables = {
        storeId: issueingStoreId,
        input: {
          allocatedOutboundShipmentUnallocatedLines: [shipmentLineId],
        },
      };

      const allocateOutboundShipmentUnallocatedResult = batchOutboundShipmentQuery(allocateOutboundShipmentInput);

      log({ t: 'allocateResult', allocateOutboundShipmentUnallocatedResult });

      if (!allocateOutboundShipmentUnallocatedResult) {
        batchDeleteOutboundShipmentQuery(issueingStoreId, shipmentId);
        throw Error(
          `Failed allocate lines to issue the stock for item code: ${foundItem.code}, quantity: ${inp.quantity}`
        );
      }
    } catch (error) {
      return {
        success: true,
        message: `${error}`,
      };
    }

    // Update to 'shipped'
    try {
      const updateOutboundShipmentInput: BatchOutboundShipmentMutationVariables = {
        storeId: issueingStoreId,
        input: {
          updateOutboundShipments: [
            {
              id: shipmentId,
              status: UpdateOutboundShipmentStatusInput.Shipped,
            },
          ],
        },
      };

      const updateOutboundShipmentResult = batchOutboundShipmentQuery(updateOutboundShipmentInput);

      if (!updateOutboundShipmentResult) {
        batchDeleteOutboundShipmentQuery(issueingStoreId, shipmentId);
        throw Error(
          `Failed to update order to issue the stock for item code: ${foundItem.code}, quantity: ${inp.quantity}`
        );
      }
    } catch (error) {
      return {
        success: true,
        message: `${error}`,
      };
    }

    return {
      success: true,
      message: `Issued stock for store: ${customer.name}, item: ${foundItem.code}, quantity: ${inp.quantity}`,
    };
  },
};

export { plugins };

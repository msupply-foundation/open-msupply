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

const customerQuery = (
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

const itemsQuery = (
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

const batchOutboundShipmentQuery = (
  variables: BatchOutboundShipmentMutationVariables
): BatchOutboundShipmentMutation => {
  return use_graphql({
    query: outboundShipmentMutationText,
    variables,
  }) as BatchOutboundShipmentMutation;
};

const batchDeleteOutboundShipmentQuery = (
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
      query: outboundShipmentMutationText,
      variables,
    }) as BatchOutboundShipmentMutation;
  } catch (error) {
    // just log if we fail to delete
    log({ t: 'deleteOutboundShipmentError', error });
  }
};

const plugins: BackendPlugins = {
  graphql_query: ({ store_id, input }): Graphql['output'] => {
    const inp = input as Graphql['input'];

    const { stores: activeStores } = get_active_stores_on_site();
    if (!activeStores || activeStores.length < 1) {
      return { success: false, message: 'No active stores found' };
    }

    // Take first store
    // const issuingStore = activeStores[0];
    // For testing only, TODO: remove on last commit
    const issuingStore = activeStores.find(s => s.store_row.id === store_id);

    if (!issuingStore) {
      return { success: false, message: 'No store found' };
    }

    const issuingStoreId = issuingStore.store_row.id;

    const { result: customerQueryResult, customerError } = customerQuery({
      storeId: issuingStoreId,
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

    const { result: itemsQueryResult, itemsError } = itemsQuery({
      storeId: issuingStoreId,
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
      let message = `Not enough stock to fullfil order. Store: ${issuingStore.name_row.name}. `;
      message += `Available stock for item code ${foundItem.msupplyUniversalCode}: ${foundItem.availableStockOnHand}, Qty requested: ${inp.quantity},`;
      return {
        success: false,
        message,
      };
    }

    const shipmentId = uuidv7();
    const shipmentLineId = uuidv7();

    // Insert outbound shipment
    const insertInput: BatchOutboundShipmentMutationVariables = {
      storeId: issuingStoreId,
      input: {
        insertOutboundShipments: [
          {
            id: shipmentId,
            otherPartyId: customer.id,
          },
        ],
      },
    };

    let errText = `Failed to issue the stock for item code: ${foundItem.msupplyUniversalCode}, quantity: ${inp.quantity}, customer: ${customer.name},`;

    try {
      const insertShipmentResult = batchOutboundShipmentQuery(insertInput);

      if (
        !insertShipmentResult.batchOutboundShipment.insertOutboundShipments ||
        insertShipmentResult.batchOutboundShipment.insertOutboundShipments
          .length < 1
      ) {
        errText +=
          'Insert order failed. ' +
          errText +
          ' error: no insert lines returned';
        throw Error(errText);
      }

      if (
        insertShipmentResult.batchOutboundShipment.insertOutboundShipments[0]
          .response.__typename === 'InsertOutboundShipmentError'
      ) {
        errText = 'Insert order failed. ' + errText;
        errText += ` error: ${insertShipmentResult.batchOutboundShipment.insertOutboundShipments[0].response.error.description}`;
        throw Error(errText);
      }

      if (
        insertShipmentResult.batchOutboundShipment.insertOutboundShipments[0]
          .response.__typename === 'NodeError'
      ) {
        errText = 'Insert order failed. ' + errText;
        errText += ` error: ${insertShipmentResult.batchOutboundShipment.insertOutboundShipments[0].response.error.description}`;
        throw Error(errText);
      }
    } catch (error) {
      batchDeleteOutboundShipmentQuery(issuingStoreId, shipmentId);
      return {
        success: false,
        message: `${error}`,
      };
    }

    // Insert line
    const insertLineInput: BatchOutboundShipmentMutationVariables = {
      storeId: issuingStoreId,
      input: {
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
      const insertLineResult = batchOutboundShipmentQuery(insertLineInput);

      if (
        !insertLineResult.batchOutboundShipment
          .insertOutboundShipmentUnallocatedLines ||
        insertLineResult.batchOutboundShipment
          .insertOutboundShipmentUnallocatedLines.length < 1
      ) {
        errText = 'Insert line failed. ' + errText;
        errText += ` error: no lines returned in response`;
        throw Error(errText);
      }

      if (
        insertLineResult.batchOutboundShipment
          .insertOutboundShipmentUnallocatedLines[0].response.__typename ===
        'InsertOutboundShipmentUnallocatedLineError'
      ) {
        errText = 'Insert line failed. ' + errText;
        errText += ` error: ${insertLineResult.batchOutboundShipment.insertOutboundShipmentUnallocatedLines[0].response.error.description}`;
        throw Error(errText);
      }
    } catch (error) {
      batchDeleteOutboundShipmentQuery(issuingStoreId, shipmentId);
      return {
        success: false,
        message: `${error}`,
      };
    }

    // Allocate the outbound shipment lines

    try {
      const allocateOutboundShipmentInput: BatchOutboundShipmentMutationVariables =
        {
          storeId: issuingStoreId,
          input: {
            allocatedOutboundShipmentUnallocatedLines: [shipmentLineId],
          },
        };

      const allocateLineResult = batchOutboundShipmentQuery(
        allocateOutboundShipmentInput
      );
      log(allocateLineResult);
      if (
        !allocateLineResult.batchOutboundShipment
          .allocateOutboundShipmentUnallocatedLines ||
        allocateLineResult.batchOutboundShipment
          .allocateOutboundShipmentUnallocatedLines.length < 1
      ) {
        errText = 'Failed to allocate line. ' + errText;
        errText += ` error: no lines returned in response`;
        throw Error(errText);
      }

      if (
        allocateLineResult.batchOutboundShipment
          .allocateOutboundShipmentUnallocatedLines[0].response.__typename ===
        'AllocateOutboundShipmentUnallocatedLineError'
      ) {
        errText = 'Failed to allocate line. ' + errText;
        errText += ` error: ${allocateLineResult.batchOutboundShipment.allocateOutboundShipmentUnallocatedLines[0].response.error.description}`;
        throw Error(errText);
      }
    } catch (error) {
      return {
        success: false,
        message: `${error}`,
      };
    }

    // Update to 'shipped'
    try {
      const updateOutboundShipmentInput: BatchOutboundShipmentMutationVariables =
        {
          storeId: issuingStoreId,
          input: {
            updateOutboundShipments: [
              {
                id: shipmentId,
                status: UpdateOutboundShipmentStatusInput.Shipped,
              },
            ],
          },
        };

      const updateShipmentResult = batchOutboundShipmentQuery(
        updateOutboundShipmentInput
      );

      if (
        !updateShipmentResult.batchOutboundShipment.updateOutboundShipments ||
        updateShipmentResult.batchOutboundShipment.updateOutboundShipments
          .length < 1
      ) {
        errText = 'Failed to update order status. ' + errText;
        errText += ' error: no lines returned in response';
        throw Error(errText);
      }

      if (
        updateShipmentResult.batchOutboundShipment.updateOutboundShipments[0]
          .response.__typename === 'UpdateOutboundShipmentError'
      ) {
        errText = 'Failed to update order status. ' + errText;
        errText += ` error: ${updateShipmentResult.batchOutboundShipment.updateOutboundShipments[0].response.error.description}`;
        throw Error(errText);
      }

      if (
        updateShipmentResult.batchOutboundShipment.updateOutboundShipments[0]
          .response.__typename === 'NodeError'
      ) {
        errText = 'Failed to update order status. ' + errText;
        errText += ` error: ${updateShipmentResult.batchOutboundShipment.updateOutboundShipments[0].response.error.description}`;
        throw Error(errText);
      }
    } catch (error) {
      return {
        success: false,
        message: `${error}`,
      };
    }

    return {
      success: true,
      message: `Issued stock for store: ${customer.name}, item: ${foundItem.msupplyUniversalCode}, quantity: ${inp.quantity}`,
    };
  },
};

export { plugins };

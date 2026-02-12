/* eslint-disable camelcase */
import { BackendPlugins } from '@common/types';
import { Graphql } from './types/index';
import {
  BatchOutboundShipmentMutationVariables,
  InsertOutbounndShipmentUnallocatedLineMutationVariables,
} from './generated-types/graphql';
import {
  InsertOutboundShipmentUnallocatedLineInput,
  InsertOutboundShipmentLineInput,
  // UpdateOutboundShipmentStatusInput,
} from '../codegenTypes';
import { uuidv7 } from 'uuidv7';
import {
  customerQuery,
  itemsQuery,
  batchOutboundShipmentQuery,
  batchDeleteOutboundShipmentQuery,
  insertOutboundShipmentLineQuery,
} from './queries';
import { format } from 'date-fns/format';
import { sortAndClassifyBatches } from './utils';

const plugins: BackendPlugins = {
  graphql_query: ({ store_id, input }): Graphql['output'] => {
    const inp = input as Graphql['input'];
    const shipmentId = uuidv7();

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

    // if (foundItem.availableStockOnHand < inp.quantity) {
    //   let message = `Not enough stock to fullfil order. Store: ${issuingStore.name_row.name}. `;
    //   message += `Available stock for item code ${foundItem.msupplyUniversalCode}: ${foundItem.availableStockOnHand}, Qty requested: ${inp.quantity},`;
    //   return {
    //     success: false,
    //     message,
    //   };
    // }

    const { unexpiredBatches, expiredBatches } = sortAndClassifyBatches(
      foundItem.availableBatches.nodes
    );

    // Determine if FEFO unexpired can fullfil entire order

    const today = format(new Date(), 'yyyy-MM-dd');
    const insertLines: InsertOutboundShipmentLineInput[] = [];
    let insertUnallocatedLine:
      | InsertOutboundShipmentUnallocatedLineInput
      | undefined = undefined;
    let totalUnitsSupplied = 0;

    for (let i = 0; i < unexpiredBatches.length; i++) {
      const batch = unexpiredBatches[i];
      const shipmentLineId = uuidv7();
      const unitsInBatch = batch.availableNumberOfPacks * batch.packSize;

      if (unitsInBatch === 0) continue;

      if (totalUnitsSupplied >= inp.quantity) break;

      if (batch.expiryDate >= today) {
        log({ t: 'batch expiry is greater than today' });
        if (unitsInBatch > inp.quantity) {
          const packsToSupply = Math.ceil(inp.quantity / batch.packSize);
          totalUnitsSupplied += packsToSupply * batch.packSize;

          insertLines.push({
            id: shipmentLineId,
            invoiceId: shipmentId,
            stockLineId: batch.id,
            numberOfPacks: packsToSupply,
          });
          break;
        } else {
          totalUnitsSupplied += batch.availableNumberOfPacks * batch.packSize;
          insertLines.push({
            id: shipmentLineId,
            invoiceId: shipmentId,
            stockLineId: batch.id,
            numberOfPacks: batch.availableNumberOfPacks,
          });
        }
      }
    }

    // Determine if LEFO expired can fullfill rest of order

    for (let j = 0; j < expiredBatches.length; j++) {
      const batch = expiredBatches[j];
      const shipmentLineId = uuidv7();
      const unitsInBatch = batch.availableNumberOfPacks / batch.packSize;

      if (totalUnitsSupplied >= inp.quantity) break;

      if (batch.expiryDate < today) {
        log(batch);
        if (unitsInBatch > inp.quantity) {
          const packsToSupply = inp.quantity / batch.packSize;
          totalUnitsSupplied += packsToSupply * batch.packSize;
          log({ t: 'here in expired and unitsInBatch > inp.q' });
          insertLines.push({
            id: shipmentLineId,
            invoiceId: shipmentId,
            stockLineId: batch.id,
            numberOfPacks: packsToSupply,
          });
          break;
        } else {
          log({ t: 'here in expired and unitsInBatch < inp.q' });
          totalUnitsSupplied += batch.availableNumberOfPacks * batch.packSize;
          insertLines.push({
            id: shipmentLineId,
            invoiceId: shipmentId,
            stockLineId: batch.id,
            numberOfPacks: batch.availableNumberOfPacks,
          });
        }
      }
    }

    // If still unfully allocated, create placeholder for rest of items

    if (totalUnitsSupplied < inp.quantity) {
      log({ t: 'here in not fully allocated' });
      const shipmentLineId = uuidv7();
      insertUnallocatedLine = {
        id: shipmentLineId,
        invoiceId: shipmentId,
        itemId: foundItem.id,
        quantity: inp.quantity - totalUnitsSupplied,
      };
    }

    log({ t: 'insertLines', insertLines });
    log({ t: 'unallocatedLine', insertUnallocatedLine });

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

    // Insert allocated lines
    if (insertLines.length > 0) {
      const insertLineInput: BatchOutboundShipmentMutationVariables = {
        storeId: issuingStoreId,
        input: {
          insertOutboundShipmentLines: [...insertLines],
        },
      };

      try {
        const insertLineResult = batchOutboundShipmentQuery(insertLineInput);

        if (
          !insertLineResult.batchOutboundShipment.insertOutboundShipmentLines ||
          insertLineResult.batchOutboundShipment.insertOutboundShipmentLines
            .length < 1
        ) {
          errText = 'Insert line failed. ' + errText;
          errText += ` error: no lines returned in response`;
          throw Error(errText);
        }

        if (
          insertLineResult.batchOutboundShipment.insertOutboundShipmentLines[0]
            .response.__typename === 'InsertOutboundShipmentLineError'
        ) {
          errText = 'Insert line failed. ' + errText;
          errText += ` error: ${insertLineResult.batchOutboundShipment.insertOutboundShipmentLines[0].response.error.description}`;
          throw Error(errText);
        }
      } catch (error) {
        batchDeleteOutboundShipmentQuery(issuingStoreId, shipmentId);
        return {
          success: false,
          message: `${error}`,
        };
      }
    }

    // Insert unallocated line

    if (insertUnallocatedLine) {
      const insertLineInput: InsertOutbounndShipmentUnallocatedLineMutationVariables =
        {
          storeId: issuingStoreId,
          id: insertUnallocatedLine.id,
          invoiceId: shipmentId,
          itemId: insertUnallocatedLine.itemId,
          quantity: insertUnallocatedLine.quantity,
        };

      try {
        const insertUnallocatedLineResult =
          insertOutboundShipmentLineQuery(insertLineInput);

        log({ t: 'insertResult', insertUnallocatedLineResult });

        if (
          !insertUnallocatedLineResult.insertOutboundShipmentUnallocatedLine
        ) {
          errText = 'Unallocated line insert failed. ' + errText;
          errText += ` error: no lines returned in response`;
          throw Error(errText);
        }

        if (
          insertUnallocatedLineResult.insertOutboundShipmentUnallocatedLine
            .__typename === 'InsertOutboundShipmentUnallocatedLineError'
        ) {
          errText = 'Unallocated line insert failed. ' + errText;
          errText += ` error: ${insertUnallocatedLineResult.insertOutboundShipmentUnallocatedLine.error.description}`;
          throw Error(errText);
        }
      } catch (error) {
        batchDeleteOutboundShipmentQuery(issuingStoreId, shipmentId);
        return {
          success: false,
          message: `${error}`,
        };
      }
    }

    // Allocate the outbound shipment lines
    if (insertUnallocatedLine) {
      try {
        const allocateOutboundShipmentInput: BatchOutboundShipmentMutationVariables =
          {
            storeId: issuingStoreId,
            input: {
              allocatedOutboundShipmentUnallocatedLines: [
                insertUnallocatedLine.id,
              ],
            },
          };

        const allocateLineResult = batchOutboundShipmentQuery(
          allocateOutboundShipmentInput
        );

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
    }

    // Update to 'shipped'
    // try {
    //   const updateOutboundShipmentInput: BatchOutboundShipmentMutationVariables =
    //     {
    //       storeId: issuingStoreId,
    //       input: {
    //         updateOutboundShipments: [
    //           {
    //             id: shipmentId,
    //             status: UpdateOutboundShipmentStatusInput.Shipped,
    //           },
    //         ],
    //       },
    //     };

    //   const updateShipmentResult = batchOutboundShipmentQuery(
    //     updateOutboundShipmentInput
    //   );

    //   if (
    //     !updateShipmentResult.batchOutboundShipment.updateOutboundShipments ||
    //     updateShipmentResult.batchOutboundShipment.updateOutboundShipments
    //       .length < 1
    //   ) {
    //     errText = 'Failed to update order status. ' + errText;
    //     errText += ' error: no lines returned in response';
    //     throw Error(errText);
    //   }

    //   if (
    //     updateShipmentResult.batchOutboundShipment.updateOutboundShipments[0]
    //       .response.__typename === 'UpdateOutboundShipmentError'
    //   ) {
    //     errText = 'Failed to update order status. ' + errText;
    //     errText += ` error: ${updateShipmentResult.batchOutboundShipment.updateOutboundShipments[0].response.error.description}`;
    //     throw Error(errText);
    //   }

    //   if (
    //     updateShipmentResult.batchOutboundShipment.updateOutboundShipments[0]
    //       .response.__typename === 'NodeError'
    //   ) {
    //     errText = 'Failed to update order status. ' + errText;
    //     errText += ` error: ${updateShipmentResult.batchOutboundShipment.updateOutboundShipments[0].response.error.description}`;
    //     throw Error(errText);
    //   }
    // } catch (error) {
    //   return {
    //     success: false,
    //     message: `${error}`,
    //   };
    // }

    return {
      success: true,
      message: `Issued stock for store: ${customer.name}, item: ${foundItem.msupplyUniversalCode}, quantity: ${inp.quantity}`,
    };
  },
};

export { plugins };

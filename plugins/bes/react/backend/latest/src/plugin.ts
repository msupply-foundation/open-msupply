/* eslint-disable camelcase */
import { BackendPlugins } from '@common/types';
import { Graphql, ItemsEndpointResponse } from './types/index';
import {
  OutboundShipmentLineInput,
  UpdateOutboundShipmentStatusInput,
} from '../codegenTypes';
import { uuidv7 } from 'uuidv7';
import {
  customerQuery,
  itemsQuery,
  checkOutboundShipmentExistsQuery,
  batchDeleteOutboundShipmentQuery,
} from './queries';
import { sortAndClassifyBatches } from './utils';
import {
  insertOutboundShipment,
  saveOutboundShipmentItemLines,
  updateOutboundShipment,
} from './query-operations';

const plugins: BackendPlugins = {
  graphql_query: ({ store_id, input }): Graphql['output'] => {
    const inp = input as Graphql['input'];
    let shipmentId = uuidv7();

    if (!inp.customerCode) {
      return {
        success: false,
        message: "param 'customerCode' is empty or invalid",
        items: [],
      };
    }

    if (!inp.items || inp.items.length < 1) {
      return {
        success: false,
        message: "param 'items' is empty or invalid",
        items: [],
      };
    }

    const { stores: activeStores } = get_active_stores_on_site();
    if (!activeStores || activeStores.length < 1) {
      return { success: false, message: 'No active stores found', items: [] };
    }

    // Take first store
    // const issuingStore = activeStores[0];
    // For testing only, TODO: remove on last commit
    const issuingStore = activeStores.find(s => s.store_row.id === store_id);

    if (!issuingStore) {
      return { success: false, message: 'No store found', items: [] };
    }

    const issuingStoreId = issuingStore.store_row.id;

    if (inp.invoiceId) {
      shipmentId = inp.invoiceId;
      const { invoiceIdError } = checkOutboundShipmentExistsQuery({
        storeId: issuingStoreId,
        id: inp.invoiceId,
      });
      if (invoiceIdError) return invoiceIdError;
    }

    const { result: customerQueryResult, customerError } = customerQuery({
      storeId: issuingStoreId,
      filter: { code: { equalTo: inp.customerCode } },
    });

    if (customerError) return customerError;
    if (!customerQueryResult) {
      return {
        success: false,
        message: `Error getting customer with code: ${inp.customerCode}. (codes are case sensitive)`,
        items: [],
      };
    }

    const customer = customerQueryResult.names.nodes[0];

    // eslint-disable-next-line prefer-const
    let errText = `Failed to create Outbound Shipment.`;

    const { error: insertOBSErr } = insertOutboundShipment(
      shipmentId,
      issuingStoreId,
      customer.id,
      errText
    );

    if (insertOBSErr) return insertOBSErr;

    // ******************************** Iterate over all items *********************

    const itemsResponses: ItemsEndpointResponse[] = [];
    let updateToShipped = true;
    let rollbackOperation = false;

    for (let itemIter = 0; itemIter < inp.items.length; itemIter++) {
      const item = inp.items[itemIter];

      if (item.numberOfUnits === 0) {
        itemsResponses.push({
          universalCode: item.universalCode,
          success: false,
          message: "param 'numberOfUnits' is 0 or invalid",
        });
        updateToShipped = false;
        rollbackOperation = true;
        continue;
      }

      const { result: itemsQueryResult, itemsError } = itemsQuery(
        issuingStoreId,
        item.universalCode
      );

      if (itemsError) {
        itemsResponses.push(itemsError);
        updateToShipped = false;
        rollbackOperation = true;
        continue;
      }

      if (!itemsQueryResult) {
        itemsResponses.push({
          universalCode: item.universalCode,
          success: false,
          message: 'did not receive a response from open-msupply',
        });
        updateToShipped = false;
        rollbackOperation = true;
        continue;
      }

      const foundItem = itemsQueryResult.items.nodes[0];

      const { nullExpiryBatches, unexpiredBatches, expiredBatches } =
        sortAndClassifyBatches(foundItem.availableBatches.nodes);

      // Determine if FEFO unexpired can fullfil entire order
      const insertLines: OutboundShipmentLineInput[] = [];
      let placeHolderQuantity = 0;
      let totalUnitsSupplied = 0;
      const unexpiredAndNullBatches = [
        ...nullExpiryBatches,
        ...unexpiredBatches,
      ];

      for (let i = 0; i < unexpiredAndNullBatches.length; i++) {
        const batch = unexpiredAndNullBatches[i];
        const shipmentLineId = uuidv7();
        const unitsInBatch = batch.availableNumberOfPacks * batch.packSize;
        const unitsStillRequired = item.numberOfUnits - totalUnitsSupplied;

        if (unitsInBatch === 0) continue;

        if (totalUnitsSupplied >= item.numberOfUnits) break;

        if (unitsInBatch > unitsStillRequired) {
          const packsToSupply = Math.ceil(unitsStillRequired / batch.packSize); // have to round down or get ReductionBelowZero error

          totalUnitsSupplied += packsToSupply * batch.packSize;

          insertLines.push({
            id: shipmentLineId,
            stockLineId: batch.id,
            numberOfPacks: packsToSupply,
          });
          break;
        } else {
          totalUnitsSupplied += batch.availableNumberOfPacks * batch.packSize;
          insertLines.push({
            id: shipmentLineId,
            stockLineId: batch.id,
            numberOfPacks: batch.availableNumberOfPacks,
          });
        }
      }

      // Determine if LEFO expired can fullfill rest of order

      for (let j = 0; j < expiredBatches.length; j++) {
        const batch = expiredBatches[j];
        const shipmentLineId = uuidv7();
        const unitsInBatch = batch.availableNumberOfPacks / batch.packSize;
        const unitsStillRequired = item.numberOfUnits - totalUnitsSupplied;

        if (totalUnitsSupplied >= item.numberOfUnits) break;
        if (batch.availableNumberOfPacks === 0) continue;

        if (unitsInBatch > unitsStillRequired) {
          const packsToSupply = Math.ceil(unitsStillRequired / batch.packSize);
          totalUnitsSupplied += packsToSupply * batch.packSize;
          insertLines.push({
            id: shipmentLineId,
            stockLineId: batch.id,
            numberOfPacks: packsToSupply,
          });
          break;
        } else {
          totalUnitsSupplied += batch.availableNumberOfPacks * batch.packSize;

          insertLines.push({
            id: shipmentLineId,
            stockLineId: batch.id,
            numberOfPacks: batch.availableNumberOfPacks,
          });
        }
      }

      // If still unfully allocated, create placeholder for rest of items

      if (totalUnitsSupplied < item.numberOfUnits) {
        placeHolderQuantity = item.numberOfUnits - totalUnitsSupplied;
        updateToShipped = false;
      }

      const { error: saveError } = saveOutboundShipmentItemLines(
        issuingStoreId,
        shipmentId,
        foundItem.id,
        placeHolderQuantity,
        insertLines,
        errText
      );

      if (saveError) {
        itemsResponses.push({
          universalCode: item.universalCode,
          success: false,
          message: saveError.message,
        });
        updateToShipped = false;
        rollbackOperation = true;
      }

      itemsResponses.push({
        universalCode: item.universalCode,
        success: true,
        message: `Inserted universalCode: ${item.universalCode}, Number of units requested: ${item.numberOfUnits}, Allocated Units: ${totalUnitsSupplied}, Placeholder Units: ${placeHolderQuantity}`,
      });
    }

    // Update to shipped if no placeholders
    if (updateToShipped) {
      const { error: updateError } = updateOutboundShipment(
        issuingStoreId,
        shipmentId,
        UpdateOutboundShipmentStatusInput.Shipped,
        errText
      );

      if (updateError) {
        updateError.items = itemsResponses;
        // TODO: maybe rollback entire operation???
        return updateError;
      }
    }

    if (rollbackOperation) {
      batchDeleteOutboundShipmentQuery(issuingStoreId, shipmentId);
      return {
        success: false,
        message: `Failed to issued stock from store code: ${issuingStore.store_row.code}, for customer: ${customer.name}, invoiceId: ${shipmentId}, items count: ${itemsResponses.length}. Operation has been rolled back.`,
        items: itemsResponses,
      };
    }

    return {
      success: true,
      message: `Issued stock from store code: ${issuingStore.store_row.code}, for customer: ${customer.name}, invoiceId: ${shipmentId}, items count: ${itemsResponses.length}`,
      items: itemsResponses,
    };
  },
};

export { plugins };

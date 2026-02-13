/* eslint-disable camelcase */
import { BackendPlugins } from '@common/types';
import { Graphql } from './types/index';
import {
  OutboundShipmentLineInput,
  UpdateOutboundShipmentStatusInput,
} from '../codegenTypes';
import { uuidv7 } from 'uuidv7';
import { customerQuery, itemsQuery } from './queries';
import { sortAndClassifyBatches } from './utils';
import {
  insertOutboundShipment,
  saveOutboundShipmentItemLines,
  updateOutboundShipment,
} from './query-operations';

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
      filter: { code: { equalTo: inp.customerCode } },
    });

    if (customerError) return customerError;
    if (!customerQueryResult) {
      return {
        success: false,
        message: `Error getting customer with code: ${inp.customerCode}. (codes are case sensitive)`,
      };
    }

    const customer = customerQueryResult.names.nodes[0];

    const { result: itemsQueryResult, itemsError } = itemsQuery({
      storeId: issuingStoreId,
      filter: { code: { equalTo: inp.universalCode }, hasStockOnHand: true }, // TODO: change to 'universalCode. Version of OMS doesn't have it
    });

    if (itemsError) return itemsError;
    if (!itemsQueryResult) {
      return {
        success: false,
        message: `Error getting item with universalCode of: ${inp.universalCode}`,
      };
    }

    if (inp.numberOfUnits === 0) {
      return {
        success: false,
        message: '0 numberOfUnits given',
      };
    }

    const foundItem = itemsQueryResult.items.nodes[0];

    const { nullExpiryBatches, unexpiredBatches, expiredBatches } =
      sortAndClassifyBatches(foundItem.availableBatches.nodes);

    // Determine if FEFO unexpired can fullfil entire order
    const insertLines: OutboundShipmentLineInput[] = [];
    let placeHolderQuantity = 0;
    let totalUnitsSupplied = 0;
    const unexpiredAndNullBatches = [...nullExpiryBatches, ...unexpiredBatches];

    for (let i = 0; i < unexpiredAndNullBatches.length; i++) {
      const batch = unexpiredAndNullBatches[i];
      const shipmentLineId = uuidv7();
      const unitsInBatch = batch.availableNumberOfPacks * batch.packSize;
      const unitsStillRequired = inp.numberOfUnits - totalUnitsSupplied;

      if (unitsInBatch === 0) continue;

      if (totalUnitsSupplied >= inp.numberOfUnits) break;

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
      const unitsStillRequired = inp.numberOfUnits - totalUnitsSupplied;

      if (totalUnitsSupplied >= inp.numberOfUnits) break;
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

    if (totalUnitsSupplied < inp.numberOfUnits) {
      placeHolderQuantity = inp.numberOfUnits - totalUnitsSupplied;
    }

    // eslint-disable-next-line prefer-const
    let errText = `Failed to issue the stock for item code: ${foundItem.msupplyUniversalCode}, quantity: ${inp.numberOfUnits}, customer: ${customer.name},`;

    const { error: insertOBSErr } = insertOutboundShipment(
      shipmentId,
      issuingStoreId,
      customer.id,
      errText
    );

    if (insertOBSErr) return insertOBSErr;

    const { error: saveError } = saveOutboundShipmentItemLines(
      issuingStoreId,
      shipmentId,
      foundItem.id,
      placeHolderQuantity,
      insertLines,
      errText
    );

    if (saveError) return saveError;

    // Update to shipped if no placeholders
    if (placeHolderQuantity === 0) {
      const { error: updateError } = updateOutboundShipment(
        issuingStoreId,
        shipmentId,
        UpdateOutboundShipmentStatusInput.Shipped,
        errText
      );

      if (updateError) return updateError;
    }

    return {
      success: true,
      message: `Issued stock for store: ${customer.name}, item: ${foundItem.msupplyUniversalCode}, quantity allocated: ${totalUnitsSupplied}, quantity on placeholder: ${placeHolderQuantity}`,
    };
  },
};

export { plugins };

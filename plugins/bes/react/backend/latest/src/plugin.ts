/* eslint-disable camelcase */
import { BackendPlugins } from '@common/types';
import { Graphql } from './types/index';
import {
  InsertOutboundShipmentUnallocatedLineInput,
  InsertOutboundShipmentLineInput,
  UpdateOutboundShipmentStatusInput,
  // UpdateOutboundShipmentStatusInput,
} from '../codegenTypes';
import { uuidv7 } from 'uuidv7';
import { customerQuery, itemsQuery } from './queries';
import { format } from 'date-fns/format';
import { sortAndClassifyBatches } from './utils';
import {
  insertOutboundShipment,
  insertAllocatedLines,
  insertUnAllocatedLine,
  updateOutboundShipment,
} from './query-operations';

const plugins: BackendPlugins = {
  graphql_query: ({ store_id, input }): Graphql['output'] => {
    const inp = input as Graphql['input'];
    const shipmentId = uuidv7();
    const unallocatedShipmentId = uuidv7();

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
      if (batch.availableNumberOfPacks === 0) continue;

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
      const unallocatedShipmentLineId = uuidv7();
      insertUnallocatedLine = {
        id: unallocatedShipmentLineId,
        invoiceId: unallocatedShipmentId,
        itemId: foundItem.id,
        quantity: inp.quantity - totalUnitsSupplied,
      };
    }

    log({ t: 'insertLines', insertLines });
    log({ t: 'unallocatedLine', insertUnallocatedLine });

    // eslint-disable-next-line prefer-const
    let errText = `Failed to issue the stock for item code: ${foundItem.msupplyUniversalCode}, quantity: ${inp.quantity}, customer: ${customer.name},`;

    // Insert allocated line
    if (insertLines.length > 0) {
      const { error: insertOBSErr } = insertOutboundShipment(
        shipmentId,
        issuingStoreId,
        customer.id,
        errText
      );

      if (insertOBSErr) return insertOBSErr;

      const { error: insertAllocatedLinesErr } = insertAllocatedLines(
        issuingStoreId,
        shipmentId,
        insertLines,
        errText
      );

      if (insertAllocatedLinesErr) return insertAllocatedLinesErr;

      const { error: updateAllocatedErr } = updateOutboundShipment(
        issuingStoreId,
        shipmentId,
        UpdateOutboundShipmentStatusInput.Shipped,
        errText
      );

      if (updateAllocatedErr) return updateAllocatedErr;
    }

    // Insert unallocated line
    if (insertUnallocatedLine) {
      const { error: insertUnallocatedOBSErr } = insertOutboundShipment(
        unallocatedShipmentId,
        issuingStoreId,
        customer.id,
        errText
      );
      if (insertUnallocatedOBSErr) return insertUnallocatedOBSErr;

      const { error: insertUnllocatedLineErr } = insertUnAllocatedLine(
        issuingStoreId,
        unallocatedShipmentId,
        insertUnallocatedLine,
        errText
      );
      if (insertUnllocatedLineErr) return insertUnllocatedLineErr;
    }

    return {
      success: true,
      message: `Issued stock for store: ${customer.name}, item: ${foundItem.msupplyUniversalCode}, quantity: ${totalUnitsSupplied}`,
    };
  },
};

export { plugins };

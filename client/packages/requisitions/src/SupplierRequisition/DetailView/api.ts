import {
  RequisitionLineConnector,
  //   UpdateSupplierRequisitionInput,
} from './../../../../common/src/types/schema';
import {
  ConnectorError,
  NameResponse,
  OmSupplyApi,
  RequisitionQuery,
  //   RequisitionNode,
} from '@openmsupply-client/common';
import { Requisition, SupplierRequisition } from './../../types';

// import {
//   OutboundShipmentRow,
//   Invoice,
//   InvoiceLine,
//   InboundShipment,
// //   InboundShipmentRow,
// } from '../../types';
// import { flattenInboundItems } from '../../utils';

const otherPartyGuard = (otherParty: NameResponse) => {
  if (otherParty.__typename === 'NameNode') {
    return otherParty;
  } else if (otherParty.__typename === 'NodeError') {
    throw new Error(otherParty.error.description);
  }

  throw new Error('Unknown');
};

// const pricingGuard = (pricing: InvoicePriceResponse) => {
//   if (pricing.__typename === 'InvoicePricingNode') {
//     return pricing;
//   } else if (pricing.__typename === 'NodeError') {
//     throw new Error(pricing.error.description);
//   } else {
//     throw new Error('Unknown');
//   }
// };

const requisitionGuard = (requisitionQuery: RequisitionQuery) => {
  if (requisitionQuery.requisition.__typename === 'RequisitionNode') {
    return requisitionQuery.requisition;
  }

  throw new Error('Could not find the requisition');
};

const linesGuard = (
  requisitionLines: RequisitionLineConnector | ConnectorError
) => {
  if (requisitionLines.__typename === 'RequisitionLineConnector') {
    return requisitionLines.nodes;
  }

  if (requisitionLines.__typename === 'ConnectorError') {
    throw new Error('Error fetching lines for requisition');
  }

  throw new Error('Unknown');
};

// const stockLineGuard = (stockLine: StockLineResponse): StockLineNode => {
//   if (stockLine.__typename === 'StockLineNode') {
//     return stockLine;
//   }

//   throw new Error('Unknown');
// };

// const requisitionToInput = (
//   patch: Partial<SupplierRequisition> & { id: string }
// ): UpdateSupplierRequisitionInput => {
//   return {
//     id: patch.id,
//     // color: patch.color,
//     comment: patch.comment,

//     // TODO: Don't cast status
//     status: patch.status as InvoiceNodeStatus,
//     onHold: patch.onHold,
//     otherPartyId: patch.otherParty?.id,
//     theirReference: patch.theirReference,
//   };
// };

// const createInsertInboundLineInput =
//   (invoiceId: string) =>
//   (line: OutboundShipmentRow): InsertInboundShipmentLineInput => {
//     return {
//       id: line.id,
//       itemId: line.itemId,
//       batch: line.batch,
//       costPricePerPack: line.costPricePerPack,
//       expiryDate: line.expiryDate
//         ? formatNaiveDate(new Date(line.expiryDate))
//         : null,

//       sellPricePerPack: line.sellPricePerPack,
//       packSize: line.packSize,
//       numberOfPacks: line.numberOfPacks,
//       invoiceId,
//     };
//   };

// const createDeleteInboundLineInput = (
//   line: InboundShipmentRow
// ): DeleteInboundShipmentLineInput => {
//   return {
//     id: line.id,
//     invoiceId: line.invoiceId,
//   };
// };

// const createUpdateInboundLineInput = (
//   line: InboundShipmentRow
// ): UpdateInboundShipmentLineInput => {
//   return {
//     id: line.id,
//     itemId: line.itemId,
//     batch: line.batch,
//     costPricePerPack: line.costPricePerPack,
//     expiryDate: line.expiryDate
//       ? formatNaiveDate(new Date(line.expiryDate))
//       : null,
//     sellPricePerPack: line.sellPricePerPack,
//     packSize: line.packSize,
//     numberOfPacks: line.numberOfPacks,
//     invoiceId: line.invoiceId,
//   };
// };

interface Api<ReadType, UpdateType> {
  onRead: (id: string) => Promise<ReadType>;
  onUpdate: (val: UpdateType) => Promise<UpdateType>;
}

export const getSupplierRequisitionDetailViewApi = (
  api: OmSupplyApi
): Api<Requisition, SupplierRequisition> => ({
  onRead: async (id: string): Promise<Requisition> => {
    console.log('-------------------------------------------');
    console.log('reading?', id);
    console.log('-------------------------------------------');
    const result = await api.requisition({ id });
    console.log('-------------------------------------------');
    console.log('result', result);
    console.log('-------------------------------------------');
    const requisition = requisitionGuard(result);
    const lineNodes = linesGuard(requisition.lines);

    console.log('-------------------------------------------');
    console.log('requisition', result, requisition);
    console.log('-------------------------------------------');

    return {
      ...requisition,
      lines: lineNodes,
      otherParty: otherPartyGuard(requisition.otherParty),
    };
  },
  onUpdate: async () => {},
  //   onUpdate: async (patch: InboundShipment): Promise<InboundShipment> => {
  //     const rows = flattenInboundItems(patch.items);
  //     const deleteLines = rows.filter(({ isDeleted }) => isDeleted);
  //     const insertLines = rows.filter(
  //       ({ isCreated, isDeleted }) => !isDeleted && isCreated
  //     );
  //     const updateLines = rows.filter(
  //       ({ isUpdated, isCreated, isDeleted }) =>
  //         isUpdated && !isCreated && !isDeleted
  //     );

  //     const result = await api.upsertInboundShipment({
  //       updateInboundShipments: [invoiceToInput(patch)],
  //       insertInboundShipmentLines: insertLines.map(
  //         createInsertInboundLineInput(patch.id)
  //       ),
  //       deleteInboundShipmentLines: deleteLines.map(createDeleteInboundLineInput),
  //       updateInboundShipmentLines: updateLines.map(createUpdateInboundLineInput),
  //     });

  //     const { batchInboundShipment } = result;

  //     if (batchInboundShipment.__typename === 'BatchInboundShipmentResponse') {
  //       const { updateInboundShipments } = batchInboundShipment;
  //       if (
  //         updateInboundShipments?.[0]?.__typename ===
  //         'UpdateInboundShipmentResponseWithId'
  //       ) {
  //         return patch;
  //       }
  //     }

  //     throw new Error(':shrug');
  //   },
});

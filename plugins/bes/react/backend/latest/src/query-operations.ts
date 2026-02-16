import { BatchOutboundShipmentMutationVariables } from './generated-types/graphql';
import {
  UpdateOutboundShipmentStatusInput,
  OutboundShipmentLineInput,
  MutationsSaveOutboundShipmentItemLinesArgs,
} from '../codegenTypes';
import {
  batchOutboundShipmentQuery,
  batchDeleteOutboundShipmentQuery,
  saveOutboundShipmentLineItemsMutation,
} from './queries';
import { Graphql } from './types/index';

type OperationsResponse = { error?: Graphql['output'] };

export const insertOutboundShipment = (
  shipmentId: string,
  issuingStoreId: string,
  customerId: string,
  errText: string
): OperationsResponse => {
  const insertInput: BatchOutboundShipmentMutationVariables = {
    storeId: issuingStoreId,
    input: {
      insertOutboundShipments: [
        {
          id: shipmentId,
          otherPartyId: customerId,
        },
      ],
    },
  };

  try {
    const insertShipmentResult = batchOutboundShipmentQuery(insertInput);

    if (
      !insertShipmentResult.batchOutboundShipment.insertOutboundShipments ||
      insertShipmentResult.batchOutboundShipment.insertOutboundShipments
        .length < 1
    ) {
      errText +=
        'Insert order failed. ' + errText + ' error: no insert lines returned';
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

    return { error: undefined };
  } catch (error) {
    batchDeleteOutboundShipmentQuery(issuingStoreId, shipmentId);
    return {
      error: {
        success: false,
        message: `${error}`,
        items: [],
      },
    };
  }
};

export const updateOutboundShipment = (
  issuingStoreId: string,
  shipmentId: string,
  status: UpdateOutboundShipmentStatusInput,
  errText: string
): OperationsResponse => {
  try {
    const updateOutboundShipmentInput: BatchOutboundShipmentMutationVariables =
      {
        storeId: issuingStoreId,
        input: {
          updateOutboundShipments: [
            {
              id: shipmentId,
              status: status,
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
    return { error: undefined };
  } catch (error) {
    return {
      error: {
        success: false,
        message: `${error}`,
        items: [],
      },
    };
  }
};

export const saveOutboundShipmentItemLines = (
  issuingStoreId: string,
  shipmentId: string,
  itemId: string,
  placeholderQuantity: number,
  lines: OutboundShipmentLineInput[],
  errText: string
): OperationsResponse => {
  const insertLineInput: MutationsSaveOutboundShipmentItemLinesArgs = {
    storeId: issuingStoreId,
    input: {
      invoiceId: shipmentId,
      itemId,
      lines,
      placeholderQuantity,
    },
  };

  try {
    const result = saveOutboundShipmentLineItemsMutation(insertLineInput);

    if (!result.saveOutboundShipmentItemLines) {
      errText += ` error: no lines returned in response`;
      throw Error(errText);
    }

    if (!result.saveOutboundShipmentItemLines.id) {
      errText += ` error: operation failed, no id returned :(`;
      throw Error(errText);
    }
    return { error: undefined };
  } catch (error) {
    return {
      error: {
        success: false,
        message: `Save outbound lines failed. ${error}`,
        items: [],
      },
    };
  }
};

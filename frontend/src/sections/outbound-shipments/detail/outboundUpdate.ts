import { graphqlFetch } from '../../../api/graphql';
import { t } from '../../../intl';
import {
  UpdateOutboundShipment,
  type OutboundDetailResult,
  type UpdateOutboundShipmentVariables,
  type UpdateOutboundShipmentResult,
} from './outboundDetail.generated';

// Shipment-LEVEL edits via updateOutboundShipment, split by error handling
// (mirroring stocktakeUpdate):
//
// - saveShipmentFields — field saves (reference / comment / colour / transport
//   / hold / tax / expected delivery / shipping method). The UI disables these
//   once the shipment is read-only, so a rejection is an unexpected race →
//   routed to the global unexpected-error modal. Returns the fresh node
//   (header AND lines — leaving NEW trims zero rows server-side).
//
// - changeShipmentStatus — the ACTION with user-facing rejections (rules.md §
//   status lifecycle): on-hold, unallocated placeholders, reverse. Keeps the
//   discriminated result so the footer's dialog can surface each inline.

export type OutboundNode = Extract<
  OutboundDetailResult['invoice'],
  { __typename: 'InvoiceNode' }
>;

type UpdateInput = UpdateOutboundShipmentVariables['input'];
type UpdateResponse = UpdateOutboundShipmentResult['updateOutboundShipment'];

const nodeOf = (response: UpdateResponse): OutboundNode | undefined =>
  response.__typename === 'InvoiceNode' ? response : undefined;

export const saveShipmentFields = async (
  storeId: string,
  input: UpdateInput
): Promise<OutboundNode | undefined> => {
  const result = await graphqlFetch(
    UpdateOutboundShipment,
    { storeId, input },
    {
      mapSuccessToError: data =>
        data.updateOutboundShipment.__typename === 'InvoiceNode'
          ? undefined
          : data.updateOutboundShipment.error.description,
    }
  );
  if (result.kind !== 'success') return undefined;
  return nodeOf(result.data.updateOutboundShipment);
};

export type StatusChangeResult =
  | { kind: 'saved'; node: OutboundNode }
  // A structured rejection with a translated message; `unallocatedItems`
  // carries the offending placeholder items when the rejection is the
  // unallocated-lines guard (AC-P3).
  | { kind: 'error'; message: string; unallocatedItems: string[] }
  | { kind: 'failed' };

export const changeShipmentStatus = async (
  storeId: string,
  id: string,
  status: NonNullable<UpdateInput['status']>
): Promise<StatusChangeResult> => {
  const result = await graphqlFetch(UpdateOutboundShipment, {
    storeId,
    input: { id, status },
  });
  if (result.kind !== 'success') return { kind: 'failed' };
  const response = result.data.updateOutboundShipment;
  if (response.__typename === 'InvoiceNode')
    return { kind: 'saved', node: response };
  if (response.__typename === 'NodeError') return { kind: 'failed' };

  const error = response.error;
  switch (error.__typename) {
    case 'CannotChangeStatusOfInvoiceOnHold':
      return {
        kind: 'error',
        message: t('messages.on-hold-outbound'),
        unallocatedItems: [],
      };
    case 'CanOnlyChangeToAllocatedWhenNoUnallocatedLines': {
      const items = error.invoiceLines.nodes.map(line => line.itemName);
      return {
        kind: 'error',
        message: t('messages.must-allocate-all-lines', {
          items: items.join(', '),
        }),
        unallocatedItems: items,
      };
    }
    default:
      // Reverse / not-editable / anything else typed: the description is the
      // most faithful message (the UI guards these paths).
      return {
        kind: 'error',
        message: error.description,
        unallocatedItems: [],
      };
  }
};

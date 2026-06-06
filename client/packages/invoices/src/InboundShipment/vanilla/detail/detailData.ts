import { InvoiceTypeInput, RecordPatch } from '@openmsupply-client/common';
import { IslandCtx, createSdk } from '../context';
import { InboundFragment } from '../../api/operations.generated';
import { inboundParsers } from '../../api/api';

export const fetchInvoice = async (
  ctx: IslandCtx,
  invoiceId: string
): Promise<InboundFragment> => {
  const sdk = createSdk(ctx);
  const type = ctx.isExternal
    ? InvoiceTypeInput.InboundShipmentExternal
    : InvoiceTypeInput.InboundShipment;

  const result = await sdk.invoice({ id: invoiceId, storeId: ctx.storeId, type });
  const invoice = result?.invoice;
  if (invoice?.__typename === 'InvoiceNode') return invoice;
  throw new Error(`Could not find invoice ${invoiceId}`);
};

/** Patch the shipment header (comment, colour, etc.). */
export const updateInvoice = async (
  ctx: IslandCtx,
  patch: RecordPatch<InboundFragment>
): Promise<void> => {
  const sdk = createSdk(ctx);
  const input = inboundParsers.toUpdate(patch);
  const variables = { input, storeId: ctx.storeId };
  if (ctx.isExternal) await sdk.updateInboundShipmentExternal(variables);
  else await sdk.updateInboundShipment(variables);
};

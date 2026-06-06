import { NameSortFieldInput } from '@openmsupply-client/common';
import { FnUtils } from '@common/utils';
import { getSdk as getNameSdk } from '@openmsupply-client/system/src/Name/api/operations.generated';
import { IslandCtx, createSdk } from '../context';

export interface SupplierOption {
  id: string;
  name: string;
  code: string;
}

/** Fetch suppliers (name search) for the create-shipment picker. */
export const fetchSuppliers = async (
  ctx: IslandCtx,
  search: string
): Promise<SupplierOption[]> => {
  const sdk = getNameSdk(ctx.client);
  const result = await sdk.names({
    storeId: ctx.storeId,
    key: NameSortFieldInput.Name,
    first: 50,
    filter: {
      isSupplier: true,
      isVisible: true,
      ...(search.trim() ? { name: { like: search.trim() } } : {}),
    },
  });
  return (result?.names?.nodes ?? []).map(n => ({
    id: n.id,
    name: n.name,
    code: n.code,
  }));
};

/** Create an internal inbound shipment for the given supplier; returns its id. */
export const createInbound = async (
  ctx: IslandCtx,
  otherPartyId: string
): Promise<string> => {
  const sdk = createSdk(ctx);
  const id = FnUtils.generateUUID();
  const result = (
    await sdk.insertInboundShipment({
      id,
      otherPartyId,
      storeId: ctx.storeId,
    })
  )?.insertInboundShipment;

  if (result?.__typename === 'InvoiceNode') return result.id;
  throw new Error(
    (result as { error?: { description?: string } })?.error?.description ??
      'Could not create shipment'
  );
};

import {
  FilterBy,
  InvoiceSortFieldInput,
  InvoiceTypeInput,
  UserPermission,
} from '@openmsupply-client/common';
import { IslandCtx, createSdk } from '../context';
import { InboundRowFragment } from '../../api/operations.generated';

/** Column key -> GraphQL sort field (ported from useInboundList). */
export const sortFieldMap: Record<string, InvoiceSortFieldInput> = {
  createdDatetime: InvoiceSortFieldInput.CreatedDatetime,
  otherPartyName: InvoiceSortFieldInput.OtherPartyName,
  comment: InvoiceSortFieldInput.Comment,
  invoiceNumber: InvoiceSortFieldInput.InvoiceNumber,
  theirReference: InvoiceSortFieldInput.TheirReference,
  status: InvoiceSortFieldInput.Status,
  deliveredDatetime: InvoiceSortFieldInput.DeliveredDatetime,
};

export interface ListParams {
  first: number;
  offset: number;
  sortKey: string;
  sortDesc: boolean;
  filterBy: FilterBy | null;
}

export interface ListResult {
  nodes: InboundRowFragment[];
  totalCount: number;
}

/**
 * Which invoice types to request, based on the user's permissions and any
 * `type` filter. Ported from ListView's invoiceTypes logic.
 */
export const resolveInvoiceTypes = (
  ctx: IslandCtx,
  requestedTypes?: InvoiceTypeInput[]
): InvoiceTypeInput[] => {
  const types: InvoiceTypeInput[] = [];
  if (
    (!requestedTypes ||
      requestedTypes.includes(InvoiceTypeInput.InboundShipment)) &&
    ctx.userHasPermission(UserPermission.InboundShipmentQuery)
  )
    types.push(InvoiceTypeInput.InboundShipment);
  if (
    (!requestedTypes ||
      requestedTypes.includes(InvoiceTypeInput.InboundShipmentExternal)) &&
    ctx.userHasPermission(UserPermission.InboundShipmentExternalQuery)
  )
    types.push(InvoiceTypeInput.InboundShipmentExternal);
  return types;
};

export const fetchList = async (
  ctx: IslandCtx,
  params: ListParams,
  requestedTypes?: InvoiceTypeInput[]
): Promise<ListResult> => {
  const sdk = createSdk(ctx);
  const key =
    sortFieldMap[params.sortKey] ?? InvoiceSortFieldInput.InvoiceNumber;

  const result = await sdk.invoices({
    storeId: ctx.storeId,
    first: params.first,
    offset: params.offset,
    key,
    desc: params.sortDesc,
    filter: { ...params.filterBy },
    type: resolveInvoiceTypes(ctx, requestedTypes),
  });

  if (!result?.invoices) throw new Error('No data returned from query');
  return result.invoices;
};

/** Delete shipments, splitting internal vs external (ported from useDelete). */
export const deleteInbounds = async (
  ctx: IslandCtx,
  invoices: InboundRowFragment[]
): Promise<string[]> => {
  const sdk = createSdk(ctx);
  const internal = invoices.filter(inv => !inv.purchaseOrder);
  const external = invoices.filter(inv => !!inv.purchaseOrder);
  const deletedIds: string[] = [];

  const extractIds = (
    result: { deleteInboundShipments?: { id: string }[] | null } | undefined
  ) => result?.deleteInboundShipments?.map(({ id }) => id) ?? [];

  if (internal.length > 0) {
    const result = (
      await sdk.deleteInboundShipments({
        storeId: ctx.storeId,
        deleteInboundShipments: internal.map(inv => ({ id: inv.id })),
      })
    )?.batchInboundShipment;
    deletedIds.push(...extractIds(result));
  }

  if (external.length > 0) {
    const result = (
      await sdk.deleteInboundShipmentsExternal({
        storeId: ctx.storeId,
        deleteInboundShipments: external.map(inv => ({ id: inv.id })),
      })
    )?.batchInboundShipmentExternal;
    deletedIds.push(...extractIds(result));
  }

  if (deletedIds.length === 0) throw new Error('Could not delete invoices');
  return deletedIds;
};

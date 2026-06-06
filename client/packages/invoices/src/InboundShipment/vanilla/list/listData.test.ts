import { InvoiceSortFieldInput, InvoiceTypeInput, UserPermission } from '@openmsupply-client/common';
import { sortFieldMap, resolveInvoiceTypes } from './listData';
import { IslandCtx } from '../context';

const makeCtx = (perms: UserPermission[]): IslandCtx =>
  ({
    userHasPermission: (p: UserPermission) => perms.includes(p),
  }) as unknown as IslandCtx;

describe('listData', () => {
  it('maps known sort keys to GraphQL sort fields', () => {
    expect(sortFieldMap['otherPartyName']).toBe(
      InvoiceSortFieldInput.OtherPartyName
    );
    expect(sortFieldMap['invoiceNumber']).toBe(
      InvoiceSortFieldInput.InvoiceNumber
    );
    expect(sortFieldMap['createdDatetime']).toBe(
      InvoiceSortFieldInput.CreatedDatetime
    );
  });

  it('includes both invoice types when fully permissioned', () => {
    const ctx = makeCtx([
      UserPermission.InboundShipmentQuery,
      UserPermission.InboundShipmentExternalQuery,
    ]);
    expect(resolveInvoiceTypes(ctx)).toEqual([
      InvoiceTypeInput.InboundShipment,
      InvoiceTypeInput.InboundShipmentExternal,
    ]);
  });

  it('omits a type the user cannot query', () => {
    const ctx = makeCtx([UserPermission.InboundShipmentQuery]);
    expect(resolveInvoiceTypes(ctx)).toEqual([
      InvoiceTypeInput.InboundShipment,
    ]);
  });

  it('honours an explicit requested-types filter', () => {
    const ctx = makeCtx([
      UserPermission.InboundShipmentQuery,
      UserPermission.InboundShipmentExternalQuery,
    ]);
    expect(
      resolveInvoiceTypes(ctx, [InvoiceTypeInput.InboundShipmentExternal])
    ).toEqual([InvoiceTypeInput.InboundShipmentExternal]);
  });
});

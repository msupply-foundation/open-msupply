import { InvoiceLineNodeType } from '@common/types';
import { getInboundQueries } from './api';
import { Sdk } from './operations.generated';
import { DraftInboundLine } from '../../types';

describe('getInboundQueries', () => {
  it('should map service charges to the correct fields', () => {
    const upsertInboundShipment = jest.fn();
    const mockSdk = {
      upsertInboundShipment,
    } as unknown as Sdk;

    const api = getInboundQueries(mockSdk, 'testStoreId');

    const draftLines = [
      {
        isCreated: true,
        type: InvoiceLineNodeType.Service,
        item: { id: 'service-item' },
      },
    ] as DraftInboundLine[];

    api.updateLines(draftLines);

    expect(upsertInboundShipment).toHaveBeenCalledWith({
      input: {
        insertInboundShipmentLines: [],
        updateInboundShipmentLines: [],
        insertInboundShipmentServiceLines: [
          expect.objectContaining({
            itemId: 'service-item',
          }),
        ],
        updateInboundShipmentServiceLines: [],
        deleteInboundShipmentServiceLines: [],
      },
      storeId: 'testStoreId',
    });
  });
});

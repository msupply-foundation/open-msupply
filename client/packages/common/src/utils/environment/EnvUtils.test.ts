import { EnvUtils } from './EnvUtils';

describe('EnvUtils - route matching', () => {
  it('matches end route', () => {
    expect(EnvUtils.mapRoute('/distribution/outbound-shipment').title).toEqual(
      'outbound-shipments'
    );
  });

  it('matches within the route', () => {
    expect(
      EnvUtils.mapRoute('/distribution/outbound-shipment/3').title
    ).toEqual('outbound-shipments');
  });

  it('distinguishes between containing words', () => {
    expect(EnvUtils.mapRoute('/inventory/stocktakes').title).toEqual(
      'stocktakes'
    );
    expect(EnvUtils.mapRoute('/inventory/stocktakes/1').title).toEqual(
      'stocktakes'
    );
    expect(EnvUtils.mapRoute('/inventory/stock').title).toEqual('stock');
  });
});

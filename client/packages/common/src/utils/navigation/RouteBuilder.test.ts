import { AppRoute } from '@openmsupply-client/config';
import { RouteBuilder } from './RouteBuilder';

describe('Formatters', () => {
  it('builds a route with an appended wildcard', () => {
    expect(
      RouteBuilder.create(AppRoute.Distribution)
        .addPart(AppRoute.OutboundShipment)
        .addWildCard()
        .build()
    ).toBe('/distribution/outbound-shipment/*');
  });

  it('builds a route', () => {
    expect(
      RouteBuilder.create(AppRoute.Distribution)
        .addPart(AppRoute.OutboundShipment)
        .build()
    ).toBe('/distribution/outbound-shipment');
  });

  it('can be used to create multiple routes from the same builder', () => {
    expect(RouteBuilder.create(AppRoute.Distribution).build()).toBe(
      '/distribution'
    );
    expect(RouteBuilder.create(AppRoute.Suppliers).build()).toBe('/suppliers');
  });
});

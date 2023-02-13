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

  it('adds a single query to url', () => {
    expect(
      RouteBuilder.create(AppRoute.Distribution)
        .addPart(AppRoute.OutboundShipment)
        .addQuery({ param: 'test' })
        .build()
    ).toBe('/distribution/outbound-shipment?param=test');
  });

  it('adds multiple queries to url', () => {
    expect(
      RouteBuilder.create(AppRoute.Distribution)
        .addPart(AppRoute.OutboundShipment)
        .addQuery({ param: 'test', more: 3, third: true })
        .build()
    ).toBe('/distribution/outbound-shipment?param=test&more=3&third=true');
  });
});

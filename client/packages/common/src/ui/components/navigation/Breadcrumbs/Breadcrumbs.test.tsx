import React from 'react';
import { AppRoute } from '@openmsupply-client/config';
import { render } from '@testing-library/react';
import {
  RouteBuilder,
  TestingProvider,
  TestingRouter,
} from '../../../../utils';
import { Route } from 'react-router';
import { Breadcrumbs } from './Breadcrumbs';

describe('Breadcrumbs', () => {
  it('Renders the name of the current route from the URL', () => {
    const { getByText } = render(
      <TestingProvider>
        <TestingRouter
          initialEntries={[RouteBuilder.create(AppRoute.Distribution).build()]}
        >
          <Route path="*" element={<Breadcrumbs />}></Route>
        </TestingRouter>
      </TestingProvider>
    );

    expect(getByText(/distribution/i));
  });
  it('Renders the names of the current routes from the URL', () => {
    const { getByText } = render(
      <TestingProvider>
        <TestingRouter
          initialEntries={[
            RouteBuilder.create(AppRoute.Distribution)
              .addPart(AppRoute.OutboundShipment)
              .build(),
          ]}
        >
          <Route path="*" element={<Breadcrumbs />}></Route>
        </TestingRouter>
      </TestingProvider>
    );

    expect(getByText(/distribution/i));
  });

  it('Renders the non-last elements as links to the prior pages', () => {
    const { getByRole } = render(
      <TestingProvider>
        <TestingRouter
          initialEntries={[
            RouteBuilder.create(AppRoute.Distribution)
              .addPart(AppRoute.CustomerRequisition)
              .addPart(AppRoute.OutboundShipment)
              .build(),
          ]}
        >
          <Route path="*" element={<Breadcrumbs />}></Route>
        </TestingRouter>
      </TestingProvider>
    );

    expect(getByRole('link', { name: /distribution/i })).toBeInTheDocument();
    expect(getByRole('link', { name: /requisition/i })).toBeInTheDocument();
  });

  it('The last breadcrumb is not a link', () => {
    const { getByText } = render(
      <TestingProvider>
        <TestingRouter
          initialEntries={[
            RouteBuilder.create(AppRoute.Distribution)
              .addPart(AppRoute.OutboundShipment)
              .build(),
          ]}
        >
          <Route path="*" element={<Breadcrumbs />}></Route>
        </TestingRouter>
      </TestingProvider>
    );

    const node = getByText(/outbound-shipment/i);
    const closestAnchor = node.closest('a');

    expect(closestAnchor).toEqual(null);
  });

  it('has the correct href tags for anchor elements', () => {
    const { getByRole } = render(
      <TestingProvider>
        <TestingRouter
          initialEntries={[
            RouteBuilder.create(AppRoute.Distribution)
              .addPart(AppRoute.CustomerRequisition)
              .addPart(AppRoute.OutboundShipment)
              .build(),
          ]}
        >
          <Route path="*" element={<Breadcrumbs />}></Route>
        </TestingRouter>
      </TestingProvider>
    );

    expect(getByRole('link', { name: /distribution/i })).toHaveAttribute(
      'href',
      '/distribution'
    );
    expect(getByRole('link', { name: /requisition/i })).toHaveAttribute(
      'href',
      '/distribution/customer-requisition'
    );
  });
});

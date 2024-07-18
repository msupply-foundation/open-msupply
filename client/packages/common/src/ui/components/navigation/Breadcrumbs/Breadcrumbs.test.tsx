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
import '@testing-library/jest-dom';

describe('Breadcrumbs', () => {
  it('does not render the top level part of the current URL', () => {
    const { queryByText } = render(
      <TestingProvider>
        <TestingRouter
          initialEntries={[RouteBuilder.create(AppRoute.Distribution).build()]}
        >
          <Route path="*" element={<Breadcrumbs />}></Route>
        </TestingRouter>
      </TestingProvider>
    );

    expect(queryByText(/distribution/i)).not.toBeInTheDocument();
  });
  it('Renders the names of all the routes from the URL, excluding the first', () => {
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

    expect(getByText(/outbound/i));
  });

  it('Renders the non-last elements as links to the prior pages, excluding the first', () => {
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

    const node = getByText(/outbound shipment/i);
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

    expect(getByRole('link', { name: /requisition/i })).toHaveAttribute(
      'href',
      '/distribution/customer-requisition'
    );
  });
});

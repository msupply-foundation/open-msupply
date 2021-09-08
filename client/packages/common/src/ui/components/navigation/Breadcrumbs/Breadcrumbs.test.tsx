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
          initialEntries={[RouteBuilder.create(AppRoute.Customers).build()]}
        >
          <Route path="*" element={<Breadcrumbs />}></Route>
        </TestingRouter>
      </TestingProvider>
    );

    expect(getByText(/customers/i));
  });
  it('Renders the names of the current routes from the URL', () => {
    const { getByText } = render(
      <TestingProvider>
        <TestingRouter
          initialEntries={[
            RouteBuilder.create(AppRoute.Customers)
              .addPart(AppRoute.CustomerInvoice)
              .build(),
          ]}
        >
          <Route path="*" element={<Breadcrumbs />}></Route>
        </TestingRouter>
      </TestingProvider>
    );

    expect(getByText(/customers/i));
  });

  it('Renders the non-last elements as links to the prior pages', () => {
    const { getByRole } = render(
      <TestingProvider>
        <TestingRouter
          initialEntries={[
            RouteBuilder.create(AppRoute.Customers)
              .addPart(AppRoute.CustomerRequisition)
              .addPart(AppRoute.CustomerInvoice)
              .build(),
          ]}
        >
          <Route path="*" element={<Breadcrumbs />}></Route>
        </TestingRouter>
      </TestingProvider>
    );

    expect(getByRole('link', { name: /customers/i })).toBeInTheDocument();
    expect(getByRole('link', { name: /requisition/i })).toBeInTheDocument();
  });

  it('The last breadcrumb is not a link', () => {
    const { getByText } = render(
      <TestingProvider>
        <TestingRouter
          initialEntries={[
            RouteBuilder.create(AppRoute.Customers)
              .addPart(AppRoute.CustomerInvoice)
              .build(),
          ]}
        >
          <Route path="*" element={<Breadcrumbs />}></Route>
        </TestingRouter>
      </TestingProvider>
    );

    const node = getByText(/invoice/i);
    const closestAnchor = node.closest('a');

    expect(closestAnchor).toEqual(null);
  });
});

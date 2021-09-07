import React from 'react';
import { Route } from 'react-router';
import { render, waitFor } from '@testing-library/react';

import { TestingProvider, TestingRouter } from '@openmsupply-client/common';

import { OutboundShipmentDetailView } from './DetailView';

describe('OutboundShipmentDetailView', () => {
  it('Renders the correct outbound shipment for the provided url ', async () => {
    const { getByText } = render(
      <TestingProvider>
        <TestingRouter initialEntries={['/customers/customer-invoice/3']}>
          <Route path="customers/customer-invoice">
            <Route path={':id'} element={<OutboundShipmentDetailView />} />
          </Route>
        </TestingRouter>
      </TestingProvider>
    );

    await waitFor(() => expect(getByText(/"id": "3"/i)).toBeInTheDocument());
  });
});

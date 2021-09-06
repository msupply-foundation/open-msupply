import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { OutboundShipmentDetailView } from './OutboundShipment';
import { TestingProvider, TestingRouter } from '@openmsupply-client/common';
import { Route } from 'react-router';

describe('useDraftDocument', () => {
  it('', async () => {
    const { getByText, debug } = render(
      <TestingProvider>
        <TestingRouter initialEntries={['/customers/customer-invoice/3']}>
          <Route path="customers/customer-invoice">
            <Route path={':id'} element={<OutboundShipmentDetailView />} />
          </Route>
        </TestingRouter>
      </TestingProvider>
    );

    await waitFor(() => expect(getByText(/"id": "3"/i)).toBeInTheDocument());

    debug();
  });
});

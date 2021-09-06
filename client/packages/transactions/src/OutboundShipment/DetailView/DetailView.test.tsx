import React from 'react';
import { Route } from 'react-router';
import { render, waitFor } from '@testing-library/react';

import { TestingProvider, TestingRouter } from '@openmsupply-client/common';

import { OutboundShipmentDetailView } from './DetailView';

describe('useDraftDocument', () => {
  it('', async () => {
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

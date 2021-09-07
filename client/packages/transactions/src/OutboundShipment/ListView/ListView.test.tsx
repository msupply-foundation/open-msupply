import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { Route } from 'react-router';

import { TestingProvider, TestingRouter } from '@openmsupply-client/common';

import { OutboundShipmentListView } from './ListView';

describe('OutboundShipmentListView', () => {
  it('Renders all the headers for the list', async () => {
    const { getByText } = render(
      <TestingProvider>
        <TestingRouter initialEntries={['/customers/customer-invoice']}>
          <Route path="*" element={<OutboundShipmentListView />} />
        </TestingRouter>
      </TestingProvider>
    );

    await waitFor(() => {
      expect(getByText(/ID/)).toBeInTheDocument();
      expect(getByText(/date/i)).toBeInTheDocument();
      expect(getByText(/customer/i)).toBeInTheDocument();
      expect(getByText(/supplier/i)).toBeInTheDocument();
      expect(getByText(/total/i)).toBeInTheDocument();
    });
  });
});

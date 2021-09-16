import React from 'react';
import { Route } from 'react-router';
import { render, waitFor } from '@testing-library/react';
import AppBar from '../../../../host/src/AppBar';
import { TestingProvider, TestingRouter } from '@openmsupply-client/common';

import { OutboundShipmentDetailView } from './DetailView';
import { act } from 'react-dom/test-utils';

describe('OutboundShipmentDetailView', () => {
  const ExampleDetailView = () => (
    <TestingProvider>
      <TestingRouter initialEntries={['/customers/customer-invoice/3']}>
        <Route path="customers/customer-invoice">
          <Route
            path={':id'}
            element={
              <>
                <AppBar />
                <OutboundShipmentDetailView />
              </>
            }
          />
        </Route>
      </TestingRouter>
    </TestingProvider>
  );

  it('Renders the correct outbound shipment for the provided url ', async () => {
    const { getByText } = render(<ExampleDetailView />);
    await waitFor(() => expect(getByText(/"id": "3"/i)).toBeInTheDocument());
  });

  it('Renders the item summary content once the item summary tab has been pressed', async () => {
    const { getByRole, getByText } = render(<ExampleDetailView />);

    const itemTabButton = getByRole('tab', { name: /item/i });

    act(() => {
      itemTabButton.click();
    });

    const itemPanel = getByText(/item summary coming soon/i);
    expect(itemPanel).toBeInTheDocument();
  });

  it('Renders the batch summary content once the batch summary tab has been pressed', async () => {
    const { getByRole, getByText } = render(<ExampleDetailView />);

    const itemTabButton = getByRole('tab', { name: /batch/i });

    act(() => {
      itemTabButton.click();
    });

    const itemPanel = getByText(/batch summary coming soon/i);
    expect(itemPanel).toBeInTheDocument();
  });

  it('Renders the price details content once the price tab has been pressed', async () => {
    const { getByRole, getByText } = render(<ExampleDetailView />);

    const itemTabButton = getByRole('tab', { name: /price/i });

    act(() => {
      itemTabButton.click();
    });

    const itemPanel = getByText(/price details coming soon/i);
    expect(itemPanel).toBeInTheDocument();
  });

  it('Renders the item summary content once the item summary tab has been pressed', async () => {
    const { getByRole, getByText } = render(<ExampleDetailView />);

    const itemTabButton = getByRole('tab', { name: /log/i });

    act(() => {
      itemTabButton.click();
    });

    const itemPanel = getByText(/log of actions coming soon/i);
    expect(itemPanel).toBeInTheDocument();
  });
});

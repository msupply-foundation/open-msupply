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

  // it('Renders the correct outbound shipment for the provided url ', async () => {
  //   const { getByText } = render(<ExampleDetailView />);
  //   await waitFor(() => expect(getByText(/"id": "3"/i)).toBeInTheDocument());
  // });

  it('initially renders the general tab panel', () => {
    const { getByRole } = render(<ExampleDetailView />);

    waitFor(() => {
      const generalPanel = getByRole('tabpanel', { name: /general/i });

      expect(generalPanel).toBeInTheDocument();
    });
  });

  it('initially the general tab panel is the only panel rendered', () => {
    const { queryAllByRole } = render(<ExampleDetailView />);

    waitFor(() => {
      const allTabPanels = queryAllByRole('tabpanel');

      expect(allTabPanels.length).toEqual(1);
    });
  });

  it('Renders the transport details content once the price tab has been pressed', async () => {
    const { getByRole } = render(<ExampleDetailView />);

    waitFor(() => {
      const transportTabButton = getByRole('tab', { name: /transport/i });

      act(() => {
        transportTabButton.click();
      });

      const transportPanel = getByRole('tabpanel', { name: /transport/i });
      expect(transportPanel).toBeInTheDocument();
    });
  });
});

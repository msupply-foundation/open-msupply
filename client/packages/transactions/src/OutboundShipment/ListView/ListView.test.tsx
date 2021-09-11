import React from 'react';
import { render, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route } from 'react-router';

import { TestingProvider, TestingRouter } from '@openmsupply-client/common';
import AppBar from '@openmsupply-client/host/src/AppBar';

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

  it('Selects all rows when the select all checkbox is checked', async () => {
    const { getAllByRole, getByRole, getByText, queryAllByRole } = render(
      <TestingProvider>
        <TestingRouter initialEntries={['/customers/customer-invoice']}>
          <Route
            path="*"
            element={
              <>
                <AppBar />
                <OutboundShipmentListView />
              </>
            }
          />
        </TestingRouter>
      </TestingProvider>
    );

    await waitFor(async () => {
      const selectAllRowsButton = getByRole('columnheader', {
        name: /selection/i,
      });

      const dropdown = getByRole('button', {
        name: /select/i,
        expanded: false,
      });

      let rows = getAllByRole('row');

      await act(async () => {
        userEvent.click(selectAllRowsButton);
        userEvent.click(dropdown);
      });

      const dropdownOption = getByText(/delete/i);

      await act(async () => {
        userEvent.click(dropdownOption);
        rows = await queryAllByRole('row');
      });

      await waitFor(async () => {
        expect(rows.length).toBe(0);
      });
    });
  });
});

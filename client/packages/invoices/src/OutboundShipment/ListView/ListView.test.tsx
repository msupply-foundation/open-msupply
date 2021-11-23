import React from 'react';
import { render, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route } from 'react-router';

import { TestingProvider, TestingRouter } from '@openmsupply-client/common';
import { AppBar } from '@openmsupply-client/host/src/components';

import { OutboundShipmentListView } from './ListView';

jest.setTimeout(10000);

describe('OutboundShipmentListView', () => {
  it('Renders all the headers for the list', async () => {
    const { getByRole } = render(
      <TestingProvider>
        <TestingRouter initialEntries={['/distribution/outbound-shipment']}>
          <Route path="*" element={<OutboundShipmentListView />} />
        </TestingRouter>
      </TestingProvider>
    );

    // TODO: Don't hard code the columns. Get them from a shared function with the
    // specific view

    await waitFor(() => {
      expect(getByRole('columnheader', { name: /name/i })).toBeInTheDocument();
      expect(
        getByRole('columnheader', { name: /status/i })
      ).toBeInTheDocument();
      expect(
        getByRole('columnheader', { name: /invoicenumber/i })
      ).toBeInTheDocument();
      expect(
        getByRole('columnheader', { name: /comment/i })
      ).toBeInTheDocument();
      expect(
        getByRole('columnheader', { name: /selection/i })
      ).toBeInTheDocument();
    });
  });

  it('Selects all rows when the select all checkbox is checked and deletes them after clicking delete all selected rows', async () => {
    const { getAllByRole, getByRole, getByText, queryAllByRole } = render(
      <TestingProvider>
        <TestingRouter initialEntries={['/distribution/outbound-shipment']}>
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

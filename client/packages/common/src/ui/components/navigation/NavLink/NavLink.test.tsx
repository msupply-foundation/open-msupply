import React, { FC, useEffect } from 'react';
import { Box } from '@mui/system';
import { render } from '@testing-library/react';
import { Route } from 'react-router';
import { NavLink } from './NavLink';
import { useDrawer } from '../../../../hooks';
import { TestingProvider, TestingRouter } from '../../../../utils/testing';
import { CustomersIcon } from '../../../icons';

const Wrapper: FC<{ collapsed: boolean }> = ({ collapsed }) => {
  const drawer = useDrawer();

  useEffect(() => {
    if (collapsed) drawer.close();
    else drawer.open();
  }, []);

  return null;
};

describe('NavLink', () => {
  it('Correctly renders a link item with the name correct name and href when the nav link is collapsed', () => {
    const { getByRole } = render(
      <TestingProvider>
        <TestingRouter initialEntries={['/customers']}>
          <Route
            path="*"
            element={
              <Box>
                <Wrapper collapsed />
                <NavLink
                  to="/customer-invoice"
                  icon={<CustomersIcon />}
                  text="Customers"
                  end={false}
                />
              </Box>
            }
          />
        </TestingRouter>
      </TestingProvider>
    );

    const node = getByRole('link', { name: /customer/i });

    expect(node).toBeInTheDocument();
    expect(node).toHaveAttribute('href', '/customer-invoice');
  });

  it('Correctly renders a link item with the name correct name and href when the nav link is not collapsed', () => {
    const { getByRole } = render(
      <TestingProvider>
        <TestingRouter initialEntries={['/customers']}>
          <Route
            path="*"
            element={
              <Box>
                <Wrapper collapsed={false} />
                <NavLink
                  to="/customer-invoice"
                  icon={<CustomersIcon />}
                  text="Customers"
                  end={false}
                />
              </Box>
            }
          />
        </TestingRouter>
      </TestingProvider>
    );

    const node = getByRole('link', { name: /customer/i });

    expect(node).toBeInTheDocument();
    expect(node).toHaveAttribute('href', '/customer-invoice');
  });

  it('Correctly renders a span in place of a link for top level hover items', () => {
    const { getByTestId } = render(
      <TestingProvider>
        <TestingRouter initialEntries={['/customers']}>
          <Route
            path="*"
            element={
              <Box>
                <Wrapper collapsed />
                <NavLink
                  to="/customer-invoice"
                  icon={<CustomersIcon />}
                  text="Customers"
                  end={false}
                  expandOnHover
                />
              </Box>
            }
          />
        </TestingRouter>
      </TestingProvider>
    );

    const node = getByTestId('/customer-invoice_hover');

    expect(node).toBeInTheDocument();
  });
});

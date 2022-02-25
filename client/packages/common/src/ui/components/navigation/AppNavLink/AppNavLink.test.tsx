import React, { FC, useEffect } from 'react';
import { Box } from '@mui/material';
import { render } from '@testing-library/react';
import { Route } from 'react-router';
import { AppNavLink } from './AppNavLink';
import { useDrawer } from '@common/hooks';
import { TestingProvider, TestingRouter } from '../../../../utils/testing';
import { TruckIcon } from '@common/icons';

const Wrapper: FC<{ collapsed: boolean }> = ({ collapsed }) => {
  const drawer = useDrawer();

  useEffect(() => {
    if (collapsed) drawer.close();
    else drawer.open();
  }, []);

  return null;
};

describe('AppNavLink', () => {
  it('Correctly renders a link item with the name correct name and href when the nav link is collapsed', () => {
    const { getByRole } = render(
      <TestingProvider>
        <TestingRouter initialEntries={['/distribution']}>
          <Route
            path="*"
            element={
              <Box>
                <Wrapper collapsed />
                <AppNavLink
                  to="/outbound-shipment"
                  icon={<TruckIcon />}
                  text="Distribution"
                  end={false}
                />
              </Box>
            }
          />
        </TestingRouter>
      </TestingProvider>
    );

    const node = getByRole('link', { name: /distribution/i });

    expect(node).toBeInTheDocument();
    expect(node).toHaveAttribute('href', '/outbound-shipment');
  });

  it('Correctly renders a link item with the name correct name and href when the nav link is not collapsed', () => {
    const { getByRole } = render(
      <TestingProvider>
        <TestingRouter initialEntries={['/distribution']}>
          <Route
            path="*"
            element={
              <Box>
                <Wrapper collapsed={false} />
                <AppNavLink
                  to="/outbound-shipment"
                  icon={<TruckIcon />}
                  text="Distribution"
                  end={false}
                />
              </Box>
            }
          />
        </TestingRouter>
      </TestingProvider>
    );

    const node = getByRole('link', { name: /distribution/i });

    expect(node).toBeInTheDocument();
    expect(node).toHaveAttribute('href', '/outbound-shipment');
  });

  it('Correctly renders a span in place of a link for top level hover items', () => {
    const { getByTestId } = render(
      <TestingProvider>
        <TestingRouter initialEntries={['/distribution']}>
          <Route
            path="*"
            element={
              <Box>
                <Wrapper collapsed />
                <AppNavLink
                  to="/outbound-shipment"
                  icon={<TruckIcon />}
                  text="Distribution"
                  end={false}
                  inactive
                />
              </Box>
            }
          />
        </TestingRouter>
      </TestingProvider>
    );

    const node = getByTestId('/outbound-shipment_hover');

    expect(node).toBeInTheDocument();
  });
});

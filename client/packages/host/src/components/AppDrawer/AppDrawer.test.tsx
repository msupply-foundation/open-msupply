import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import AppDrawer from './AppDrawer';
import {
  setScreenSize_ONLY_FOR_TESTING,
  TestingProvider,
  TestingRouterContext,
} from '@openmsupply-client/common';
import '@testing-library/jest-dom';

describe('AppDrawer', () => {
  it('Collapses when clicking the drawer open/close button for the first time on a large screen', async () => {
    setScreenSize_ONLY_FOR_TESTING(1441);
    const { getByRole, getByTestId } = render(
      <TestingProvider>
        <TestingRouterContext>
          <AppDrawer />
        </TestingRouterContext>
      </TestingProvider>
    );

    const button = getByRole('button', { name: /close the menu/i });
    const drawer = getByTestId('drawer');

    fireEvent.click(button);

    await waitFor(() => {
      expect(drawer).toHaveAttribute('aria-expanded', 'false');
    });
  });
  it('expands when clicking the drawer open/close button for the first time on a small screen', async () => {
    setScreenSize_ONLY_FOR_TESTING(1199);
    const { getByRole, getByTestId } = render(
      <TestingProvider>
        <TestingRouterContext>
          <AppDrawer />
        </TestingRouterContext>
      </TestingProvider>
    );

    const button = getByRole('button', { name: /open the menu/i });
    const drawer = getByTestId('drawer');

    fireEvent.click(button);

    await waitFor(() => {
      expect(drawer).toHaveAttribute('aria-expanded', 'true');
    });
  });
  it('has visible text when the menu is expanded', async () => {
    setScreenSize_ONLY_FOR_TESTING(1441);
    const { getByText } = render(
      <TestingProvider>
        <TestingRouterContext>
          <AppDrawer />
        </TestingRouterContext>
      </TestingProvider>
    );

    await waitFor(() => {
      expect(getByText(/distribution/i)).toBeVisible();
      expect(getByText(/dashboard/i)).toBeVisible();
      expect(getByText(/inventory/i)).toBeVisible();
      // expect(getByText(/reports/i)).toBeVisible();
    });
  });
  it('Text is invisible when the menu is collapsed', async () => {
    setScreenSize_ONLY_FOR_TESTING(1442);
    const { getByText } = render(
      <TestingProvider>
        <TestingRouterContext>
          <AppDrawer />
        </TestingRouterContext>
      </TestingProvider>
    );

    const button = screen.getByRole('button', {
      name: /close the menu/i,
    });

    fireEvent.click(button);

    await waitFor(() => {
      expect(getByText(/dashboard/i)).not.toBeVisible();
      expect(getByText(/distribution/i)).not.toBeVisible();
      expect(getByText(/suppliers/i)).not.toBeVisible();
      expect(getByText(/stock$/i)).not.toBeVisible();
      // expect(getByText(/tools/i)).not.toBeVisible();
      // expect(getByText(/reports/i)).not.toBeVisible();
      // expect(getByText(/messages/i)).not.toBeVisible();
    });
  });
});

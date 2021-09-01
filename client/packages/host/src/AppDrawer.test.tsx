import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AppDrawer from './AppDrawer';
import {
  setScreenSize_ONLY_FOR_TESTING,
  TestingProvider,
} from '@openmsupply-client/common';
import { act } from 'react-dom/test-utils';

describe('AppDrawer', () => {
  it('Collapses when clicking the drawer open/close button for the first time on a large screen', async () => {
    const { getByRole, getByTestId } = render(
      <TestingProvider>
        <AppDrawer />
      </TestingProvider>
    );

    const button = getByRole('button', { name: /Close the menu/i });
    const drawer = getByTestId('drawer');

    act(() => {
      userEvent.click(button);
    });

    await waitFor(() => {
      expect(drawer).toHaveAttribute('aria-expanded', 'false');
    });
  });
  it('expands when clicking the drawer open/close button for the first time on a small screen', async () => {
    setScreenSize_ONLY_FOR_TESTING(1199);
    const { getByRole, getByTestId } = render(
      <TestingProvider>
        <AppDrawer />
      </TestingProvider>
    );

    const button = getByRole('button', { name: /Open the menu/i });
    const drawer = getByTestId('drawer');

    act(() => {
      userEvent.click(button);
    });

    await waitFor(() => {
      expect(drawer).toHaveAttribute('aria-expanded', 'true');
    });
  });
  it('Text is visibility when the menu is expanded', async () => {
    const { getByText } = render(
      <TestingProvider>
        <AppDrawer />
      </TestingProvider>
    );

    await waitFor(() => {
      expect(getByText(/customers/i)).toBeVisible();
      expect(getByText(/dashboard/i)).toBeVisible();
      expect(getByText(/customers/i)).toBeVisible();
      expect(getByText(/suppliers/i)).toBeVisible();
      expect(getByText(/stock/i)).toBeVisible();
      expect(getByText(/tools/i)).toBeVisible();
      expect(getByText(/reports/i)).toBeVisible();
      expect(getByText(/messages/i)).toBeVisible();
    });
  });
  it('Text is invisible when the menu is collapsed', async () => {
    const { getByText } = render(
      <TestingProvider>
        <AppDrawer />
      </TestingProvider>
    );

    const button = screen.getByRole('button', { name: /Close the menu/i });

    act(() => {
      userEvent.click(button);
    });

    waitFor(() => {
      expect(getByText(/customers/i)).not.toBeVisible();
      expect(getByText(/dashboard/i)).not.toBeVisible();
      expect(getByText(/customers/i)).not.toBeVisible();
      expect(getByText(/suppliers/i)).not.toBeVisible();
      expect(getByText(/stock/i)).not.toBeVisible();
      expect(getByText(/tools/i)).not.toBeVisible();
      expect(getByText(/reports/i)).not.toBeVisible();
      expect(getByText(/messages/i)).not.toBeVisible();
    });
  });
});

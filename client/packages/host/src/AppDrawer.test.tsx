import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AppDrawer from './AppDrawer';
import {
  setScreenSize_ONLY_FOR_TESTING,
  TestingProvider,
} from '@openmsupply-client/common';
import { act } from 'react-dom/test-utils';
import { BrowserRouter } from 'react-router-dom';

describe('AppDrawer', () => {
  it('Collapses when clicking the drawer open/close button for the first time on a large screen', async () => {
    setScreenSize_ONLY_FOR_TESTING(1441);
    const { getByRole, getByTestId } = render(
      <TestingProvider>
        <BrowserRouter>
          <AppDrawer />
        </BrowserRouter>
      </TestingProvider>
    );

    const button = getByRole('button', { name: /button.close-the-menu/i });
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
        <BrowserRouter>
          <AppDrawer />
        </BrowserRouter>
      </TestingProvider>
    );

    const button = getByRole('button', { name: /button.open-the-menu/i });
    const drawer = getByTestId('drawer');

    act(() => {
      userEvent.click(button);
    });

    await waitFor(() => {
      expect(drawer).toHaveAttribute('aria-expanded', 'true');
    });
  });
  it('has visible text when the menu is expanded', async () => {
    setScreenSize_ONLY_FOR_TESTING(1441);
    const { getByText } = render(
      <TestingProvider>
        <BrowserRouter>
          <AppDrawer />
        </BrowserRouter>
      </TestingProvider>
    );

    await waitFor(() => {
      expect(getByText(/distribution/i)).toBeVisible();
      expect(getByText(/dashboard/i)).toBeVisible();
      // expect(getByText(/suppliers/i)).toBeVisible();
      expect(getByText(/stock/i)).toBeVisible();
      // expect(getByText(/tools/i)).toBeVisible();
      expect(getByText(/reports/i)).toBeVisible();
      // expect(getByText(/messages/i)).toBeVisible();
    });
  });
  it('Text is invisible when the menu is collapsed', async () => {
    setScreenSize_ONLY_FOR_TESTING(1442);
    const { getByText } = render(
      <TestingProvider>
        <BrowserRouter>
          <AppDrawer />
        </BrowserRouter>
      </TestingProvider>
    );

    const button = screen.getByRole('button', {
      name: /button.close-the-menu/i,
    });

    act(() => {
      userEvent.click(button);
    });

    waitFor(() => {
      expect(getByText(/dashboard/i)).not.toBeVisible();
      expect(getByText(/distribution/i)).not.toBeVisible();
      expect(getByText(/suppliers/i)).not.toBeVisible();
      expect(getByText(/stock/i)).not.toBeVisible();
      expect(getByText(/tools/i)).not.toBeVisible();
      expect(getByText(/reports/i)).not.toBeVisible();
      expect(getByText(/messages/i)).not.toBeVisible();
    });
  });
});

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import AppDrawer from './AppDrawer';
import { TestingProvider } from '@openmsupply-client/common';
import { act } from 'react-dom/test-utils';

describe('AppDrawer', () => {
  it('Expands when clicking the expand button', () => {
    render(
      <TestingProvider>
        <AppDrawer />
      </TestingProvider>
    );

    const button = screen.getByRole('button', { name: /Open the menu/i });
    const drawer = screen.getByTestId('drawer');

    act(() => {
      fireEvent.click(button);
    });

    expect(drawer).toHaveAttribute('aria-expanded', 'true');
  });
  it('Text changes visibility when the menu is collapsed/expanded', () => {
    render(
      <TestingProvider>
        <AppDrawer />
      </TestingProvider>
    );

    const button = screen.getByRole('button', { name: /Open the menu/i });

    act(() => {
      fireEvent.click(button);
    });

    let rootNavigationElements = [
      screen.getByText(/dashboard/i),
      screen.getByText(/customers/i),
      screen.getByText(/suppliers/i),
      screen.getByText(/stock/i),
      screen.getByText(/tools/i),
      screen.getByText(/reports/i),
      screen.getByText(/messages/i),
    ];

    rootNavigationElements.forEach(element => {
      expect(element).toBeVisible();
    });

    act(() => {
      fireEvent.click(button);
    });

    rootNavigationElements = [
      screen.getByText(/dashboard/i),
      screen.getByText(/customers/i),
      screen.getByText(/suppliers/i),
      screen.getByText(/stock/i),
      screen.getByText(/tools/i),
      screen.getByText(/reports/i),
      screen.getByText(/messages/i),
    ];

    rootNavigationElements.forEach(element => {
      expect(element).not.toBeVisible();
    });
  });
});

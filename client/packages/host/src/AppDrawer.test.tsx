import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import AppDrawer from './AppDrawer';
import {
  setScreenSize_ONLY_FOR_TESTING,
  TestingProvider,
} from '@openmsupply-client/common';
import { act } from 'react-dom/test-utils';

describe('AppDrawer', () => {
  it('Collapses when clicking the drawer open/close button for the first time on a large screen', () => {
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

    expect(drawer).toHaveAttribute('aria-expanded', 'false');
  });
  it('expands when clicking the drawer open/close button for the first time on a small screen', () => {
    setScreenSize_ONLY_FOR_TESTING(1279);
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

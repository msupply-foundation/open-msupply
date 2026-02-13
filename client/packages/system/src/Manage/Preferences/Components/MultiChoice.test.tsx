import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  MultiChoice,
  getMultiChoiceOptions,
} from './MultiChoice';
import {
  InvoiceNodeStatus,
  PreferenceKey,
  TestingProvider,
} from '@openmsupply-client/common';

// Mock the notification hook
const mockError = jest.fn(() => jest.fn());
jest.mock('@openmsupply-client/common', () => ({
  ...jest.requireActual('@openmsupply-client/common'),
  useNotification: () => ({
    error: mockError,
  }),
  useTranslation: () => (key: string) => key,
}));

describe('MultiChoice - Invoice Status Options Validation', () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    mockError.mockClear();
    mockOnChange.mockClear();
  });

  it('should allow unchecking Delivered when Received is still checked', () => {
    const options = [
      {
        value: InvoiceNodeStatus.Delivered,
        label: 'Delivered',
        group: 'Inbound',
      },
      {
        value: InvoiceNodeStatus.Received,
        label: 'Received',
        group: 'Inbound',
      },
    ];

    const { container } = render(
      <TestingProvider>
        <MultiChoice
          options={options}
          value={[InvoiceNodeStatus.Delivered, InvoiceNodeStatus.Received]}
          onChange={mockOnChange}
          preferenceKey={PreferenceKey.InvoiceStatusOptions}
        />
      </TestingProvider>
    );

    // Find the Delivered checkbox and uncheck it
    const deliveredCheckbox = container.querySelector(
      'input[type="checkbox"]'
    ) as HTMLInputElement;
    fireEvent.click(deliveredCheckbox);

    // Should allow the change since Received is still checked
    expect(mockOnChange).toHaveBeenCalledWith([InvoiceNodeStatus.Received]);
    expect(mockError).not.toHaveBeenCalled();
  });

  it('should prevent unchecking Delivered when Received is already unchecked', () => {
    const options = [
      {
        value: InvoiceNodeStatus.Delivered,
        label: 'Delivered',
        group: 'Inbound',
      },
      {
        value: InvoiceNodeStatus.Received,
        label: 'Received',
        group: 'Inbound',
      },
    ];

    const { container } = render(
      <TestingProvider>
        <MultiChoice
          options={options}
          value={[InvoiceNodeStatus.Delivered]}
          onChange={mockOnChange}
          preferenceKey={PreferenceKey.InvoiceStatusOptions}
        />
      </TestingProvider>
    );

    // Find the Delivered checkbox (the only checked one) and try to uncheck it
    const deliveredCheckbox = container.querySelector(
      'input[type="checkbox"][checked]'
    ) as HTMLInputElement;
    fireEvent.click(deliveredCheckbox);

    // Should prevent the change and show an error
    expect(mockOnChange).not.toHaveBeenCalled();
    expect(mockError).toHaveBeenCalledWith(
      'error.invoice-status-inbound-requires-delivered-or-received'
    );
  });

  it('should prevent unchecking Received when Delivered is already unchecked', () => {
    const options = [
      {
        value: InvoiceNodeStatus.Delivered,
        label: 'Delivered',
        group: 'Inbound',
      },
      {
        value: InvoiceNodeStatus.Received,
        label: 'Received',
        group: 'Inbound',
      },
    ];

    const { container } = render(
      <TestingProvider>
        <MultiChoice
          options={options}
          value={[InvoiceNodeStatus.Received]}
          onChange={mockOnChange}
          preferenceKey={PreferenceKey.InvoiceStatusOptions}
        />
      </TestingProvider>
    );

    // Find the Received checkbox (the only checked one) and try to uncheck it
    const receivedCheckbox = container.querySelector(
      'input[type="checkbox"][checked]'
    ) as HTMLInputElement;
    fireEvent.click(receivedCheckbox);

    // Should prevent the change and show an error
    expect(mockOnChange).not.toHaveBeenCalled();
    expect(mockError).toHaveBeenCalledWith(
      'error.invoice-status-inbound-requires-delivered-or-received'
    );
  });

  it('should allow checking a status without validation', () => {
    const options = [
      {
        value: InvoiceNodeStatus.Delivered,
        label: 'Delivered',
        group: 'Inbound',
      },
    ];

    const { container } = render(
      <TestingProvider>
        <MultiChoice
          options={options}
          value={[]}
          onChange={mockOnChange}
          preferenceKey={PreferenceKey.InvoiceStatusOptions}
        />
      </TestingProvider>
    );

    // Find the Delivered checkbox and check it
    const deliveredCheckbox = container.querySelector(
      'input[type="checkbox"]'
    ) as HTMLInputElement;
    fireEvent.click(deliveredCheckbox);

    // Should allow checking without validation
    expect(mockOnChange).toHaveBeenCalledWith([InvoiceNodeStatus.Delivered]);
    expect(mockError).not.toHaveBeenCalled();
  });

  it('should not validate for non-InvoiceStatusOptions preferences', () => {
    const options = [
      {
        value: 'option1',
        label: 'Option 1',
      },
    ];

    const { container } = render(
      <TestingProvider>
        <MultiChoice
          options={options}
          value={['option1']}
          onChange={mockOnChange}
          preferenceKey={PreferenceKey.GenderOptions}
        />
      </TestingProvider>
    );

    // Find the checkbox and uncheck it
    const checkbox = container.querySelector(
      'input[type="checkbox"]'
    ) as HTMLInputElement;
    fireEvent.click(checkbox);

    // Should allow unchecking without validation for non-InvoiceStatusOptions
    expect(mockOnChange).toHaveBeenCalledWith([]);
    expect(mockError).not.toHaveBeenCalled();
  });
});

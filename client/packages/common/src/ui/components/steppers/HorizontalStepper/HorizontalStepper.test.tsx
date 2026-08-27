import React from 'react';
import { render } from '@testing-library/react';
import { HorizontalStepper } from './HorizontalStepper';
import { TestingProvider } from '../../../../utils';

describe('HorizontalStepper', () => {
  it('renders the label of each step', () => {
    const { getByText } = render(
      // The stepper doesn't use any sort of role, so just querying by text
      // the description to ensure that at minimum we're rendering that.

      <TestingProvider>
        <HorizontalStepper
          steps={[
            { label: 'admin' },
            { label: 'catalogue' },
            { label: 'customers' },
          ]}
        />
      </TestingProvider>
    );

    const node1 = getByText('admin');
    const node2 = getByText('catalogue');
    const node3 = getByText('customers');

    expect(node1).toBeInTheDocument();
    expect(node2).toBeInTheDocument();
    expect(node3).toBeInTheDocument();
  });

  it('renders the correct active/completed states correctly', () => {
    const { getByTestId } = render(
      <TestingProvider>
        <HorizontalStepper
          steps={[
            { label: 'admin', completed: true },
            { label: 'catalogue', active: true, completed: true },
            { label: 'customers' },
          ]}
        />
      </TestingProvider>
    );

    const node1 = getByTestId('completed');
    const node2 = getByTestId('activecompleted');

    expect(node1).toBeInTheDocument();
    expect(node2).toBeInTheDocument();
  });

  it('renders the optional items correctly', () => {
    const { getByTitle, getByTestId } = render(
      <TestingProvider>
        <HorizontalStepper
          steps={[
            { label: 'admin', completed: true },
            {
              label: 'catalogue',
              active: true,
              optional: <p title="an-optional-component">subtext</p>,
            },
            { label: 'customers' },
          ]}
        />
      </TestingProvider>
    );

    const node1 = getByTestId('completed');
    const node2 = getByTestId('active');
    const node3 = getByTitle('an-optional-component');

    expect(node1).toBeInTheDocument();
    expect(node2).toBeInTheDocument();
    expect(node3).toBeInTheDocument();
  });
});

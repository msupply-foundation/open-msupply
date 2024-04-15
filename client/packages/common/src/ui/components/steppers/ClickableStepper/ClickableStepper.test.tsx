import React from 'react';
import { render } from '@testing-library/react';
import { ClickableStepper } from './ClickableStepper';
import { TestingProvider } from '../../../../utils';

describe('ClickableStepper', () => {
  it('renders the description of each step', () => {
    const { getByText } = render(
      // The stepper doesn't use any sort of role, so just querying by text
      // the description to ensure that at minimum we're rendering that.

      <TestingProvider>
        <ClickableStepper
          activeStep={0}
          steps={[
            { label: 'admin', description: 'admin step' },
            { label: 'catalogue', description: 'catalogue step' },
            { label: 'customers', description: 'customers step' },
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
        <ClickableStepper
          activeStep={1}
          steps={[
            { label: 'admin', description: 'admin step' },
            { label: 'catalogue', description: 'catalogue step' },
            { label: 'customers', description: 'customers step' },
          ]}
        />
      </TestingProvider>
    );

    const node1 = getByTestId('completed');
    const node2 = getByTestId('activecompleted');

    expect(node1).toBeInTheDocument();
    expect(node2).toBeInTheDocument();
  });
});

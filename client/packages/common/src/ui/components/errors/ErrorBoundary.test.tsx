import React, { FC } from 'react';
import { render, screen } from '@testing-library/react';
import { ErrorBoundary } from './ErrorBoundary';
import { ErrorBoundaryFallbackProps } from './types';

describe('ErrorBoundary', () => {
  const ExampleErrorThrower = () => {
    throw new Error('Test error');
  };

  const ExampleFallback: FC<ErrorBoundaryFallbackProps> = ({
    onClearError,
  }) => (
    <>
      <h1>Something went wrong.</h1>
      <button onClick={onClearError} />
    </>
  );

  const ExampleSimpleComponent: FC = () => <span>simple</span>;

  it('Errors caught in children renders result in a caught error', () => {
    const consoleError = console.error;
    console.error = jest.fn();

    render(
      <ErrorBoundary Fallback={ExampleFallback}>
        <ExampleErrorThrower />
      </ErrorBoundary>
    );

    const node = screen.getByText(/Something went wrong/);

    expect(node).toBeInTheDocument();

    console.error = consoleError;
  });

  it('If no error is thrown only the children are rendered', () => {
    render(
      <ErrorBoundary Fallback={ExampleFallback}>
        <ExampleSimpleComponent />
      </ErrorBoundary>
    );

    const node = screen.getByText(/simple/i);

    expect(node).toBeInTheDocument();
  });
});

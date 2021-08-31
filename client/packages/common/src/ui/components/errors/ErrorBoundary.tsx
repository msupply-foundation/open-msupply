import React, { ReactNode, ErrorInfo, JSXElementConstructor } from 'react';
import { ErrorBoundaryFallbackProps } from './types';
// import Bugsnag from '@bugsnag/js';

// Bugsnag.start({
//   apiKey: 'a09ce9e95c27ac1b70ecf3c311e684ab',
// });

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface ErrorBoundaryProps {
  children: ReactNode;
  Fallback: JSXElementConstructor<ErrorBoundaryFallbackProps>;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Bugsnag.notify(error);
    this.setState({ hasError: true, error, errorInfo });
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <this.props.Fallback
          {...this.state}
          onClearError={() => {
            this.setState({ hasError: false, error: null, errorInfo: null });
          }}
        />
      );
    }

    return this.props.children;
  }
}

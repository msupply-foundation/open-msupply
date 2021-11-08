/* eslint-disable @typescript-eslint/ban-ts-comment */
import React from 'react';
import { setLogger } from 'react-query';
import { render, waitFor } from '@testing-library/react';
import { request, gql } from 'graphql-request';
import { Test } from '../../types';
import { ListApi, useListData } from './useListData';
import { ErrorBoundary } from '../../ui/components/errors';
import { TestingProvider } from '../../utils/testing';

beforeEach(() => {
  jest.spyOn(console, 'error');
  // @ts-ignore jest.spyOn adds this functionality
  console.error.mockImplementation(() => null);
});

afterEach(() => {
  // @ts-ignore jest.spyOn adds this functionality
  console.error.mockRestore();
});

describe('useListData', () => {
  beforeAll(() =>
    setLogger({
      log: console.log,
      warn: console.warn,
      // suppress console errors
      error: () => {},
    })
  );

  const ServerErrorApi: ListApi<Test> = {
    onRead: () => async () => {
      return await request('http://localhost:4000', getServerErrorQuery());
    },
    onDelete: async () => {},
    onUpdate: async () => ({} as Test),
    onCreate: async () => '',
  };

  const getServerErrorQuery = (): string => gql`
    query error500 {
      error500 {
        message
      }
    }
  `;

  const PermissionErrorApi: ListApi<Test> = {
    onRead: () => async () => {
      return await request(
        'http://localhost:4000',
        getPermissionErrorQuery(),
        {}
      );
    },
    onDelete: () => new Promise(() => {}),
    onUpdate: () => new Promise(() => {}),
    onCreate: async () => '',
  };

  const getPermissionErrorQuery = (): string => gql`
    query error401 {
      error401 {
        message
      }
    }
  `;

  const ErrorFallback = () => <div>error boundary</div>;
  const Wrapper: React.FC = ({ children }) => (
    <ErrorBoundary Fallback={ErrorFallback}>
      <TestingProvider>{children}</TestingProvider>
    </ErrorBoundary>
  );

  it('calls the provided error method on non-critical error', async () => {
    const onError = jest.fn();
    const ErrorTest = () => {
      const { data } = useListData(
        { initialSortBy: { key: 'message' } },
        '401test',
        PermissionErrorApi,
        onError
      );
      const [response] = data || [];

      return <div>{response?.message}</div>;
    };

    render(
      <Wrapper>
        <ErrorTest />
      </Wrapper>
    );

    await waitFor(() => {
      expect(onError).toBeCalledTimes(1);
    });
  });

  it('calls error boundary on server error', async () => {
    const ErrorTest = () => {
      const { data } = useListData(
        { initialSortBy: { key: 'message' } },
        '500test',
        ServerErrorApi
      );
      const [response] = data || [];

      return <div>{response?.message}</div>;
    };

    const { getByText } = render(
      <Wrapper>
        <ErrorTest />
      </Wrapper>
    );

    await waitFor(() => {
      const component = getByText(/error boundary/);
      expect(component).toBeInTheDocument();
    });
  });
});

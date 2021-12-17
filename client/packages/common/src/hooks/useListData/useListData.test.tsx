/* eslint-disable @typescript-eslint/ban-ts-comment */
import React from 'react';
import { Route } from 'react-router-dom';
import { setLogger } from 'react-query';
import { request, gql } from 'graphql-request';
import { Test, DomainObject } from '../../types';
import { ListApi, useListData } from './useListData';
import { ErrorBoundary } from '@common/components';
import { TestingProvider, TestingRouter } from '../../utils/testing';
import { setupMockServer } from '@openmsupply-client/mock-server/src/worker/server';
import { render, waitFor } from '@testing-library/react';
import { renderHook } from '@testing-library/react-hooks';

interface TestType extends Test, DomainObject {}

const server = setupMockServer();

beforeAll(() => {
  // Establish requests interception layer before all tests.
  server.listen();
});

afterAll(() => {
  // Clean up after all tests are done, preventing this
  // interception layer from affecting irrelevant tests.
  server.close();
});

beforeEach(() => {
  jest.spyOn(console, 'error');
  // @ts-ignore jest.spyOn adds this functionality
  console.error.mockImplementation(() => null);
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

  const ServerErrorApi: ListApi<TestType> = {
    onRead: () => async () => {
      return await request('http://localhost:4000', getServerErrorQuery());
    },
    onDelete: async () => [''],
    onUpdate: async () => '',
    onCreate: async () => '',
  };

  const getServerErrorQuery = (): string => gql`
    query error500 {
      error500 {
        message
      }
    }
  `;

  const PermissionErrorApi: ListApi<TestType> = {
    onRead: () => async () =>
      request('http://localhost:4000', getPermissionErrorQuery(), {}),
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
      <TestingProvider>
        <TestingRouter initialEntries={['/distribution']}>
          <Route path="distribution" element={<>{children}</>} />
        </TestingRouter>
      </TestingProvider>
    </ErrorBoundary>
  );

  it('calls the provided error method on non-critical error', async () => {
    const onError = jest.fn();
    renderHook(
      () => {
        useListData(
          { initialSortBy: { key: 'message' } },
          '401test',
          PermissionErrorApi,
          onError
        );
      },
      { wrapper: Wrapper }
    );

    await waitFor(() => expect(onError).toBeCalledTimes(1));
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

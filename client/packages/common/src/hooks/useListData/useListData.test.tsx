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
    onQuery: () => async () => {
      return await request('http://localhost:4000', getServerErrorQuery(), {});
    },
    onDelete: () => new Promise(() => {}),
    onUpdate: () => new Promise(() => {}),
  };

  const getServerErrorQuery = (): string => gql`
    query error500 {
      error500 {
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

  it('calls error boundary on server error', async () => {
    const ErrorTest = () => {
      const { data } = useListData({ key: 'message' }, 'test', ServerErrorApi);
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

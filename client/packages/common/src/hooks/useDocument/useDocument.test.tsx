import React, { Dispatch, FC } from 'react';
import {
  DefaultDocumentAction,
  TestingProvider,
  TestingRouter,
} from '@openmsupply-client/common';
import { waitFor } from '@testing-library/dom';
import { useDocument } from './useDocument';
import { Api } from './types';
import { renderHook } from '@testing-library/react-hooks';
import { Route } from 'react-router';

describe('useDocument', () => {
  const Wrapper: FC = ({ children }) => {
    return (
      <TestingProvider>
        <TestingRouter initialEntries={['/customers/customer-invoice/1']}>
          <Route path="customers/customer-invoice">
            <Route path={':id'} element={<>{children}</>} />
          </Route>
        </TestingRouter>
      </TestingProvider>
    );
  };

  const api: Api<{ id: string; data: string }, { id: string; data: string }> = {
    onRead: async () => ({ id: '2', data: 'data' }),
    onUpdate: async (data: { id: string; data: string }) => data,
  };

  const getInitialState = () => ({
    merged: false,
    init: false,
    draft: { id: '1', data: 'data' },
  });

  const reducer =
    (
      data: { id: string; data: string } | undefined,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      _: Dispatch<DefaultDocumentAction> | null
    ) =>
    (state = getInitialState(), action: DefaultDocumentAction) => {
      if (action.type === 'Draft/init') {
        return { ...state, ...data, init: true };
      }

      if (action.type === 'Draft/merge') {
        return { ...state, ...data, merged: true };
      }

      return { ...data, ...state };
    };

  it('has dispatches an init action on mounting and receiving data', async () => {
    const { result } = renderHook(
      () => {
        const state = useDocument(['key'], reducer, api);

        return state;
      },
      { wrapper: Wrapper }
    );

    await waitFor(() => {
      expect(result.current.state.init).toBeTruthy();
      expect(result.current.state.merged).toBeFalsy();
      expect(result.current.state.data).toBeUndefined();
    });
  });

  it('has dispatches an init action on mounting and receiving data', async () => {
    const { result } = renderHook(
      () => {
        const state = useDocument(['key'], reducer, api);

        return state;
      },
      { wrapper: Wrapper }
    );

    await waitFor(() => {
      expect(result.current.state.merged).toBeTruthy();
      expect(result.current.state.data).not.toBeUndefined();
    });
  });
});

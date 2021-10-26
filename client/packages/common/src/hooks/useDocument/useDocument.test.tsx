import React, { Dispatch, FC } from 'react';
import {
  DefaultDocumentAction,
  DocumentActionType,
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
        <TestingRouter initialEntries={['/distribution/outbound-shipment/1']}>
          <Route path="distribution/outbound-shipment">
            <Route path={':id'} element={<>{children}</>} />
          </Route>
        </TestingRouter>
      </TestingProvider>
    );
  };

  // Simple API with some mock returns from onRead and onUpdate to simulate fetches.
  const api: Api<{ id: string; data: string }, { id: string; data: string }> = {
    onRead: async () => ({ id: '2', data: 'data' }),
    onUpdate: async (data: { id: string; data: string }) => data,
  };

  // Simple state to use in all of the tests. Merged and init are set within the reducer
  // when the corresponding actions are dispatched.
  const getInitialState = () => ({
    merged: false,
    init: false,
    draft: { id: '1', data: 'data' },
  });

  // Reducer to help us test what actions are being dispatched.
  const reducer =
    (
      data: { id: string; data: string } | undefined,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      _: Dispatch<DefaultDocumentAction> | null
    ) =>
    (state = getInitialState(), action: DefaultDocumentAction) => {
      if (action.type === DocumentActionType.Init) {
        return { ...state, ...data, init: true };
      }

      if (action.type === DocumentActionType.Merge) {
        return { ...state, ...data, merged: true };
      }

      return { ...data, ...state };
    };

  it('dispatches an init action on mounting', async () => {
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

  it('dispatches a merged action on receiving data', async () => {
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

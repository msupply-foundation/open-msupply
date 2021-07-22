import { store } from './store';
import React from 'react';
import { Provider } from 'react-redux';

export { ApiSlice } from './ApiSlice';
export { store } from './store';

export const ReduxProvider = ({ children }) => <Provider store={store}>{children}</Provider>;

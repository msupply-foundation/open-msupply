import { store } from './store';
import React from 'react';
import { Provider } from 'react-redux';

export const ReduxProvider: React.FC = ({ children }) => (
  <Provider store={store}>{children}</Provider>
);

import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';

if (process.env.NODE_ENV === 'development') {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { worker } = require('@openmsupply-client/mocks');
  worker.start();
}

ReactDOM.render(<App />, document.getElementById('root'));
2;

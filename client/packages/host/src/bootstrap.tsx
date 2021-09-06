import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';

if (process.env.NODE_ENV === 'development') {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { setupMockWorker } = require('@openmsupply-client/mocks/src/client');
  const worker = setupMockWorker();
  worker.start();
}

ReactDOM.render(<App />, document.getElementById('root'));

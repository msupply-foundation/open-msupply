import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';

const {
  setupMockWorker,
  // eslint-disable-next-line @typescript-eslint/no-var-requires
} = require('@openmsupply-client/mock-server/src/worker/client');
const worker = setupMockWorker();

worker.start();

ReactDOM.render(<App />, document.getElementById('root'));

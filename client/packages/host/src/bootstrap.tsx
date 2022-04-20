/* eslint-disable @typescript-eslint/no-non-null-assertion */
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

const container = document.getElementById('root');
const root = createRoot(container!);
root.render(<App />);

// import React from 'react';
// import ReactDOM from 'react-dom';
// import App from './App';

// ReactDOM.render(<App />, document.getElementById('root'));

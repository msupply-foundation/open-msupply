// bootstrap.tsx is the only entry-side file that *intentionally* has
// top-level side effects (it renders the app). Everything else in the
// module graph stays side-effect-free for tree-shaking.
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

if (process.env.NODE_ENV === 'development') {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const whyDidYouRender = require('@welldone-software/why-did-you-render');
  whyDidYouRender(React, {
    trackAllPureComponents: false,
    collapseGroups: true,
  });
}

const container = document.getElementById('root');
const root = createRoot(container!);
root.render(<App />);

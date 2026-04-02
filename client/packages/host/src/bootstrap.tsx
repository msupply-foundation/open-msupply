import React from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import App from './App';

async function bootstrap() {
  if (process.env.NODE_ENV === 'development') {
    // `require()` is not available in Vite's native-ESM browser environment;
    // use a dynamic import instead. why-did-you-render must be initialised
    // before any components mount so it can monkey-patch React's internals.
    try {
      const { default: whyDidYouRender } = await import(
        '@welldone-software/why-did-you-render'
      );
      whyDidYouRender(React, {
        trackAllPureComponents: false,
        collapseGroups: true,
      });
    } catch {
      // whyDidYouRender may fail (e.g. React version mismatch) — non-fatal
    }
  }

  const container = document.getElementById('root')!;

  // If the container already has children the page was pre-rendered at build
  // time.  Use hydrateRoot so React reconciles against the existing DOM
  // instead of wiping and re-mounting it — this preserves the pre-rendered
  // LCP element so Lighthouse records its paint time at initial load.
  if (container.firstChild) {
    hydrateRoot(container, <App />);
  } else {
    createRoot(container).render(<App />);
  }
}

bootstrap();

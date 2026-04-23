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

  // The pre-rendered shell is the login page, only valid at the root path.
  // If the user navigates directly to any other route (e.g. /reports/...) the
  // SSR HTML won't match what React would render, causing hydration errors
  // #418 / #423. In that case, wipe the stale shell and do a clean mount.
  const isLoginRoute = window.location.pathname === '/';
  if (container.firstChild && isLoginRoute) {
    hydrateRoot(container, <App />);
  } else {
    container.innerHTML = '';
    createRoot(container).render(<App />);
  }
}

bootstrap();

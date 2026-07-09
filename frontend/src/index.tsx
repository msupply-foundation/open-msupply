/* @refresh reload */
import { render } from 'solid-js/web';
import './index.css';
import { App } from './App';

const root = document.getElementById('root')!;

/*
 * Dev-only component showcase: opening the app at #/showcase(/<section>)
 * renders the showcase instead of the app (no auth/backend needed). The
 * dynamic import sits inside a statically-false branch in production builds
 * (import.meta.env.DEV → false), so the whole src/ui-showcase/ tree is
 * dead-code-eliminated — no showcase chunk is emitted at all. Crossing the
 * showcase/app boundary takes a reload; sections inside the showcase still
 * switch live. See src/ui-showcase/README.md.
 */
if (import.meta.env.DEV && window.location.hash.startsWith('#/showcase')) {
  void import('./ui-showcase/ShowcaseApp').then(({ ShowcaseApp }) => {
    render(() => <ShowcaseApp />, root);
  });
} else {
  render(() => <App />, root);
}

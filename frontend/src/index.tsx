/* @refresh reload */
import { render } from 'solid-js/web';
import './index.css';
import { App } from './App';
import { registerAndroidBackButton } from './platform/backButton';

const root = document.getElementById('root')!;

// Android shell only (no-op elsewhere): hardware back navigates history
// instead of closing the app.
void registerAndroidBackButton();

/*
 * Dev-only component showcase: opening the app at #/showcase(/<section>)
 * renders the showcase instead of the app (no auth/backend needed). The
 * dynamic import sits inside a statically-false branch in production builds
 * (import.meta.env.DEV → false), so the whole src/ui-showcase/ tree is
 * dead-code-eliminated — no showcase chunk is emitted at all. Crossing the
 * showcase/app boundary takes a reload; sections inside the showcase still
 * switch live. See src/ui-showcase/README.md.
 */
/*
 * Dev-only design prototypes: opening the app at #/prototypes(/<id>) renders
 * the prototypes area instead of the app. Same mechanism, same guarantees and
 * same reasons as the showcase branch below — a statically-false branch in
 * production, so the whole src/prototypes/ tree is dead-code-eliminated and no
 * chunk is emitted. See src/prototypes/README.md.
 */
if (import.meta.env.DEV && window.location.hash.startsWith('#/prototypes')) {
  void Promise.all([
    import('./prototypes/PrototypesApp'),
    import('./intl').then(({ initialiseLocale, detectLocale }) =>
      initialiseLocale(detectLocale())
    ),
  ]).then(([{ PrototypesApp }]) => {
    render(() => <PrototypesApp />, root);
  });
} else if (import.meta.env.DEV && window.location.hash.startsWith('#/showcase')) {
  // Library components resolve their strings through the reactive t(), so load
  // the locale dictionary first — same as the app's startup — to avoid a flash
  // of raw keys. (Showcase section labels are literal, not keys; see
  // ShowcaseApp's nav model.)
  void Promise.all([
    import('./ui-showcase/ShowcaseApp'),
    import('./intl').then(({ initialiseLocale, detectLocale }) =>
      initialiseLocale(detectLocale())
    ),
  ]).then(([{ ShowcaseApp }]) => {
    render(() => <ShowcaseApp />, root);
  });
} else {
  render(() => <App />, root);
}

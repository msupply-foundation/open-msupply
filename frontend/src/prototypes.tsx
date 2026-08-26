/* @refresh reload */
import { render } from 'solid-js/web';
import './index.css';
import { PrototypesApp } from './prototypes/PrototypesApp';
import { detectLocale, initialiseLocale } from './intl';

const root = document.getElementById('root')!;

/*
 * Entry for the STANDALONE prototypes build (prototypes.html →
 * vite.prototypes.config.ts, `pnpm build:prototypes`): the dev-only
 * #/prototypes branch of index.tsx made unconditional — no app, no auth, no
 * backend. As there, the locale dictionary loads before first render so library
 * components never flash raw keys; the imports are static because here the
 * prototypes area IS the bundle — nothing to code-split away from.
 *
 * Mirrors src/showcase.tsx exactly; the two areas are siblings and neither
 * imports from the other (see src/prototypes/README.md).
 */
void initialiseLocale(detectLocale()).then(() => {
  render(() => <PrototypesApp />, root);
});

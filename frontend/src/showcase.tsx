/* @refresh reload */
import { render } from 'solid-js/web';
import './index.css';
import { ShowcaseApp } from './ui-showcase/ShowcaseApp';
import { detectLocale, initialiseLocale } from './intl';

const root = document.getElementById('root')!;

/*
 * Entry for the STANDALONE showcase build (showcase.html →
 * vite.showcase.config.ts, `pnpm build:showcase`): the dev-only #/showcase
 * branch of index.tsx made unconditional — no app, no auth, no backend. As
 * there, the locale dictionary loads before first render so library
 * components never flash raw keys; the imports are static because here the
 * showcase IS the bundle — nothing to code-split away from.
 */
void initialiseLocale(detectLocale()).then(() => {
  render(() => <ShowcaseApp />, root);
});

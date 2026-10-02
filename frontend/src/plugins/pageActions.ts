/*
 * A plugin page's header ACTIONS — the host side of the SDK's `usePageActions`
 * (sdk-contract § the page contribution › rendering). The host owns the page
 * frame and its header; a page hands its action cluster here and the frame
 * renders it top-end, where every host page's actions sit. One signal: one
 * plugin page is on screen at a time.
 */
import { createSignal, type JSX } from 'solid-js';

const [pageActions, setPageActions] = createSignal<
  (() => JSX.Element) | undefined
>();

export { pageActions, setPageActions };

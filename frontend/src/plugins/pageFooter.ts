/*
 * A plugin page's pinned action FOOTER — the host side of the SDK's
 * `usePageFooter` (sdk-contract § the page contribution › rendering). The host
 * owns the page frame and its footer region; a page hands its action bar here
 * and the frame pins it below the scrolling body, where every host detail
 * screen's actions sit. One signal: one plugin page is on screen at a time.
 */
import { createSignal, type JSX } from 'solid-js';

const [pageFooter, setPageFooter] = createSignal<
  (() => JSX.Element) | undefined
>();

export { pageFooter, setPageFooter };

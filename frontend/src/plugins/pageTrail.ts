/*
 * A plugin page's breadcrumb TRAIL below its own crumb — the host side of the
 * SDK's `usePageTrail` (sdk-contract § the page contribution › rendering).
 * The host owns the page frame and its breadcrumb; a page that interprets
 * paths below its own (a record screen under a list) names the record here,
 * and the frame renders the page's crumb as the parent link and these after
 * it. One signal: one plugin page is on screen at a time.
 */
import { createSignal } from 'solid-js';

export interface PageTrailCrumb {
  /** Already translated. */
  label: string;
  /** A store-relative path for an ancestor crumb; the last crumb needs none. */
  path?: string;
}

const [pageTrail, setPageTrail] = createSignal<readonly PageTrailCrumb[]>([]);

export { pageTrail, setPageTrail };

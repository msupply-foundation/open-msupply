import { For, Show } from 'solid-js';
import { smoothScrollOptions } from '@/ui/utils/createMediaQuery';
import type { PageMetadata } from '../metadata';
import styles from './SectionTOC.module.css';

/*
 * A page's Table of Contents — a wrapping list of anchor links to that page's
 * key sections, rendered at the top of a standard showcase page. It iterates
 * the page's `PageMetadata.items`; each link scrolls to the matching card `id`.
 *
 * Scroll, not navigate: the showcase is hash-routed (#/showcase/<section>), so
 * a real `#<id>` href would overwrite the route and bounce back to the first
 * section. Each link therefore keeps its href for affordance (hover, copy)
 * but preventDefaults the click and scrolls by id, leaving the route intact.
 *
 * Hidden below two entries — a one-row TOC is noise (single-card pages still
 * export their metadata for Search, they just don't render this).
 *
 * Demo chrome, not a library component: it reads the showcase's own metadata
 * shape and no real app page ships a per-page TOC, so it lives here in
 * common/, not in src/ui (see README.md § common/).
 */
export const SectionTOC = (props: { page: PageMetadata }) => (
  <Show when={props.page.items.length >= 2}>
    <nav class={styles.toc} aria-label="On this page">
      <span class={styles.heading}>On this page</span>
      <ul class={styles.list}>
        <For each={props.page.items}>
          {item => (
            <li>
              <a
                class={styles.link}
                href={`#${item.id}`}
                onClick={event => {
                  event.preventDefault();
                  scrollToAnchor(item.id);
                }}
              >
                {item.title}
              </a>
            </li>
          )}
        </For>
      </ul>
    </nav>
  </Show>
);

// Scroll the anchored card into view, honouring reduced motion (the shared
// helper drops `smooth` back to an instant jump). No-op if the id isn't on the
// page (a metadata/DOM mismatch) rather than throwing.
const scrollToAnchor = (id: string): void => {
  const target = document.getElementById(id);
  if (!target) return;
  target.scrollIntoView(smoothScrollOptions({ block: 'start' }));
};

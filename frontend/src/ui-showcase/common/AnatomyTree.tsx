import { For, Show, type JSX } from 'solid-js';
import styles from './AnatomyTree.module.css';

export type AnatomyNode = {
  /** The element's name, shown as a code chip. */
  name: string;
  /** What this node owns — one clause, shown after the name. */
  note?: JSX.Element;
  children?: AnatomyNode[];
};

const Level = (props: { nodes: AnatomyNode[] }) => (
  <ul class={styles.level}>
    <For each={props.nodes}>
      {node => (
        <li class={styles.node}>
          <span class={styles.name}>{node.name}</span>
          <Show when={node.note}>
            <span class={styles.note}> — {node.note}</span>
          </Show>
          <Show when={node.children?.length}>
            <Level nodes={node.children!} />
          </Show>
        </li>
      )}
    </For>
  </ul>
);

/**
 * The nesting diagram at the top of an anatomy page: which element sits
 * inside which, with a one-clause note on what each owns. Explanatory chrome
 * around the demos (same class as Intro/Lead), rendered as nested lists so
 * the hierarchy is real semantics, not ASCII art.
 */
export const AnatomyTree = (props: { nodes: AnatomyNode[] }) => (
  <figure class={styles.tree}>
    <Level nodes={props.nodes} />
  </figure>
);

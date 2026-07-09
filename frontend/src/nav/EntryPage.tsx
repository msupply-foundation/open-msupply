import type { Component } from 'solid-js';

// A placeholder page for a nav destination — empty for now, labelled so it is
// obvious which entry rendered. A sub-heading (h2), below the store-name h1 the
// shell renders.
export const EntryPage: Component<{ label: string }> = props => (
  <section>
    <h2>{props.label}</h2>
    <p>Nothing here yet.</p>
  </section>
);

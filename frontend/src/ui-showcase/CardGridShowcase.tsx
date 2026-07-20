import { For, type JSX } from 'solid-js';
import { CardGrid } from '../ui/layout/CardGrid/CardGrid';
import styles from './CardGridShowcase.module.css';

const Card = (props: {
  title: string;
  lead: JSX.Element;
  children: JSX.Element;
}) => (
  <section class={styles.card}>
    <header class={styles.cardHeader}>{props.title}</header>
    <div class={styles.cardBody}>
      <p class={styles.lead}>{props.lead}</p>
      {props.children}
    </div>
  </section>
);

// Generic placeholder "cards" — plain coloured blocks so it's the grid's own
// wrapping/reflow on show, not any particular card content.
const blocks = [1, 2, 3, 4, 5, 6];

const Block = (props: { n: number }) => (
  <div class={styles.block}>{props.n}</div>
);

/*
 * Storybook of the CardGrid layout element: a bare intrinsic `auto-fit` grid
 * (ui-standards § Layout) that fits as many equal columns of at least
 * `minColumnWidth` as the width allows and wraps the rest — no breakpoint maths
 * (principle #7). Shown here with plain coloured blocks standing in for cards so
 * the grid's reflow is what's on display; resize the panel to watch columns
 * add/drop and the blocks wrap. (Its first real consumer, the dashboard, is
 * demoed under Statistics laying out DashboardCards.)
 */
export const CardGridShowcase = () => (
  <div class={styles.stack}>
    <Card
      title="CardGrid — responsive intrinsic grid (default 20rem columns)"
      lead={
        <>
          <code>repeat(auto-fit, minmax(min(minColumnWidth, 100%), 1fr))</code>{' '}
          — fits as many equal columns of at least <code>minColumnWidth</code>{' '}
          (default <code>20rem</code>) as the available width allows and wraps
          the rest, with <em>no breakpoint maths</em> (principle #7,
          intrinsic-first). Resize the panel to watch it flow from several
          columns down to one.
        </>
      }
    >
      <CardGrid>
        <For each={blocks}>{n => <Block n={n} />}</For>
      </CardGrid>
    </Card>

    <Card
      title="CardGrid — narrower columns via minColumnWidth"
      lead={
        <>
          The one knob is <code>minColumnWidth</code> (any CSS length). Here
          it's <code>10rem</code>, so more, narrower columns pack in before the
          grid wraps.
        </>
      }
    >
      <CardGrid minColumnWidth="10rem">
        <For each={blocks}>{n => <Block n={n} />}</For>
      </CardGrid>
    </Card>
  </div>
);

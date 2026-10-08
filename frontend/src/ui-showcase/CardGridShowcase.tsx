import { For } from 'solid-js';
import { ContentContainer } from '../ui/layout/ContentContainer/ContentContainer';
import { Stack } from '../ui/layout/Stack/Stack';
import { DashboardCard } from '../ui/elements/dashboard/DashboardCard';
import { CardGrid } from '../ui/layout/CardGrid/CardGrid';
import { Lead, SectionTOC } from './common';
import type { PageMetadata } from './metadata';
import styles from './CardGridShowcase.module.css';

// Generic placeholder "cards" — plain coloured blocks so it's the grid's own
// wrapping/reflow on show, not any particular card content.
const blocks = [1, 2, 3, 4, 5, 6];

const Block = (props: { n: number }) => (
  <div class={styles.block}>{props.n}</div>
);

/*
 * Storybook of the CardGrid layout element: a bare intrinsic `auto-fit` grid
 * (ui-standards § Layout) that fits as many equal columns of at least
 * `minColumnWidth` as the width allows and wraps the rest — no breakpoint
 * maths (principle #7). Shown here with plain coloured blocks standing in for
 * cards so the grid's reflow is what's on display; resize the panel to watch
 * columns add/drop and the blocks wrap. The third example is the knob for a
 * VARIABLE item count — capping the card rather than the column, so a grid
 * left holding one card still shows a card. (Its first real consumer, the
 * dashboard, is demoed under Statistics laying out DashboardCards.)
 */
export const cardGridMetadata: PageMetadata = {
  id: 'card-grid',
  title: 'Card grid',
  searchTerms: ['grid', 'layout', 'responsive'],
  items: [
    {
      id: 'card-grid-default',
      title: 'Default columns',
      searchTerms: ['intrinsic', 'twenty rem', 'responsive'],
    },
    {
      id: 'card-grid-narrow',
      title: 'Narrower columns',
      searchTerms: ['min column width', 'dense', 'small'],
    },
    {
      id: 'card-grid-item-cap',
      title: 'Capped card width',
      searchTerms: ['max item width', 'variable count', 'one card', 'sprawl'],
    },
  ],
};

export const CardGridShowcase = () => (
  <ContentContainer size="form">
    <Stack gap="lg">
      <SectionTOC page={cardGridMetadata} />
      <DashboardCard
        id="card-grid-default"
        title="CardGrid — responsive intrinsic grid (default 20rem columns)"
      >
        <Lead>
          <code>repeat(auto-fit, minmax(min(minColumnWidth, 100%), 1fr))</code>{' '}
          — fits as many equal columns of at least <code>minColumnWidth</code>{' '}
          (default <code>20rem</code>) as the available width allows and wraps
          the rest, with <em>no breakpoint maths</em> (principle #7,
          intrinsic-first). Resize the panel to watch it flow from several
          columns down to one.
        </Lead>
        <CardGrid>
          <For each={blocks}>{n => <Block n={n} />}</For>
        </CardGrid>
      </DashboardCard>

      <DashboardCard
        id="card-grid-narrow"
        title="CardGrid — narrower columns via minColumnWidth"
      >
        <Lead>
          The one knob is <code>minColumnWidth</code> (any CSS length). Here
          it's <code>10rem</code>, so more, narrower columns pack in before the
          grid wraps.
        </Lead>
        <CardGrid minColumnWidth="10rem">
          <For each={blocks}>{n => <Block n={n} />}</For>
        </CardGrid>
      </DashboardCard>

      <DashboardCard
        id="card-grid-item-cap"
        title="CardGrid — capped card width via maxItemWidth"
      >
        <Lead>
          For a grid whose item count varies at runtime — the dashboard, whose
          widgets depend on the store's preferences and the user's permissions.
          A <code>1fr</code> column hands its whole share to the only card in
          it, so one card would stretch the full width and read as a banner;{' '}
          <code>maxItemWidth</code> caps the card inside its column instead, so
          it looks the same however many siblings it has. Cap the{' '}
          <em>column</em> (<code>maxColumnWidth</code>) and you change how many
          columns fit; cap the <em>item</em> and you don't.
        </Lead>
        <CardGrid maxItemWidth="12rem">
          <Block n={1} />
        </CardGrid>
        <CardGrid maxItemWidth="12rem">
          <For each={blocks}>{n => <Block n={n} />}</For>
        </CardGrid>
      </DashboardCard>
    </Stack>
  </ContentContainer>
);

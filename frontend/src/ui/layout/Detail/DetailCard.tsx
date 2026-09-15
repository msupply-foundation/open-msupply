import { children, Show, type JSX } from 'solid-js';
import styles from './DetailCard.module.css';

export interface DetailCardProps {
  /** The card's title — its heading text and accessible name. */
  title: string;
  /** Header-end actions (e.g. Edit/Delete IconButtons). */
  actions?: JSX.Element;
  /** The card body — arbitrary content (DetailSection/DetailRow, tables,
   *  sub-headings). No layout is imposed; the caller composes it. */
  children: JSX.Element;
  /**
   * Surface treatment. `raised` (default) is the shadowed card, for a few
   * cards standing apart on the page. `bordered` trades the shadow for a
   * hairline — for a long, uniform run of them (a record's history down a
   * timeline), where a shadow per card stacks into visual noise and the
   * separation only needs stating once per edge.
   */
  surface?: 'raised' | 'bordered';
}

/*
 * DetailCard — a titled card with header actions, for when several records of
 * the same kind are stacked as cards rather than one page being the whole
 * detail view (spec/ui-standards/components.md § Detail views). Extends the
 * DetailContainer/DetailSection/DetailRow/RecordNameHeader family with the one
 * shape it doesn't cover: a miniature detail view per record, each with its
 * own Edit/Delete-style actions in the header. Reuses the card-surface tokens
 * DashboardCard/WidgetCard already established (surface-raised, radius-lg, a
 * light shadow) rather than inventing new ones. Presentational only — the
 * caller owns the data, the actions' handlers, and the body's composition.
 * Lives inside a CardGrid when several are stacked.
 */
export const DetailCard = (props: DetailCardProps): JSX.Element => {
  // `actions` is a lazy JSX getter read in both the <Show> test and the
  // insertion — resolve once so it isn't instantiated twice
  // (kdd/solid-reactivity-pitfalls §3).
  const actions = children(() => props.actions);
  return (
    <section class={styles.card} data-surface={props.surface ?? 'raised'}>
      <div class={styles.header}>
        <h2 class={styles.title}>{props.title}</h2>
        <Show when={actions()}>
          <div class={styles.actions}>{actions()}</div>
        </Show>
      </div>
      <div class={styles.body}>{props.children}</div>
    </section>
  );
};

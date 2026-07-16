import type { JSX } from 'solid-js';
import { InsetPanel } from '../ui/layout/InsetPanel/InsetPanel';
import { FieldRow } from '../ui/elements/inputs/FieldRow';
import { TextField } from '../ui/elements/inputs/TextField';
import styles from './InsetPanelShowcase.module.css';

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

/*
 * Storybook of the InsetPanel layout element: a recessed grey panel that
 * groups related controls with an optional muted hint line. Pure
 * layout/grouping — no interaction or a11y contract — so it lives with the
 * layout elements, not the inputs (the controls it wraps keep their own look).
 * Demoed with the FieldRow + TextField rows it pairs with inside the
 * create-stocktake modal.
 */
export const InsetPanelShowcase = () => (
  <div class={styles.stack}>
    <Card
      title="Inset panel — recessed grouping"
      lead={
        <>
          A recessed grey panel that groups related controls, with an optional
          muted <code>hint</code> line at the top — the app's "extra options"
          area inside a dialog (the create-stocktake include-all / filter
          block). Hand-rolled, pure CSS + tokens: no interaction or a11y
          contract to buy, just a tinted rounded container. Pairs with{' '}
          <code>FieldRow</code>.
        </>
      }
    >
      <div class={styles.formPreview}>
        <InsetPanel hint="Counts items matching the filters below.">
          <FieldRow label="Master list">
            <TextField label="Master list" hideLabel placeholder="Any" />
          </FieldRow>
          <FieldRow label="Location">
            <TextField label="Location" hideLabel placeholder="Any" />
          </FieldRow>
        </InsetPanel>
      </div>
    </Card>
  </div>
);

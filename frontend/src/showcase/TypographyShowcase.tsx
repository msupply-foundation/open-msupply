import { For, type JSX } from 'solid-js'
import { Text, type TextVariant } from '../components/ui/Text'
import styles from './TypographyShowcase.module.css'

const Card = (props: {
  title: string
  lead: JSX.Element
  children: JSX.Element
}) => (
  <section class={styles.card}>
    <header class={styles.cardHeader}>{props.title}</header>
    <div class={styles.cardBody}>
      <p class={styles.lead}>{props.lead}</p>
      {props.children}
    </div>
  </section>
)

/* The four variants, largest → smallest, each with its spec. */
const VARIANTS: {
  variant: TextVariant
  sample: string
  meta: string
}[] = [
  {
    variant: 'heading',
    sample: 'Outbound shipment details',
    meta: 'heading · --text-md (1rem) · bold · renders <h2>, rank via level',
  },
  {
    variant: 'subtitle',
    sample: 'A subtitle sitting under a title',
    meta: 'subtitle · 1.2em (relative to context) · regular',
  },
  {
    variant: 'body',
    sample:
      'Body copy is the default — the workhorse for prose, descriptions and the main line of a cell.',
    meta: 'body · --text-sm (0.875rem) · regular · renders <p>',
  },
  {
    variant: 'bodySmall',
    sample: 'Small print, captions and the subtext line beneath a value.',
    meta: 'bodySmall · --text-xs (0.75rem) · medium · renders <p>',
  },
]

export const TypographyShowcase = () => (
  <div class={styles.stack}>
    <Card
      title="The four variants"
      lead={
        <>
          <code>&lt;Text&gt;</code> carries the app's whole type scale — a Solid
          port of the current app's MUI <code>body1</code> / <code>body2</code> /{' '}
          <code>h6</code> / <code>subtitle1</code>. Each variant is a type style
          only: <strong>size + line-height + weight</strong>, and{' '}
          <strong>never colour</strong>. Weights come straight from what the
          showcase already uses — body is regular (400), headings bold (700).
        </>
      }
    >
      <dl class={styles.specimens}>
        <For each={VARIANTS}>
          {(row) => (
            <div class={styles.specimen}>
              <dt class={styles.sampleCell}>
                <Text variant={row.variant}>{row.sample}</Text>
              </dt>
              <dd class={styles.meta}>{row.meta}</dd>
            </div>
          )}
        </For>
      </dl>
    </Card>

    <Card
      title="When to reach for it"
      lead={
        <>
          The trigger is <strong>one fixed text role vs. a variable arrangement
          of text blocks</strong> — not "is it in a page". Use <code>&lt;Text&gt;</code>{' '}
          where an area <em>composes</em> several text blocks; leave a single
          intrinsic role to the component that owns it.
        </>
      }
    >
      <div class={styles.twoCol}>
        <div class={styles.doCol}>
          <p class={styles.colHead}>Use &lt;Text&gt;</p>
          <ul class={styles.list}>
            <li>
              A <strong>SidePanel</strong> stacking a heading + body + captions —
              the panel owns the layout, <code>&lt;Text&gt;</code> the type.
            </li>
            <li>
              A <strong>table cell</strong> with a main value and a subtext line
              (the archetypal consumer — see the next card).
            </li>
            <li>
              Any content region assembling a <em>mix</em> of text sizes/roles.
            </li>
          </ul>
        </div>
        <div class={styles.dontCol}>
          <p class={styles.colHead}>Don't — component owns it</p>
          <ul class={styles.list}>
            <li>
              A <strong>Button</strong> label, a <strong>TextField</strong>{' '}
              label/helper — one fixed role, styled by its own CSS.
            </li>
            <li>
              A <strong>table header</strong> (<code>th</code>) — the table
              styles it; the cell takes <em>raw text</em>, not a wrapper.
            </li>
            <li>
              Anywhere wrapping in <code>&lt;Text&gt;</code> would just
              double-style and add a node.
            </li>
          </ul>
        </div>
      </div>
    </Card>

    <Card
      title="Colour comes from the container"
      lead={
        <>
          <code>&lt;Text&gt;</code> sets <em>no</em> colour — <code>color: inherit</code>.
          So the subtext below is muted because the <strong>cell</strong> sets{' '}
          <code>color: var(--text-secondary)</code> on that line, not because a
          variant is colour-locked. Colour stays with the context that owns the
          contrast and meaning.
        </>
      }
    >
      <div class={styles.cell}>
        <Text variant="body">Amoxicillin 250mg capsules</Text>
        <Text variant="bodySmall" class={styles.subtext}>
          AMX-250 · 500 packs in stock
        </Text>
      </div>
    </Card>

    <Card
      title="Headings: size ≠ rank"
      lead={
        <>
          <code>variant</code> sets the visual size; <code>level</code> sets the
          document rank. Both lines below use <code>variant="heading"</code> so
          they look identical, but render at different ranks so the outline stays
          correct — the size never dictates the heading level.
        </>
      }
    >
      <div class={styles.headingStack}>
        <div class={styles.headingRow}>
          <Text variant="heading" level={2}>
            Section heading
          </Text>
          <span class={styles.meta}>renders &lt;h2&gt;</span>
        </div>
        <div class={styles.headingRow}>
          <Text variant="heading" level={3}>
            Subsection heading
          </Text>
          <span class={styles.meta}>renders &lt;h3&gt;</span>
        </div>
      </div>
    </Card>
  </div>
)

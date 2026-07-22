import { For } from 'solid-js';
import { Text, type TextVariant } from '../ui/elements/typography/Text';
import { ContentContainer } from '../ui/layout/ContentContainer/ContentContainer';
import { Stack } from '../ui/layout/Stack/Stack';
import { DashboardCard } from '../ui/elements/dashboard/DashboardCard';
import { Lead } from './common';
import styles from './TypographyShowcase.module.css';

/*
 * The three root-relative variants, largest → smallest. `subtitle` is left out
 * on purpose — it sizes relative to its title, so it gets its own paired demo
 * below rather than a misleading standalone row at the body base.
 */
const VARIANTS: {
  variant: TextVariant;
  sample: string;
  meta: string;
}[] = [
  {
    variant: 'heading',
    sample: 'Outbound shipment details',
    meta: 'heading · --text-md (1rem) · bold · renders <h2>, rank via level',
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
];

export const TypographyShowcase = () => (
  <ContentContainer size="form">
    <Stack gap="lg">
      <DashboardCard title="The type scale">
        <Lead>
          <code>&lt;Text&gt;</code> carries the app's whole type scale — a Solid
          port of the current app's MUI <code>body1</code> / <code>body2</code>{' '}
          / <code>h6</code> / <code>subtitle1</code>. Each variant is a type
          style only: <strong>size + line-height + weight</strong>, and{' '}
          <strong>never colour</strong>. Weights come straight from what the
          showcase already uses — body is regular (400), headings bold (700).
          The three root-relative variants are below; <code>subtitle</code> is
          contextual and gets its own demo next.
        </Lead>
        <dl class={styles.specimens}>
          <For each={VARIANTS}>
            {row => (
              <div class={styles.specimen}>
                <dt class={styles.sampleCell}>
                  <Text variant={row.variant}>{row.sample}</Text>
                </dt>
                <dd class={styles.meta}>{row.meta}</dd>
              </div>
            )}
          </For>
        </dl>
      </DashboardCard>

      <DashboardCard title="Subtitle pairs with a title">
        <Lead>
          <code>subtitle</code> is a deck that sits under a title — a fixed step
          smaller than the heading (<code>--text-sm</code>) and semibold (600),
          matching the source app, which overrides <code>subtitle1</code> to 600
          nearly everywhere. It's a plain rem step, not <code>em</code>: an{' '}
          <code>em</code> can't track a sibling title, and the scale is flat, so
          relative sizing bought nothing. To scale a pair as a unit, wrap them.
        </Lead>
        <div class={styles.titleBlock}>
          <Text variant="heading" level={2}>
            Outbound shipment SH-0004
          </Text>
          <Text variant="subtitle">
            Buka Health Centre · created 12 Jun 2026
          </Text>
        </div>
      </DashboardCard>

      <DashboardCard title="When to reach for it">
        <Lead>
          The trigger is{' '}
          <strong>
            one fixed text role vs. a variable arrangement of text blocks
          </strong>{' '}
          — not "is it in a page". Use <code>&lt;Text&gt;</code> where an area{' '}
          <em>composes</em> several text blocks; leave a single intrinsic role
          to the component that owns it.
        </Lead>
        <div class={styles.twoCol}>
          <div class={styles.doCol}>
            <p class={styles.colHead}>Use &lt;Text&gt;</p>
            <ul class={styles.list}>
              <li>
                A <strong>SidePanel</strong> stacking a heading + body +
                captions — the panel owns the layout, <code>&lt;Text&gt;</code>{' '}
                the type.
              </li>
              <li>
                A <strong>table cell</strong> with a main value and a subtext
                line (the archetypal consumer — see the next card).
              </li>
              <li>
                Any content region assembling a <em>mix</em> of text
                sizes/roles.
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
      </DashboardCard>

      <DashboardCard title="Colour comes from the container">
        <Lead>
          <code>&lt;Text&gt;</code> sets <em>no</em> colour —{' '}
          <code>color: inherit</code>. So the subtext below is muted because the{' '}
          <strong>cell</strong> sets <code>color: var(--text-secondary)</code>{' '}
          on that line, not because a variant is colour-locked. Colour stays
          with the context that owns the contrast and meaning.
        </Lead>
        <div class={styles.cell}>
          <Text variant="body">Amoxicillin 250mg capsules</Text>
          <Text variant="bodySmall" class={styles.subtext}>
            AMX-250 · 500 packs in stock
          </Text>
        </div>
      </DashboardCard>

      <DashboardCard title="Headings: size ≠ rank">
        <Lead>
          <code>variant</code> sets the visual size; <code>level</code> sets the
          document rank. Both lines below use <code>variant="heading"</code> so
          they look identical, but render at different ranks so the outline
          stays correct — the size never dictates the heading level.
        </Lead>
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
      </DashboardCard>
    </Stack>
  </ContentContainer>
);

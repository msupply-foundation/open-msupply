import { For } from 'solid-js';
import { MemoryRouter, Route } from '@solidjs/router';
import { Text, type TextVariant } from '../ui/elements/typography/Text';
import { RecordLink } from '../ui/elements/typography/RecordLink';
import { ContentContainer } from '../ui/layout/ContentContainer/ContentContainer';
import { Stack } from '../ui/layout/Stack/Stack';
import { DashboardCard } from '../ui/elements/dashboard/DashboardCard';
import { Lead, SectionTOC } from './common';
import type { PageMetadata } from './metadata';
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

/*
 * Monospace specimens — the `mono` prop composed with a size variant. Colour is
 * the container's (via .sampleCell) exactly as the spec wants for codes: "mono,
 * slightly smaller, secondary colour" — the size/colour are contextual, `mono`
 * only swaps the family.
 */
const MONO: { variant: TextVariant; sample: string; meta: string }[] = [
  {
    variant: 'body',
    sample: 'AMOX-500-CAP',
    meta: 'item code · mono · body size',
  },
  {
    variant: 'bodySmall',
    sample: 'B2467-594',
    meta: 'batch · mono · bodySmall (slightly smaller, per spec)',
  },
  {
    variant: 'bodySmall',
    sample: 'A.03.2 — 0O 1lI',
    meta: 'location ID · mono · disambiguates 0/O and 1/l/I',
  },
];

export const typographyMetadata: PageMetadata = {
  id: 'typography',
  title: 'Typography',
  searchTerms: ['font', 'text'],
  items: [
    {
      id: 'typography-scale',
      title: 'Type scale',
      searchTerms: ['size', 'hierarchy', 'heading'],
    },
    {
      id: 'typography-monospace',
      title: 'Monospace',
      searchTerms: ['code', 'batch', 'id', 'mono', 'fixed-width'],
    },
    {
      id: 'typography-titles',
      title: 'Titles & subtitles',
      searchTerms: ['subtitle', 'caption', 'label'],
    },
    {
      id: 'typography-colour',
      title: 'Colour',
      searchTerms: ['color', 'tone', 'inherit'],
    },
    {
      id: 'typography-headings',
      title: 'Headings & rank',
      searchTerms: ['h1', 'h2', 'semantic'],
    },
    {
      id: 'typography-record-link',
      title: 'RecordLink',
      searchTerms: ['link', 'related', 'record', 'kind', 'tone', 'po', 'io'],
    },
  ],
};

export const TypographyShowcase = () => (
  <ContentContainer size="form" align="start">
    <Stack gap="lg">
      <SectionTOC page={typographyMetadata} />
      <DashboardCard id="typography-scale" title="The type scale">
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

      <DashboardCard
        id="typography-monospace"
        title="Monospace — codes, batches & IDs"
      >
        <Lead>
          Codes, batches, location IDs and dense identifiers render in the{' '}
          <strong>monospace</strong> family (<code>--font-mono</code>:{' '}
          <code>'Monaco', 'Courier New', monospace</code> — ui-standards ›
          typography): fixed-width glyphs align in columns and disambiguate 0/O
          and 1/l/I. Add <code>mono</code> to any <code>&lt;Text&gt;</code> — a
          family swap only, orthogonal to <code>variant</code> (compose with{' '}
          <code>bodySmall</code> for the spec's slightly-smaller code), and it
          still takes its colour from the container. The same token drives table{' '}
          <code>data-mono</code> cells (Code, Batch), where it'll see the most
          use.
        </Lead>
        <dl class={styles.specimens}>
          <For each={MONO}>
            {row => (
              <div class={styles.specimen}>
                <dt class={styles.sampleCell}>
                  <Text variant={row.variant} mono>
                    {row.sample}
                  </Text>
                </dt>
                <dd class={styles.meta}>{row.meta}</dd>
              </div>
            )}
          </For>
        </dl>
      </DashboardCard>

      <DashboardCard id="typography-titles" title="Subtitle pairs with a title">
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

      <DashboardCard
        id="typography-colour"
        title="Colour comes from the container"
      >
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

      <DashboardCard id="typography-headings" title="Headings: size ≠ rank">
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

      <DashboardCard
        id="typography-record-link"
        title="RecordLink — a kind-toned link to a related record"
      >
        <Lead>
          A link to another record in the system (a purchase order, internal
          order, requisition, shipment…). It is a router <code>&lt;A&gt;</code>;
          what it adds is a <code>kind</code> → tone mapping — so a reader
          learns "blue = purchase order, orange = internal order" app-wide — a
          consistent medium weight, and the guarantee that colour is a{' '}
          <em>redundant</em> cue (the kind sits in the label text:{' '}
          <code>PO-</code>, <code>IO-</code>, <code>#</code>). Omit{' '}
          <code>kind</code> for a neutral reference.
        </Lead>
        {/* MemoryRouter: the router's <A> needs a router context to render;
            here it resolves and is clickable but navigates nowhere (the
            standalone showcase has no app router) — same as the Statistics
            page's linked stats. */}
        <MemoryRouter>
          <Route
            path="*"
            component={() => (
              <div class={styles.headingStack}>
                <div class={styles.headingRow}>
                  <RecordLink href="/demo" kind="po">
                    PO-011
                  </RecordLink>
                  <span class={styles.meta}>
                    kind="po" · purchase order · secondary (blue)
                  </span>
                </div>
                <div class={styles.headingRow}>
                  <RecordLink href="/demo" kind="io">
                    IO-095
                  </RecordLink>
                  <span class={styles.meta}>
                    kind="io" · internal order / requisition · primary (orange)
                  </span>
                </div>
                <div class={styles.headingRow}>
                  <RecordLink href="/demo">#1234</RecordLink>
                  <span class={styles.meta}>
                    no kind · neutral reference (e.g. a linked shipment)
                  </span>
                </div>
              </div>
            )}
          />
        </MemoryRouter>
      </DashboardCard>
    </Stack>
  </ContentContainer>
);

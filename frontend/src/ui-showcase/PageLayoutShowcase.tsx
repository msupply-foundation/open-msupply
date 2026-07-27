import { ContentContainer } from '../ui/layout/ContentContainer/ContentContainer';
import { Stack } from '../ui/layout/Stack/Stack';
import { DashboardCard } from '../ui/elements/dashboard/DashboardCard';
import { Header } from '../ui/layout/Header/Header';
import { Breadcrumb } from '../ui/layout/Header/Breadcrumb';
import { HeaderButtons } from '../ui/layout/Header/HeaderButtons';
import { ContentFooter } from '../ui/layout/ContentFooter/ContentFooter';
import { ContentFooterActions } from '../ui/layout/ContentFooter/ContentFooterActions';
import { Button } from '../ui/elements/buttons/Button';
import {
  CancelButton,
  SaveButton,
} from '../ui/elements/buttons/StandardButtons';
import { ClockIcon, PlusCircleIcon, TruckIcon } from '../ui/icons';
import {
  AnatomyTree,
  Intro,
  Lead,
  PageFrame,
  Row,
  SectionTOC,
  type AnatomyNode,
} from './common';
import type { PageMetadata } from './metadata';
import styles from './PageLayoutShowcase.module.css';

/* The general page vocabulary, rendered as the figure under the intro — the
 * regions the Page frame pins, and the measure/rhythm pair every body opts
 * into. The Form layout page nests its form-specific tree under the same
 * ContentContainer → Stack layers. */
const ANATOMY: AnatomyNode[] = [
  {
    name: 'Page',
    note: 'the frame: pins the chrome, scrolls the body — geometry only',
    children: [
      {
        name: 'Header',
        note: 'breadcrumb h1 + actions + HeaderToolbar field row + tabs — see Header',
      },
      {
        name: 'ContentContainer',
        note: 'the content measure — caps, then centres or hugs start',
        children: [
          {
            name: 'Stack',
            note: 'vertical rhythm between the sibling blocks',
            children: [
              {
                name: 'blocks',
                note: "cards, tables, form columns — the page's own content",
              },
            ],
          },
        ],
      },
      {
        name: 'SidePanel',
        note: 'the docked details column — see Side panel',
      },
      {
        name: 'ContentFooter',
        note: 'the pinned action bar — never scrolls; see Content footer',
      },
    ],
  },
];

/*
 * Anatomy page for the general page-composition vocabulary: what the Page
 * frame pins, and the measure/rhythm pair (ContentContainer + Stack) every
 * page body opts into. The Form layout page (#/showcase/form-layout) is the
 * specific case for record forms — its tree nests under the same outer
 * layers; the Pages group shows real assemblies.
 *
 * The page column runs on the `wide` measure and only the ContentContainer
 * card spans it; every other card sits in a nested `form`-width group —
 * deliberately, as a live demo of the measure being a per-group content
 * choice (blocks don't own a width; the container arranging them does).
 */
export const pageLayoutMetadata: PageMetadata = {
  id: 'page-layout',
  title: 'Page layout',
  searchTerms: ['layout', 'structure', 'regions'],
  items: [
    {
      id: 'page-layout-content-container',
      title: 'ContentContainer',
      searchTerms: ['measure', 'width', 'max width', 'centre'],
    },
    {
      id: 'page-layout-page',
      title: 'Page',
      searchTerms: ['regions', 'header', 'body', 'slots'],
    },
    {
      id: 'page-layout-stack',
      title: 'Stack',
      searchTerms: ['vertical', 'gap', 'rhythm', 'spacing'],
    },
    {
      id: 'page-layout-mixing',
      title: 'Mixing measures',
      searchTerms: ['nesting', 'breakout'],
    },
  ],
};

export const PageLayoutShowcase = () => (
  <ContentContainer size="wide" align="start">
    <Stack gap="lg">
      <SectionTOC page={pageLayoutMetadata} />
      <Intro>
        How a page composes, from the outside in: the <code>Page</code> frame
        owns the geometry — it pins the header and footer, docks the side panel,
        and scrolls the body — and the body opts into a{' '}
        <code>ContentContainer</code> measure with a <code>Stack</code> for
        rhythm. This page explains the general layers; the{' '}
        <a href="#/showcase/form-layout">Form layout page</a> covers the
        form-specific interior, and the Pages group (
        <a href="#/showcase/table">List page</a>,{' '}
        <a href="#/showcase/forms">Detail form</a>) shows real assemblies.
      </Intro>

      <AnatomyTree nodes={ANATOMY} />

      <DashboardCard
        id="page-layout-content-container"
        title="ContentContainer — the content measure"
      >
        <Lead>
          A reading column that caps how wide its content grows, so a form or
          block of prose stays readable on a wide monitor instead of sprawling
          edge to edge. It owns <em>only</em> <code>max-inline-size</code> +
          inline margins — no padding (the Page body owns edge padding), no
          styling of what's inside. Three caps: <code>prose</code> (40rem),{' '}
          <code>form</code> (58rem, the default), <code>wide</code> (80rem) —
          and two alignments: <code>center</code> (default, the reading-column
          convention) or <code>align="start"</code>, hugging the reading start
          edge for tool-like reference pages (every element page here uses it).
          This page's own column runs on <code>wide</code>: the bars below stop
          at their caps and centre, and every card below this one sits in a
          nested <code>form</code>-width group.
        </Lead>
        <Stack gap="sm">
          <ContentContainer size="prose">
            <div class={styles.stub}>prose · caps at 40rem</div>
          </ContentContainer>
          <ContentContainer size="form">
            <div class={styles.stub}>form · caps at 58rem</div>
          </ContentContainer>
          <ContentContainer size="wide">
            <div class={styles.stub}>wide · caps at 80rem</div>
          </ContentContainer>
        </Stack>
      </DashboardCard>

      <ContentContainer size="form" align="start">
        <Stack gap="lg">
          <DashboardCard
            id="page-layout-page"
            title="Page — the regions in miniature"
          >
            <Lead>
              The frame's three pinned regions around the scrolling body: a
              composed <a href="#/showcase/header">Header</a> on top, the body
              between, and a composed{' '}
              <a href="#/showcase/content-footer">ContentFooter</a> pinned below
              — the footer never scrolls, so the page's actions stay in reach
              however long the content. A page with a details panel docks it at
              the inline end via the <code>sidePanel</code> slot (
              <a href="#/showcase/side-panel">Side panel</a>), and a table page
              sets <code>fillBody</code> so the table manages its own scrolling.{' '}
              <code>Page</code> supplies geometry only — every region arrives as
              a composed child, handlers owned by the page.
            </Lead>
            <PageFrame>
              <Header>
                <Breadcrumb
                  icon={<TruckIcon />}
                  crumbs={[{ label: 'Outbound Shipments' }]}
                />
                <HeaderButtons>
                  <Button icon={<PlusCircleIcon />}>New shipment</Button>
                </HeaderButtons>
              </Header>
              <div class={styles.miniBody}>
                <div class={styles.stub}>
                  page content — scrolls between the pinned regions
                </div>
              </div>
              <ContentFooter>
                <Button variant="secondary" icon={<ClockIcon />}>
                  History
                </Button>
                <ContentFooterActions>
                  <CancelButton />
                  <SaveButton />
                </ContentFooterActions>
              </ContentFooter>
            </PageFrame>
          </DashboardCard>

          <DashboardCard
            id="page-layout-stack"
            title="Stack — vertical rhythm between sibling blocks"
          >
            <Lead>
              A vertical run of sibling blocks with a consistent gap — the space
              between a detail form's identity header, an alert, and its
              columns. <code>gap</code> is a <em>preset, not a length</em> —{' '}
              <code>sm</code>, <code>md</code> (the default), <code>lg</code> —
              so sibling blocks across the app keep the same few rhythms.
              Vertical <em>only</em>, by design: horizontal grouping always has
              a more semantic owner that also encodes its wrap behaviour (
              <code>FormRow</code>, <code>HeaderButtons</code>,{' '}
              <code>CardGrid</code>…).
            </Lead>
            <Row align="start">
              <Stack gap="sm">
                <div class={`${styles.stub} ${styles.rhythmStub}`}>
                  gap="sm"
                </div>
                <div class={`${styles.stub} ${styles.rhythmStub}`}>block</div>
                <div class={`${styles.stub} ${styles.rhythmStub}`}>block</div>
              </Stack>
              <Stack gap="md">
                <div class={`${styles.stub} ${styles.rhythmStub}`}>
                  gap="md" · default
                </div>
                <div class={`${styles.stub} ${styles.rhythmStub}`}>block</div>
                <div class={`${styles.stub} ${styles.rhythmStub}`}>block</div>
              </Stack>
              <Stack gap="lg">
                <div class={`${styles.stub} ${styles.rhythmStub}`}>
                  gap="lg"
                </div>
                <div class={`${styles.stub} ${styles.rhythmStub}`}>block</div>
                <div class={`${styles.stub} ${styles.rhythmStub}`}>block</div>
              </Stack>
            </Row>
          </DashboardCard>

          <DashboardCard
            id="page-layout-mixing"
            title="Mixing measures — nesting and breakout"
          >
            <Lead>
              The measure wraps content <em>groups</em>, not the page: a page
              holds as many containers as its content needs. Nest a narrower
              group inside a wider column when one section reads tighter —
              containers compose, the smaller cap wins — or place a block{' '}
              <em>beside</em> the container (never "escaping" it) when it needs
              the full panel, like the{' '}
              <a href="#/showcase/statistics">Statistics composition demo</a> or
              the <a href="#/showcase/buttons">Buttons grid</a>. This very page
              does both: the measure card above spans the <code>wide</code>{' '}
              column, and this card sits in a nested <code>form</code> group.
            </Lead>
            <Stack gap="sm">
              <div class={styles.stub}>full width of this card</div>
              <ContentContainer size="prose" align="start">
                <Stack gap="sm">
                  <div class={styles.stub}>
                    prose group nested inside — the smaller cap wins
                  </div>
                </Stack>
              </ContentContainer>
            </Stack>
          </DashboardCard>
        </Stack>
      </ContentContainer>
    </Stack>
  </ContentContainer>
);

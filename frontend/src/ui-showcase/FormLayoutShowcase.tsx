import { ContentContainer } from '../ui/layout/ContentContainer/ContentContainer';
import { Stack } from '../ui/layout/Stack/Stack';
import { IdentityHeader } from '../ui/layout/IdentityHeader/IdentityHeader';
import { DashboardCard } from '../ui/elements/dashboard/DashboardCard';
import { FormColumns } from '../ui/layout/Form/FormColumns';
import { FormColumn } from '../ui/layout/Form/FormColumn';
import { FormSection } from '../ui/layout/Form/FormSection';
import { FormRow } from '../ui/layout/Form/FormRow';
import { TextField } from '../ui/elements/inputs/TextField';
import {
  AnatomyTree,
  Col,
  FormPreview,
  Intro,
  Lead,
  Row,
  type AnatomyNode,
} from './common';
import styles from './FormLayoutShowcase.module.css';

/* The family's nesting order, rendered as the figure under the intro — one
 * node per element, noted with the single job it owns. */
const ANATOMY: AnatomyNode[] = [
  {
    name: 'Page',
    note: 'the normal Page frame — geometry only',
    children: [
      {
        name: 'ContentContainer',
        note: 'the reading-column measure — caps + centres',
        children: [
          {
            name: 'Stack',
            note: 'vertical rhythm between the sibling blocks',
            children: [
              {
                name: 'IdentityHeader',
                note: 'record name + muted subtitle',
              },
              {
                name: 'FormColumns',
                note: 'the row of section stacks — wraps to one column',
                children: [
                  {
                    name: 'FormColumn',
                    note: 'one vertical stack of sections',
                    children: [
                      {
                        name: 'FormSection',
                        note: 'a titled group: heading + rule + field stack',
                        children: [
                          {
                            name: 'field',
                            note: 'one per line at full width — the default',
                          },
                          {
                            name: 'FormRow',
                            note: 'the two-up rows — opt-in pairing',
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
];

/*
 * Anatomy page for the form-layout family (kdd/form-layout): one demo card
 * per element, top-down through the nesting order, each explaining the
 * element's single job in isolation. The assembled result — the family
 * composing a real stock detail form — is the Pages › Detail form demo
 * (#/showcase/forms); this page is where each layer is explained. Keep the
 * ANATOMY tree in step with that page's actual assembly.
 *
 * The page column runs on the `wide` measure and only the ContentContainer
 * card spans it; every other card sits in a nested `form`-width container —
 * deliberately, as a live demo of the measure being a content choice (cards
 * don't own a width; the container arranging them does).
 */
export const FormLayoutShowcase = () => (
  <ContentContainer size="wide">
    <Stack gap="lg">
      <Intro>
        The form-layout family is a set of pure-layout elements that arrange a
        record form: each owns one arrangement job and never styles the controls
        inside it. This page explains them one at a time, outermost first; the{' '}
        <a href="#/showcase/forms">Detail form page</a> shows them assembled.
      </Intro>

      <AnatomyTree nodes={ANATOMY} />

      <DashboardCard title="ContentContainer — the content measure">
        <Lead>
          A centred reading column that caps how wide its content grows, so a
          form or block of prose stays readable on a wide monitor instead of
          sprawling edge to edge. It owns <em>only</em>{' '}
          <code>max-inline-size</code> + auto inline margins — no padding (the
          Page body owns edge padding), no styling of what's inside. Three caps:{' '}
          <code>prose</code> (40rem), <code>form</code> (58rem, the default),{' '}
          <code>wide</code> (80rem). This page's own column runs on{' '}
          <code>wide</code>, so the <code>prose</code> and <code>form</code>{' '}
          bars below stop at their caps and centre; the <code>wide</code> bar
          only stops growing on a body broader than 80rem (the{' '}
          <a href="#/showcase/forms">Detail form page</a> runs on{' '}
          <code>form</code>). In fact the rest of this page demonstrates it
          live: this card spans the <code>wide</code> column, and every card
          below sits in a nested <code>form</code>-width container.
        </Lead>
        <Col gap="sm">
          <ContentContainer size="prose">
            <div class={styles.stub}>prose · caps at 40rem</div>
          </ContentContainer>
          <ContentContainer size="form">
            <div class={styles.stub}>form · caps at 58rem</div>
          </ContentContainer>
          <ContentContainer size="wide">
            <div class={styles.stub}>wide · caps at 80rem</div>
          </ContentContainer>
        </Col>
      </DashboardCard>

      <ContentContainer size="form">
        <Stack gap="lg">
          <DashboardCard title="Stack — vertical rhythm between sibling blocks">
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

          <DashboardCard title="IdentityHeader — the record identity">
            <Lead>
              The record-identity header atop a sectioned edit form: the
              record's <em>name</em> as the region heading (rank fixed at{' '}
              <code>h2</code>, under the page's breadcrumb <code>h1</code>),
              with an optional muted subtitle of secondary identity facts.{' '}
              <code>title</code> takes JSX, so the name can render as a link to
              the record. It owns the subtitle's colour — <code>Text</code>{' '}
              never carries colour; the context that owns the meaning does.
            </Lead>
            <IdentityHeader
              title="Acetylsalicylic Acid 300mg Tablet"
              subtitle="Code: 030453 · Unit: tablet"
            />
          </DashboardCard>

          <DashboardCard title="FormColumns + FormColumn — the section stacks">
            <Lead>
              <code>FormColumns</code> is the row of column stacks;{' '}
              <code>FormColumn</code> is one vertical stack of sections inside
              it. Sibling columns share the width equally, and the author places
              each section in a column <em>explicitly</em> — grouping stays
              click-traceable, and the single-column reading order is column 1's
              sections, then column 2's. Squeeze the panel: below a column's{' '}
              <code>minWidth</code> (default <code>22rem</code>, so two columns
              collapse near 46rem of body width) the row <em>wraps</em> to a
              single stack — intrinsically, no breakpoint.
            </Lead>
            <FormColumns>
              <FormColumn>
                <div class={`${styles.stub} ${styles.sectionStub}`}>
                  column 1 · section
                </div>
                <div class={`${styles.stub} ${styles.sectionStub}`}>
                  column 1 · section
                </div>
              </FormColumn>
              <FormColumn>
                <div class={`${styles.stub} ${styles.sectionStub}`}>
                  column 2 · section
                </div>
                <div class={`${styles.stub} ${styles.sectionStub}`}>
                  column 2 · section
                </div>
              </FormColumn>
            </FormColumns>
          </DashboardCard>

          <DashboardCard title="FormSection — the titled group">
            <Lead>
              A titled group of fields: a neutral bold heading with a hairline
              rule, then a vertical stack of its children. Fields sit directly
              inside the section, one per line at full width — that's the
              default; pairing is opt-in via <code>FormRow</code> (next card).{' '}
              <code>headingLevel</code> sets the heading <em>rank</em> only (
              <code>h2</code> default, <code>h3</code> for a sub-group nested
              inside another section — like Inventory adjustments inside Supply
              Chain on the <a href="#/showcase/forms">Detail form page</a>); the
              size never changes, the document outline does.
            </Lead>
            <FormPreview>
              <FormSection title="Batch & Dates">
                <TextField label="Batch number" width="full" />
                <TextField
                  label="Barcode"
                  width="full"
                  placeholder="Scan or enter barcode"
                />
              </FormSection>
            </FormPreview>
          </DashboardCard>

          <DashboardCard title="FormRow — the opt-in two-up row">
            <Lead>
              Puts two (or more) fields side by side on one line, each taking an
              equal share — the row a section reaches for on the specific pairs
              that belong together (Cost / Sell price, Expiry / Manufacture
              date). Opt-in per row: single fields never need one. Below{' '}
              <code>minItemWidth</code> (default <code>10rem</code>, so a pair
              stacks near 21rem of available width) the row wraps to stacked —
              resize to watch. Pure arrangement: the controls keep their own
              look and fill the slot the row hands them.
            </Lead>
            <FormPreview>
              <FormSection title="Pricing">
                <TextField label="Price note" width="full" />
                <FormRow>
                  <TextField label="Cost price" width="full" />
                  <TextField label="Sell price" width="full" />
                </FormRow>
              </FormSection>
            </FormPreview>
          </DashboardCard>
        </Stack>
      </ContentContainer>
    </Stack>
  </ContentContainer>
);

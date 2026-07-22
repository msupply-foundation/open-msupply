import { ContentContainer } from '../ui/layout/ContentContainer/ContentContainer';
import { Stack as AppStack } from '../ui/layout/Stack/Stack';
import { IdentityHeader } from '../ui/layout/IdentityHeader/IdentityHeader';
import { FormColumns } from '../ui/layout/Form/FormColumns';
import { FormColumn } from '../ui/layout/Form/FormColumn';
import { FormSection } from '../ui/layout/Form/FormSection';
import { FormRow } from '../ui/layout/Form/FormRow';
import { TextField } from '../ui/elements/inputs/TextField';
import {
  AnatomyTree,
  Card,
  Col,
  FormPreview,
  Intro,
  Row,
  Stack,
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
 */
export const FormLayoutShowcase = () => (
  <Stack>
    <Intro>
      The form-layout family is a set of pure-layout elements that arrange a
      record form: each owns one arrangement job and never styles the controls
      inside it. This page explains them one at a time, outermost first; the{' '}
      <a href="#/showcase/forms">Detail form page</a> shows them assembled.
    </Intro>

    <AnatomyTree nodes={ANATOMY} />

    <Card
      title="ContentContainer — the content measure"
      lead={
        <>
          A centred reading column that caps how wide its content grows, so a
          form or block of prose stays readable on a wide monitor instead of
          sprawling edge to edge. It owns <em>only</em>{' '}
          <code>max-inline-size</code> + auto inline margins — no padding (the
          Page body owns edge padding), no styling of what's inside. Three caps:{' '}
          <code>prose</code> (40rem), <code>form</code> (58rem, the default),{' '}
          <code>wide</code> (80rem). This demo column is itself narrower than
          58rem, so only the <code>prose</code> cap engages here —{' '}
          <code>form</code> and <code>wide</code> take effect on wider page
          bodies (the <a href="#/showcase/forms">Detail form page</a> runs on{' '}
          <code>form</code>).
        </>
      }
    >
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
    </Card>

    <Card
      title="Stack — vertical rhythm between sibling blocks"
      lead={
        <>
          A vertical run of sibling blocks with a consistent gap — the space
          between a detail form's identity header, an alert, and its columns.{' '}
          <code>gap</code> is a <em>preset, not a length</em> — <code>sm</code>,{' '}
          <code>md</code> (the default), <code>lg</code> — so sibling blocks
          across the app keep the same few rhythms. Vertical <em>only</em>, by
          design: horizontal grouping always has a more semantic owner that also
          encodes its wrap behaviour (<code>FormRow</code>,{' '}
          <code>HeaderButtons</code>, <code>CardGrid</code>…).
        </>
      }
    >
      <Row align="start">
        <AppStack gap="sm">
          <div class={`${styles.stub} ${styles.rhythmStub}`}>gap="sm"</div>
          <div class={`${styles.stub} ${styles.rhythmStub}`}>block</div>
          <div class={`${styles.stub} ${styles.rhythmStub}`}>block</div>
        </AppStack>
        <AppStack gap="md">
          <div class={`${styles.stub} ${styles.rhythmStub}`}>
            gap="md" · default
          </div>
          <div class={`${styles.stub} ${styles.rhythmStub}`}>block</div>
          <div class={`${styles.stub} ${styles.rhythmStub}`}>block</div>
        </AppStack>
        <AppStack gap="lg">
          <div class={`${styles.stub} ${styles.rhythmStub}`}>gap="lg"</div>
          <div class={`${styles.stub} ${styles.rhythmStub}`}>block</div>
          <div class={`${styles.stub} ${styles.rhythmStub}`}>block</div>
        </AppStack>
      </Row>
    </Card>

    <Card
      title="IdentityHeader — the record identity"
      lead={
        <>
          The record-identity header atop a sectioned edit form: the record's{' '}
          <em>name</em> as the region heading (rank fixed at <code>h2</code>,
          under the page's breadcrumb <code>h1</code>), with an optional muted
          subtitle of secondary identity facts. <code>title</code> takes JSX, so
          the name can render as a link to the record. It owns the subtitle's
          colour — <code>Text</code> never carries colour; the context that owns
          the meaning does.
        </>
      }
    >
      <IdentityHeader
        title="Acetylsalicylic Acid 300mg Tablet"
        subtitle="Code: 030453 · Unit: tablet"
      />
    </Card>

    <Card
      title="FormColumns + FormColumn — the section stacks"
      lead={
        <>
          <code>FormColumns</code> is the row of column stacks;{' '}
          <code>FormColumn</code> is one vertical stack of sections inside it.
          Sibling columns share the width equally, and the author places each
          section in a column <em>explicitly</em> — grouping stays
          click-traceable, and the single-column reading order is column 1's
          sections, then column 2's. Squeeze the panel: below a column's{' '}
          <code>minWidth</code> (default <code>22rem</code>, so two columns
          collapse near 46rem of body width) the row <em>wraps</em> to a single
          stack — intrinsically, no breakpoint.
        </>
      }
    >
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
    </Card>

    <Card
      title="FormSection — the titled group"
      lead={
        <>
          A titled group of fields: a neutral bold heading with a hairline rule,
          then a vertical stack of its children. Fields sit directly inside the
          section, one per line at full width — that's the default; pairing is
          opt-in via <code>FormRow</code> (next card). <code>headingLevel</code>{' '}
          sets the heading <em>rank</em> only (<code>h2</code> default,{' '}
          <code>h3</code> for a sub-group nested inside another section — like
          Inventory adjustments inside Supply Chain on the{' '}
          <a href="#/showcase/forms">Detail form page</a>); the size never
          changes, the document outline does.
        </>
      }
    >
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
    </Card>

    <Card
      title="FormRow — the opt-in two-up row"
      lead={
        <>
          Puts two (or more) fields side by side on one line, each taking an
          equal share — the row a section reaches for on the specific pairs that
          belong together (Cost / Sell price, Expiry / Manufacture date). Opt-in
          per row: single fields never need one. Below <code>minItemWidth</code>{' '}
          (default <code>10rem</code>, so a pair stacks near 21rem of available
          width) the row wraps to stacked — resize to watch. Pure arrangement:
          the controls keep their own look and fill the slot the row hands them.
        </>
      }
    >
      <FormPreview>
        <FormSection title="Pricing">
          <TextField label="Price note" width="full" />
          <FormRow>
            <TextField label="Cost price" width="full" />
            <TextField label="Sell price" width="full" />
          </FormRow>
        </FormSection>
      </FormPreview>
    </Card>
  </Stack>
);

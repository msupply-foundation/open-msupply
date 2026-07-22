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
  FormPreview,
  Intro,
  Lead,
  type AnatomyNode,
} from './common';
import styles from './FormLayoutShowcase.module.css';

/* The family's nesting order, rendered as the figure under the intro — one
 * node per element, noted with the single job it owns. The outer layers
 * (Page → ContentContainer → Stack) are the general page vocabulary,
 * explained on the Page layout page; they stay in the tree for context. */
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
 * Anatomy page for the form-layout family (kdd/form-layout) — the SPECIFIC
 * case of the general page vocabulary (Page layout page, which explains the
 * outer Page → ContentContainer → Stack layers): one demo card per
 * form-specific element, top-down through the nesting order. The assembled
 * result — the family composing a real stock detail form — is the Pages ›
 * Detail form demo (#/showcase/forms); this page is where each layer is
 * explained. Keep the ANATOMY tree in step with that page's actual assembly.
 */
export const FormLayoutShowcase = () => (
  <ContentContainer size="form" align="start">
    <Stack gap="lg">
      <Intro>
        The form-layout family is a set of pure-layout elements that arrange a
        record form: each owns one arrangement job and never styles the controls
        inside it. The outer layers of the tree — <code>Page</code>,{' '}
        <code>ContentContainer</code>, <code>Stack</code> — are the general page
        vocabulary, explained on the{' '}
        <a href="#/showcase/page-layout">Page layout page</a>; this page covers
        the form-specific interior, and the{' '}
        <a href="#/showcase/forms">Detail form page</a> shows it all assembled.
      </Intro>

      <AnatomyTree nodes={ANATOMY} />

      <DashboardCard title="IdentityHeader — the record identity">
        <Lead>
          The record-identity header atop a sectioned edit form: the record's{' '}
          <em>name</em> as the region heading (rank fixed at <code>h2</code>,
          under the page's breadcrumb <code>h1</code>), with an optional muted
          subtitle of secondary identity facts. <code>title</code> takes JSX, so
          the name can render as a link to the record. It owns the subtitle's
          colour — <code>Text</code> never carries colour; the context that owns
          the meaning does.
        </Lead>
        <IdentityHeader
          title="Acetylsalicylic Acid 300mg Tablet"
          subtitle="Code: 030453 · Unit: tablet"
        />
      </DashboardCard>

      <DashboardCard title="FormColumns + FormColumn — the section stacks">
        <Lead>
          <code>FormColumns</code> is the row of column stacks;{' '}
          <code>FormColumn</code> is one vertical stack of sections inside it.
          Sibling columns share the width equally, and the author places each
          section in a column <em>explicitly</em> — grouping stays
          click-traceable, and the single-column reading order is column 1's
          sections, then column 2's. Squeeze the panel: below a column's{' '}
          <code>minWidth</code> (default <code>22rem</code>, so two columns
          collapse near 46rem of body width) the row <em>wraps</em> to a single
          stack — intrinsically, no breakpoint.
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
          A titled group of fields: a neutral bold heading with a hairline rule,
          then a vertical stack of its children. Fields sit directly inside the
          section, one per line at full width — that's the default; pairing is
          opt-in via <code>FormRow</code> (next card). <code>headingLevel</code>{' '}
          sets the heading <em>rank</em> only (<code>h2</code> default,{' '}
          <code>h3</code> for a sub-group nested inside another section — like
          Inventory adjustments inside Supply Chain on the{' '}
          <a href="#/showcase/forms">Detail form page</a>); the size never
          changes, the document outline does.
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
          equal share — the row a section reaches for on the specific pairs that
          belong together (Cost / Sell price, Expiry / Manufacture date). Opt-in
          per row: single fields never need one. Below <code>minItemWidth</code>{' '}
          (default <code>10rem</code>, so a pair stacks near 21rem of available
          width) the row wraps to stacked — resize to watch. Pure arrangement:
          the controls keep their own look and fill the slot the row hands them.
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
);

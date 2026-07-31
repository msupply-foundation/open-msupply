import { ContentContainer } from '../ui/layout/ContentContainer/ContentContainer';
import { Stack } from '../ui/layout/Stack/Stack';
import { IdentityHeader } from '../ui/layout/IdentityHeader/IdentityHeader';
import { DashboardCard } from '../ui/elements/dashboard/DashboardCard';
import { FormColumns } from '../ui/layout/Form/FormColumns';
import { FormColumn } from '../ui/layout/Form/FormColumn';
import { FormSection } from '../ui/layout/Form/FormSection';
import { FormRow } from '../ui/layout/Form/FormRow';
import { FormRowItem } from '../ui/layout/Form/FormRowItem';
import { TextField } from '../ui/elements/inputs/TextField';
import { DateField } from '../ui/elements/inputs/DateField';
import {
  AnatomyTree,
  FormPreview,
  Intro,
  Lead,
  Note,
  SectionTOC,
  type AnatomyNode,
} from './common';
import type { PageMetadata } from './metadata';
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
                            children: [
                              {
                                name: 'FormRowItem',
                                note: 'a weighted slot — opt-in, one item',
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
export const formLayoutMetadata: PageMetadata = {
  id: 'form-layout',
  title: 'Form layout',
  searchTerms: ['form', 'record', 'fields'],
  items: [
    {
      id: 'form-layout-identity-header',
      title: 'IdentityHeader',
      searchTerms: ['identity', 'record', 'title'],
    },
    {
      id: 'form-layout-columns',
      title: 'FormColumns',
      searchTerms: ['column', 'two column', 'stacks'],
    },
    {
      id: 'form-layout-section',
      title: 'FormSection',
      searchTerms: ['section', 'group', 'titled', 'fieldset'],
    },
    {
      id: 'form-layout-row',
      title: 'FormRow',
      searchTerms: ['row', 'two up', 'inline', 'pair'],
    },
    {
      id: 'form-layout-row-item',
      title: 'FormRowItem',
      searchTerms: [
        'form row item',
        'weight',
        'fr',
        'share',
        'min width',
        'pinned',
      ],
    },
  ],
};

export const FormLayoutShowcase = () => (
  <ContentContainer size="form" align="start">
    <Stack gap="lg">
      <SectionTOC page={formLayoutMetadata} />
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

      <DashboardCard
        id="form-layout-identity-header"
        title="IdentityHeader — the record identity"
      >
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

      <DashboardCard
        id="form-layout-columns"
        title="FormColumns + FormColumn — the section stacks"
      >
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

      <DashboardCard
        id="form-layout-section"
        title="FormSection — the titled group"
      >
        <Lead>
          A titled group of fields: a neutral bold heading with a hairline rule,
          then a vertical stack of its children. Fields sit directly inside the
          section, one per line at full width — that's the default; pairing is
          opt-in via <code>FormRow</code> (next card).
        </Lead>
        <Lead>
          Rank and treatment are <strong>separate</strong> inputs.{' '}
          <code>headingLevel</code> sets the document-outline <em>rank</em> (
          <code>h2</code> default, <code>h3</code> when the surface around it
          already owns the h2); <code>heading</code> picks the{' '}
          <em>treatment</em> — <code>group</code> (ruled) or{' '}
          <code>subgroup</code> (quieter: smaller, no rule). The treatment
          defaults from the rank, so name both only where they diverge: a
          section that is a top-level group of its surface but must take h3
          because that surface's title holds the h2 wants{' '}
          <code>headingLevel="h3" heading="group"</code> — the prescription line
          editor's dialog does exactly this. A genuine sub-group nested inside
          another section (Inventory adjustments inside Supply Chain on the{' '}
          <a href="#/showcase/forms">Detail form page</a>) needs only{' '}
          <code>headingLevel="h3"</code>, whose default treatment is already{' '}
          <code>subgroup</code>.
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
        <Note>
          The three treatments, so the difference is visible: a default{' '}
          <code>h2</code> group, the same group forced to <code>h3</code> for
          the outline while keeping the ruled treatment, and a genuine{' '}
          <code>h3</code> sub-group. Note the third reads quieter than its own
          field labels — correct for a sub-group, wrong for a group, which is
          why the two inputs are separate.
        </Note>
        <FormPreview>
          <FormSection title="Group (h2, default)">
            <TextField label="Batch number" width="full" />
          </FormSection>
          <FormSection
            title="Group at h3 (heading=group)"
            headingLevel="h3"
            heading="group"
          >
            <TextField label="Batch number" width="full" />
          </FormSection>
          <FormSection title="Sub-group (h3, default)" headingLevel="h3">
            <TextField label="Batch number" width="full" />
          </FormSection>
        </FormPreview>
      </DashboardCard>

      <DashboardCard
        id="form-layout-row"
        title="FormRow — the opt-in two-up row"
      >
        <Lead>
          Puts two (or more) fields side by side on one line, each taking an
          equal share — the row a section reaches for on the specific pairs that
          belong together (Cost / Sell price, Expiry / Manufacture date). Opt-in
          per row: single fields never need one. Below <code>minItemWidth</code>{' '}
          (default <code>10rem</code>, so a pair stacks near 21rem of available
          width) the row wraps to stacked — resize to watch. Pure arrangement:
          the controls keep their own look and fill the slot the row hands them.
          An item whose data needs more (or less) room than its neighbours' opts
          into a share of its own by wrapping in <code>FormRowItem</code> (next
          card); equal shares stay the default.
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

      <DashboardCard
        id="form-layout-row-item"
        title="FormRowItem — the opt-in weighted slot"
      >
        <Lead>
          One item of a <code>FormRow</code>, wrapped to declare its own share:
          a field's width follows its <em>data</em>, never the field count, so
          equal shares only hold while the fields carry comparably long data.{' '}
          <code>weight</code> is that share of the whole row — the design
          standard's <code>fr</code>, because the slot's flex basis is{' '}
          <code>0</code> and the row's <em>entire</em> width distributes in
          proportion, not just what's left once every item has taken a basis.{' '}
          <code>1</code> is the equal share; below, Manufacturer at{' '}
          <code>2</code> takes twice Batch number's <code>1</code>, and Expiry
          is <code>{'weight={0}'}</code> — pinned to its floor, handing every
          spare pixel to its siblings, which is what a fixed-format value that
          can never use more room wants. <code>minWidth</code> is that floor
          (overriding <code>minItemWidth</code> for this slot alone), and it
          also decides who gives up width as the row narrows, and the floors'
          sum is the wrap point: keep a row's
          floors summing to no more than the unweighted row's would —{' '}
          <code>10rem</code> inherited + <code>7rem</code> + <code>9rem</code> ={' '}
          <code>26rem</code> here, against three × <code>10rem</code> — or the
          row wraps <em>earlier</em> than it used to and the form grows a line.
          Opt-in per item, as <code>FormRow</code> is per row: anything left
          unwrapped keeps the equal share, and most rows want exactly that. The
          header field cluster — a patient name beside a formatted date — is
          where a weight earns its keep, demoed on the{' '}
          <a href="#/showcase/header">Header page</a>.
        </Lead>
        <FormPreview>
          <FormSection title="Batch & Expiry">
            <FormRow>
              <FormRowItem weight={2}>
                <TextField label="Manufacturer" width="full" />
              </FormRowItem>
              <FormRowItem weight={1} minWidth="7rem">
                <TextField label="Batch number" width="full" />
              </FormRowItem>
              <FormRowItem weight={0} minWidth="9rem">
                <DateField label="Expiry" width="full" value="2027-03-31" />
              </FormRowItem>
            </FormRow>
          </FormSection>
        </FormPreview>
      </DashboardCard>
    </Stack>
  </ContentContainer>
);

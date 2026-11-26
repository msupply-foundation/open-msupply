import { ContentContainer } from '../ui/layout/ContentContainer/ContentContainer';
import { Stack } from '../ui/layout/Stack/Stack';
import { DashboardCard } from '../ui/elements/dashboard/DashboardCard';
import { DetailContainer } from '../ui/layout/Detail/DetailContainer';
import { DetailSection } from '../ui/layout/Detail/DetailSection';
import { DetailRow } from '../ui/layout/Detail/DetailRow';
import { RecordNameHeader } from '../ui/layout/Detail/RecordNameHeader';
import { DetailCard } from '../ui/layout/Detail/DetailCard';
import { CardGrid } from '../ui/layout/CardGrid/CardGrid';
import { FormSection } from '../ui/layout/Form/FormSection';
import { Table } from '../ui/elements/table/Table';
import { For } from 'solid-js';
import { IconButton } from '../ui/elements/buttons/IconButton';
import { Button } from '../ui/elements/buttons/Button';
import { StatusBadge } from '../ui/elements/feedback/StatusBadge';
import { NumberField } from '../ui/elements/inputs/NumberField';
import { EditIcon, TrashIcon } from '../ui/icons';
import { Page } from '../ui/layout/Page/Page';
import { FormPreview, Lead, PageFrame, SectionTOC } from './common';
import type { PageMetadata } from './metadata';

/*
 * Storybook of the read-only detail-form scaffold (DetailContainer/
 * DetailSection/DetailRow/RecordNameHeader — spec/ui-standards/components.md
 * § Detail views) plus DetailCard, the one shape the family didn't cover:
 * several records of the same kind stacked as cards, each a miniature detail
 * view with its own header actions (e.g. the items Variants tab). A whole
 * assembled detail PAGE lives at Pages › Detail form; this page is the
 * element-by-element anatomy, the way Layout Elements › Form layout is to
 * Pages › Detail form for the other layout family.
 */
export const detailViewsMetadata: PageMetadata = {
  id: 'detail-views',
  title: 'Detail views',
  searchTerms: ['read-only', 'record', 'form'],
  items: [
    {
      id: 'detail-views-scaffold',
      title: 'Detail container / section / row',
      searchTerms: [
        'DetailContainer',
        'DetailSection',
        'DetailRow',
        'RecordNameHeader',
      ],
    },
    {
      id: 'detail-views-card',
      title: 'DetailCard & static sub-table',
      searchTerms: [
        'card',
        'header actions',
        'variants',
        'Table',
        'sub-table',
        'display shell',
        'packaging',
        'density',
        'data-control',
        'controls',
      ],
    },
    {
      id: 'detail-views-panel',
      title: 'Panels on a shaded page body',
      searchTerms: ['panel', 'shaded', 'canvas', 'background', 'tender'],
    },
  ],
};

export const DetailViewsShowcase = () => (
  <ContentContainer size="form" align="start">
    <Stack gap="lg">
      <SectionTOC page={detailViewsMetadata} />
      <DashboardCard
        id="detail-views-scaffold"
        title="Detail container / section / row — the read-only scaffold"
      >
        <Lead>
          <code>DetailContainer</code> centres and width-caps the field block;{' '}
          <code>DetailSection</code> groups <code>DetailRow</code>s as a
          label/value grid, with an optional heading. Every value renders as a
          disabled control — the scaffold every detail page in the app builds on
          (see <code>src/sections/names</code> for the live shape).
        </Lead>
        <FormPreview>
          <DetailContainer>
            <RecordNameHeader name="Buka Health Centre" />
            <DetailSection title="Details">
              <DetailRow label="Code" value="BHC" />
              <DetailRow label="Type" value="Store" />
              <DetailRow label="On hold" checked={false} />
            </DetailSection>
          </DetailContainer>
        </FormPreview>
      </DashboardCard>

      <DashboardCard
        id="detail-views-card"
        title="DetailCard — a titled card with header actions (+ static sub-table)"
      >
        <Lead>
          Extends the same family with a card: a heading (the record's name, the
          accessible name for the whole card) + an <code>actions</code> slot at
          the header's end (typically <code>IconButton</code>s), over an
          arbitrary body — a <code>DetailSection</code>, a sub-table, or
          several. Stack several in a <code>CardGrid</code> for a list of
          records shown as cards instead of table rows (e.g. the items Variants
          tab: one card per variant, Edit/Delete in the header, a read-only
          field set, and a bundling sub-table in the body). Both body shapes are
          shown below — field rows in the first card, a <code>Table</code>{' '}
          sub-table in the second.
        </Lead>
        <CardGrid minColumnWidth="20rem">
          <DetailCard
            title="Bottle of 100"
            actions={
              <>
                <IconButton
                  icon={<EditIcon />}
                  label="Edit"
                  onClick={() => {}}
                />
                <IconButton
                  icon={<TrashIcon />}
                  label="Delete"
                  variant="danger"
                  onClick={() => {}}
                />
              </>
            }
          >
            <DetailSection>
              <DetailRow label="Manufacturer" value="Acme Pharma" />
              <DetailRow label="Location type" value="Ambient" />
            </DetailSection>
          </DetailCard>
          <DetailCard
            title="Bottle of 500"
            actions={
              <>
                <IconButton
                  icon={<EditIcon />}
                  label="Edit"
                  onClick={() => {}}
                />
                <IconButton
                  icon={<TrashIcon />}
                  label="Delete"
                  variant="danger"
                  onClick={() => {}}
                />
              </>
            }
          >
            {/* The same card with a STATIC SUB-TABLE in its body — the second
                shape a DetailCard holds (see the Table note below). */}
            <FormSection title="Packaging" headingLevel="h3">
              <Table label="Packaging">
                <thead>
                  <tr>
                    <th>Level</th>
                    <th>Name</th>
                    <th data-numeric>Pack size</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>1</td>
                    <td>Bottle</td>
                    <td data-numeric>1</td>
                  </tr>
                  <tr>
                    <td>2</td>
                    <td>Carton</td>
                    <td data-numeric>24</td>
                  </tr>
                </tbody>
              </Table>
            </FormSection>
          </DetailCard>
        </CardGrid>
        <Lead>
          The second card's body is a <code>Table</code> — the{' '}
          <strong>display shell</strong>: a scroll container plus a real
          semantic <code>&lt;table&gt;</code> in the app's row look, whose{' '}
          <code>&lt;thead&gt;</code>/<code>&lt;tbody&gt;</code> the screen
          composes, with cell treatment from data attributes on that markup (
          <code>data-numeric</code> here) rather than exported class names. It
          is for a <em>short, fixed</em> row set sitting inside another surface,
          where <code>DataTable</code>'s toolbar chrome — filter bar, column
          settings, full-screen, pagination — would outweigh the content. A
          screen's <em>own</em> row set is a <code>DataTable</code> however few
          rows it holds today: the moment it wants sorting, filtering,
          pagination, selection or column resizing, this shell is the wrong
          tool. It carries no cell presets, so alignment and formatting are the
          screen's.
        </Lead>
        <Lead>
          Rows of form controls take <code>density="comfortable"</code> — the
          data table's own default band — so the inputs keep the same clearance
          from the row dividers as an editor table's. A{' '}
          <code>data-control</code> column is one compact input wide and the
          field fills it at its default width, so it lines up under the column
          heading (<code>data-numeric</code> end-aligns that heading); spare
          width goes to the columns without one. The vaccine course editor's
          Rates per store table is built this way.
        </Lead>
        <Table label="Rates per store" density="comfortable">
          <thead>
            <tr>
              <th>Store</th>
              <th data-numeric data-control>
                Wastage rate
              </th>
              <th data-numeric data-control>
                Coverage rate
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Buka Health Centre</td>
              <td data-control>
                <NumberField
                  label="Buka Health Centre wastage rate"
                  hideLabel
                  size="small"
                  endAdornment="%"
                  value={10}
                />
              </td>
              <td data-control>
                <NumberField
                  label="Buka Health Centre coverage rate"
                  hideLabel
                  size="small"
                  endAdornment="%"
                />
              </td>
            </tr>
            <tr>
              <td>Arawa District Store</td>
              <td data-control>
                <NumberField
                  label="Arawa District Store wastage rate"
                  hideLabel
                  size="small"
                  endAdornment="%"
                />
              </td>
              <td data-control>
                <NumberField
                  label="Arawa District Store coverage rate"
                  hideLabel
                  size="small"
                  endAdornment="%"
                  value={90}
                />
              </td>
            </tr>
          </tbody>
        </Table>
        <Lead>
          A <code>meta</code> line sits under the title — what belongs with the
          name (a unit, a state badge) rather than with the body. With{' '}
          <code>layout="inline"</code> the card is one row: the title and meta
          at the inline start, wrapping, and the body at the inline end at its
          content's width — for a dense grid of cards whose body is a short row
          of controls, on a phone, where a card should cost one row of the
          screen. The caller picks the layout (the Simple dispensing screen does
          it by viewport). Below, the same compact card stacked, then inline.
        </Lead>
        <CardGrid minColumnWidth="18rem">
          <For each={['stacked', 'inline'] as const}>
            {layout => (
              <DetailCard
                title="Paracetamol 500mg tabs"
                surface="bordered"
                density="compact"
                layout={layout}
                meta={
                  <>
                    <span>Tablet</span>
                    <StatusBadge label="20 Tablet on the list" tone="info" />
                  </>
                }
              >
                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                  <Button variant="secondary">10</Button>
                  <Button variant="secondary">20</Button>
                </div>
              </DetailCard>
            )}
          </For>
        </CardGrid>
      </DashboardCard>
      <DashboardCard
        id="detail-views-panel"
        title="Panels on a shaded page body"
      >
        <Lead>
          A <code>Page</code> with <code>shaded</code> shades its body (
          <code>--page-body-shade</code>), and each group of fields on it is a{' '}
          <code>DetailCard</code> with <code>surface="panel"</code>: the raised
          fill, a hairline, a small radius and no shadow. A table that fills the
          body keeps its own white. Only the tender page and the Simple
          dispensing screen use it so far; it becomes the default for every page
          once approved (#2172).
        </Lead>
        <PageFrame>
          <Page shaded>
            <Stack gap="lg">
              <DetailCard surface="panel" title="Tender details">
                <DetailSection>
                  <DetailRow label="Tender ID" value="19" />
                  <DetailRow
                    label="Description"
                    value="Laboratory consumables 2027"
                  />
                  <DetailRow label="Sourcing" value="Competitive" />
                </DetailSection>
              </DetailCard>
              <DetailCard surface="panel" title="Internal documents">
                <DetailSection>
                  <DetailRow label="Documents" value="None yet" />
                </DetailSection>
              </DetailCard>
            </Stack>
          </Page>
        </PageFrame>
      </DashboardCard>
    </Stack>
  </ContentContainer>
);

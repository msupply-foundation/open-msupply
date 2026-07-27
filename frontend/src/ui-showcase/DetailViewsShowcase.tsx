import { ContentContainer } from '../ui/layout/ContentContainer/ContentContainer';
import { Stack } from '../ui/layout/Stack/Stack';
import { DashboardCard } from '../ui/elements/dashboard/DashboardCard';
import { DetailContainer } from '../ui/layout/Detail/DetailContainer';
import { DetailSection } from '../ui/layout/Detail/DetailSection';
import { DetailRow } from '../ui/layout/Detail/DetailRow';
import { RecordNameHeader } from '../ui/layout/Detail/RecordNameHeader';
import { DetailCard } from '../ui/layout/Detail/DetailCard';
import { CardGrid } from '../ui/layout/CardGrid/CardGrid';
import { IconButton } from '../ui/elements/buttons/IconButton';
import { EditIcon, TrashIcon } from '../ui/icons';
import { FormPreview, Lead, SectionTOC } from './common';
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
      title: 'DetailCard',
      searchTerms: ['card', 'header actions', 'variants'],
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
        title="DetailCard — a titled card with header actions"
      >
        <Lead>
          Extends the same family with a card: a heading (the record's name, the
          accessible name for the whole card) + an <code>actions</code> slot at
          the header's end (typically <code>IconButton</code>s), over an
          arbitrary body — a <code>DetailSection</code>, a table, or several.
          Stack several in a <code>CardGrid</code> for a list of records shown
          as cards instead of table rows (e.g. the items Variants tab: one card
          per variant, Edit/Delete in the header, a read-only field set, and a
          bundling sub-table in the body).
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
            <DetailSection>
              <DetailRow label="Manufacturer" value="MediCorp" />
              <DetailRow label="Location type" value="Cold room" />
            </DetailSection>
          </DetailCard>
        </CardGrid>
      </DashboardCard>
    </Stack>
  </ContentContainer>
);

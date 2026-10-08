import { ContentContainer } from '../ui/layout/ContentContainer/ContentContainer';
import { Stack } from '../ui/layout/Stack/Stack';
import { DashboardCard } from '../ui/elements/dashboard/DashboardCard';
import { InsetPanel } from '../ui/layout/InsetPanel/InsetPanel';
import { FieldRow } from '../ui/elements/inputs/FieldRow';
import { TextField } from '../ui/elements/inputs/TextField';
import { FormPreview, Lead } from './common';
import type { PageMetadata } from './metadata';

/*
 * Storybook of the InsetPanel layout element: a recessed grey panel that
 * groups related controls with an optional muted hint line. Pure
 * layout/grouping — no interaction or a11y contract — so it lives with the
 * layout elements, not the inputs (the controls it wraps keep their own look).
 * Demoed with the FieldRow + TextField rows it pairs with inside the
 * create-stocktake modal.
 */
// Single-card page: no TOC rendered, but metadata is exported for Search.
export const insetPanelMetadata: PageMetadata = {
  id: 'inset-panel',
  title: 'Inset panel',
  searchTerms: ['recessed', 'group', 'well'],
  items: [
    {
      id: 'inset-panel-recessed',
      title: 'Inset panel',
      searchTerms: ['recessed', 'grouping', 'well'],
    },
  ],
};

export const InsetPanelShowcase = () => (
  <ContentContainer size="form" align="start">
    <Stack gap="lg">
      <DashboardCard
        id="inset-panel-recessed"
        title="Inset panel — recessed grouping"
      >
        <Lead>
          A recessed grey panel that groups related controls, with an optional
          muted <code>hint</code> line at the top — the app's "extra options"
          area inside a dialog (the create-stocktake include-all / filter
          block). Hand-rolled, pure CSS + tokens: no interaction or a11y
          contract to buy, just a tinted rounded container. Pairs with{' '}
          <code>FieldRow</code>.
        </Lead>
        <FormPreview>
          <InsetPanel hint="Counts items matching the filters below.">
            <FieldRow label="Master list">
              <TextField label="Master list" hideLabel placeholder="Any" />
            </FieldRow>
            <FieldRow label="Location">
              <TextField label="Location" hideLabel placeholder="Any" />
            </FieldRow>
          </InsetPanel>
        </FormPreview>
      </DashboardCard>
    </Stack>
  </ContentContainer>
);

import { createResource, For, Show, type Component } from 'solid-js';
import { graphqlFetch } from '../../../api/graphql';
import { gated } from '../../../api/gated';
import { t } from '../../../intl';
import { CardGrid } from '../../../ui/layout/CardGrid/CardGrid';
import { ContentContainer } from '../../../ui/layout/ContentContainer/ContentContainer';
import { EmptyState } from '../../../ui/elements/feedback/EmptyState';
import { Button } from '../../../ui/elements/buttons/Button';
import { ItemVariants } from './itemVariants.generated';
import { ItemVariantCard } from './ItemVariantCard';
import {
  ItemVariantEditModal,
  type ItemVariantEditorState,
} from './ItemVariantEditModal';
import type { ItemVariantRow } from './itemVariantEdit';

// The Variants tab (spec/items S2 › Variants tab, rules.md § item variants and
// packaging / bundled variants). Already central-server-gated at the TAB level
// (itemDetailTabs.ts, since #547) — every render of this panel is on central,
// so unlike the Ancillary items tab there's no further isCentral prop to
// thread through. Its own query (kdd/state-management), independent of the
// itemDetail read, so a save/delete refetches only this tab — mirrors
// ItemAncillaryPanel.tsx.

export const ItemVariantsPanel: Component<{
  storeId: string;
  itemId: string;
  isVaccine: boolean;
  editor: ItemVariantEditorState | undefined;
  onEditorChange: (editor: ItemVariantEditorState | undefined) => void;
}> = props => {
  const [data, { refetch }] = createResource(
    () => ({ storeId: props.storeId, itemId: props.itemId }),
    async v => {
      const result = await graphqlFetch(ItemVariants, v);
      if (result.kind !== 'success') return undefined;
      return result.data.items.nodes[0]?.variants ?? [];
    }
  );

  // Read WITHOUT suspending: this panel mounts when its TAB is opened, so its
  // FIRST read is pending under the already-open detail screen's <Suspense> —
  // a suspending read there tears down and remounts the whole screen.
  const rows = (): ItemVariantRow[] => gated(data) ?? [];

  const onChanged = () => void refetch();
  const onSaved = () => {
    props.onEditorChange(undefined);
    onChanged();
  };

  return (
    <>
      {/* `padded`: the detail page is fillBody (so its table tabs fill the
          region), which strips the Page body's edge padding — without this the
          cards butt against the tab strip and the region edges. `form` is the
          measure, matching the General/Store tabs, so the variant cards sit in
          the same reading column as the rest of the record. */}
      <ContentContainer size="form" padded>
        <Show
          when={rows().length > 0}
          fallback={
            // A ghost, icon-less CTA — the app's empty-state create affordance
            // (the ancillary tab and the stocktakes list read the same).
            <EmptyState message={t('messages.no-item-variants')}>
              <Button
                variant="ghost"
                onClick={() => props.onEditorChange({ mode: 'create' })}
              >
                {t('label.add-variant')}
              </Button>
            </EmptyState>
          }
        >
          <CardGrid minColumnWidth="24rem">
            <For each={rows()}>
              {variant => (
                <ItemVariantCard
                  storeId={props.storeId}
                  variant={variant}
                  isVaccine={props.isVaccine}
                  onEdit={() => props.onEditorChange({ mode: 'edit', variant })}
                  onChanged={onChanged}
                />
              )}
            </For>
          </CardGrid>
        </Show>
      </ContentContainer>

      <Show when={props.editor}>
        {editor => (
          <ItemVariantEditModal
            storeId={props.storeId}
            itemId={props.itemId}
            isVaccine={props.isVaccine}
            editor={editor()}
            onClose={() => props.onEditorChange(undefined)}
            onSaved={onSaved}
          />
        )}
      </Show>
    </>
  );
};

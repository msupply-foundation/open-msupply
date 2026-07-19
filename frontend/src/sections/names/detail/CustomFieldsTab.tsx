import { createResource, For, Show } from 'solid-js';
import type { Component } from 'solid-js';
import { graphqlFetch } from '../../../api/graphql';
import { t } from '../../../intl';
import { EmptyState } from '../../../ui/elements/feedback/EmptyState';
import { Spinner } from '../../../ui/elements/feedback/Spinner';
import { DetailContainer } from '../../../ui/layout/Detail/DetailContainer';
import { DetailSection } from '../../../ui/layout/Detail/DetailSection';
import { DetailRow } from '../../../ui/layout/Detail/DetailRow';
import { CustomFieldDefinitions } from '../names.generated';
import {
  customFieldValue,
  visibleCustomFields,
  type CustomFieldDef,
} from '../customFields';

// S4 Custom fields tab — the supplier role's configured custom-field VALUES,
// read-only (AC-N24). Definitions come from the consumed customFields read
// (scope=supplier); values are read from the name's parsed customFields JSON. An
// empty state shows when the role configures none.
export const CustomFieldsTab: Component<{
  customFields: string | null;
}> = props => {
  const [defsData] = createResource(
    () => 'supplier',
    async (scope): Promise<CustomFieldDef[]> => {
      const result = await graphqlFetch(CustomFieldDefinitions, { scope });
      if (result.kind !== 'success') return [];
      return visibleCustomFields(result.data.customFields.nodes);
    }
  );

  return (
    <Show when={!defsData.loading} fallback={<Spinner center />}>
      <Show
        when={(defsData.latest ?? []).length > 0}
        fallback={<EmptyState message={t('name.custom-fields.empty')} />}
      >
        <DetailContainer>
          <DetailSection>
            <For each={defsData.latest}>
              {def => (
                <DetailRow
                  label={def.name}
                  value={customFieldValue(props.customFields, def.key)}
                />
              )}
            </For>
          </DetailSection>
        </DetailContainer>
      </Show>
    </Show>
  );
};

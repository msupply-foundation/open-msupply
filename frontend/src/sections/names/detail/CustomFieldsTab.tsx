import { createResource, For, Show } from 'solid-js';
import type { Component } from 'solid-js';
import { graphqlFetch } from '../../../api/graphql';
import { t } from '../../../intl';
import { EmptyState } from '../../../ui/elements/feedback/EmptyState';
import { Spinner } from '../../../ui/elements/feedback/Spinner';
import { Select } from '../../../ui/elements/selectors/Select';
import { DetailContainer } from '../../../ui/layout/Detail/DetailContainer';
import { DetailSection } from '../../../ui/layout/Detail/DetailSection';
import { DetailRow } from '../../../ui/layout/Detail/DetailRow';
import { CustomFieldDefinitions } from '../names.generated';
import {
  customFieldDisplay,
  visibleCustomFields,
  type CustomFieldDef,
} from '../customFields';

// S4 Custom fields tab — the supplier role's configured custom-field VALUES,
// read-only (AC-N24). Definitions come from the consumed customFields read
// (scope=supplier); values are read from the name's parsed customFields JSON.
// Each row's control follows the field's value type (customFieldDisplay): a
// boolean shows as a disabled checkbox, an option as its resolved option name,
// everything else as read-only text. An empty state shows when the role
// configures none.
export const CustomFieldsTab: Component<{
  customFields: unknown;
}> = props => {
  const [defsData] = createResource(
    () => 'supplier',
    async (scope): Promise<CustomFieldDef[]> => {
      const result = await graphqlFetch(CustomFieldDefinitions, { scope });
      if (result.kind !== 'success') return [];
      return visibleCustomFields(result.data.customFields.nodes);
    }
  );

  // Non-suspending read: this tab first-fetches when the user switches to it,
  // so a direct/.latest read would suspend the open page's boundary and remount
  // it (kdd/solid-reactivity-pitfalls › no remounts on interaction).
  const defs = (): CustomFieldDef[] =>
    defsData.state === 'ready' || defsData.state === 'refreshing'
      ? (defsData.latest ?? [])
      : [];

  return (
    <Show when={!defsData.loading} fallback={<Spinner center />}>
      <Show
        when={defs().length > 0}
        fallback={
          <EmptyState
            data-testid="nothing-here"
            message={t('name.custom-fields.empty')}
          />
        }
      >
        <DetailContainer>
          <DetailSection>
            <For each={defs()}>
              {def => {
                const display = customFieldDisplay(def, props.customFields);
                switch (display.kind) {
                  case 'boolean':
                    return (
                      <DetailRow label={def.name} checked={display.checked} />
                    );
                  case 'option':
                    // Read-only counterpart of the option picker: a disabled
                    // dropdown showing the resolved option name (matches the
                    // current app). Only the selected option is fed in — it's
                    // disabled and never opens.
                    return (
                      <DetailRow
                        label={def.name}
                        control={
                          <Select
                            label={def.name}
                            hideLabel
                            disabled
                            width="full"
                            placeholder=""
                            // e2e hook (e2e/TESTIDS.md § Customers & suppliers):
                            // the read-only option dropdown, keyed by field.
                            testId={`custom-field-${def.key}`}
                            options={
                              display.id
                                ? [{ value: display.id, label: display.name }]
                                : []
                            }
                            value={display.id || undefined}
                          />
                        }
                      />
                    );
                  default:
                    return <DetailRow label={def.name} value={display.text} />;
                }
              }}
            </For>
          </DetailSection>
        </DetailContainer>
      </Show>
    </Show>
  );
};

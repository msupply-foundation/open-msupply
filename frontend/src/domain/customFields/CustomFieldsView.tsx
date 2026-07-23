import { For, Show } from 'solid-js';
import { t } from '../../intl';
import { EmptyState } from '../../ui/elements/feedback/EmptyState';
import { Spinner } from '../../ui/elements/feedback/Spinner';
import { Select } from '../../ui/elements/selectors/Select';
import { DetailContainer } from '../../ui/layout/Detail/DetailContainer';
import { DetailSection } from '../../ui/layout/Detail/DetailSection';
import { DetailRow } from '../../ui/layout/Detail/DetailRow';
import { customFieldDefinitions } from './customFieldsResource';
import { customFieldDisplay, shownCustomFields } from './customFields';

// The read-only custom-fields tab (spec/ui-standards/custom-fields › the
// custom-fields tab): every shown field for the scope as a labelled detail row,
// its control chosen by value type (boolean → disabled checkbox, option → the
// resolved option name in a disabled dropdown, everything else → read-only
// text). A read-only surface has no toolbar, so prominent fields render here
// too (no promotion). Empty state when the scope configures nothing shown.
export const CustomFieldsView = (props: { scope: string; values: unknown }) => {
  const reader = customFieldDefinitions(props.scope);
  const defs = () => shownCustomFields(reader.noSuspense());

  return (
    <Show when={!reader.loading()} fallback={<Spinner center />}>
      <Show
        when={defs().length > 0}
        fallback={
          <EmptyState
            data-testid="nothing-here"
            message={t('messages.no-custom-fields')}
          />
        }
      >
        <DetailContainer>
          <DetailSection>
            <For each={defs()}>
              {def => {
                const display = customFieldDisplay(def, props.values);
                switch (display.kind) {
                  case 'boolean':
                    return (
                      <DetailRow label={def.name} checked={display.checked} />
                    );
                  case 'option':
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

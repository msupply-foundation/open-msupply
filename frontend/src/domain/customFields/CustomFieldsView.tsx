import { For, Match, Show, Switch } from 'solid-js';
import { t } from '../../intl';
import { EmptyState } from '../../ui/elements/feedback/EmptyState';
import { Spinner } from '../../ui/elements/feedback/Spinner';
import { Select } from '../../ui/elements/selectors/Select';
import { DetailContainer } from '../../ui/layout/Detail/DetailContainer';
import { DetailSection } from '../../ui/layout/Detail/DetailSection';
import { DetailRow } from '../../ui/layout/Detail/DetailRow';
import { customFieldDefinitions } from './customFieldsResource';
import {
  customFieldValue,
  parseCustomField,
  resolveOptionName,
  shownCustomFields,
} from './parse';
import { customFieldDisplayString } from './display';

// The READ-ONLY custom-fields tab (spec/ui-standards/custom-fields › the tab):
// every shown field for the scope as a labelled detail row, its control chosen
// by the parsed kind — boolean → disabled checkbox, option → resolved name in a
// disabled dropdown (the read-only counterpart of the picker), everything else
// → a read-only value (numbers/dates localised via customFieldDisplayString).
// A read-only surface has no toolbar, so prominent fields render here too. Empty
// state when the scope configures nothing shown.
export const CustomFieldsView = (props: { scope: string; values: unknown }) => {
  const reader = customFieldDefinitions(props.scope);
  const fields = () =>
    shownCustomFields(reader.noSuspense()).map(parseCustomField);

  return (
    <Show when={!reader.loading()} fallback={<Spinner center />}>
      <Show
        when={fields().length > 0}
        fallback={
          <EmptyState
            data-testid="nothing-here"
            message={t('messages.no-custom-fields')}
          />
        }
      >
        <DetailContainer>
          <DetailSection>
            <For each={fields()}>
              {field => (
                <Switch
                  fallback={
                    <DetailRow
                      label={field.def.name}
                      value={customFieldDisplayString(field, props.values)}
                    />
                  }
                >
                  <Match when={field.kind === 'boolean'}>
                    <DetailRow
                      label={field.def.name}
                      checked={Boolean(
                        customFieldValue(props.values, field.def.key)
                      )}
                    />
                  </Match>
                  <Match when={field.kind === 'option'}>
                    <DetailRow
                      label={field.def.name}
                      control={
                        <OptionValue field={field} values={props.values} />
                      }
                    />
                  </Match>
                </Switch>
              )}
            </For>
          </DetailSection>
        </DetailContainer>
      </Show>
    </Show>
  );
};

// A read-only option value: the resolved option name in a disabled dropdown
// (the read-only counterpart of the option picker — detail-views › option value).
const OptionValue = (props: {
  field: ReturnType<typeof parseCustomField>;
  values: unknown;
}) => {
  const id = () => {
    const v = customFieldValue(props.values, props.field.def.key);
    return v == null ? '' : String(v);
  };
  return (
    <Select
      label={props.field.def.name}
      hideLabel
      disabled
      width="full"
      placeholder=""
      testId={`custom-field-${props.field.def.key}`}
      options={
        id()
          ? [{ value: id(), label: resolveOptionName(props.field.def, id()) }]
          : []
      }
      value={id() || undefined}
    />
  );
};

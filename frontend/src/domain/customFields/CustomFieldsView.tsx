import { createMemo, For, Show } from 'solid-js';
import { t } from '../../intl';
import { EmptyState } from '../../ui/elements/feedback/EmptyState';
import { Spinner } from '../../ui/elements/feedback/Spinner';
import { LabelledValue } from '../../ui/elements/typography/LabelledValue';
import { ContentContainer } from '../../ui/layout/ContentContainer/ContentContainer';
import { FormColumns } from '../../ui/layout/Form/FormColumns';
import { FormColumn } from '../../ui/layout/Form/FormColumn';
import { Stack } from '../../ui/layout/Stack/Stack';
import { customFieldDefinitions } from './customFieldsResource';
import {
  parseCustomField,
  shownCustomFields,
  splitIntoColumns,
  type ParsedCustomField,
} from './parse';
import { customFieldFormText } from './display';

// The READ-ONLY custom-fields tab (spec/ui-standards/custom-fields › the tab):
// two columns of labelled values, one per shown field for the scope. The split
// is the module's shared splitIntoColumns (the editable tab lays out the same
// way), and the columns wrap to a single stack when squeezed (FormColumns) in
// that same order.
//
// NOT disabled inputs. A field that can NEVER be edited must not render as a
// disabled control (the rule D67 states for the item detail's other tabs, which
// holds for every never-editable field): a greyed-out box reads as "editable
// but locked", inviting a click that does nothing, when the truth is that this
// value is not editable here at all. Read-only reads from the ABSENCE of input
// chrome. Scopes whose values ARE writable (patients, the invoice kinds) use
// CustomFieldsEditTab instead — a real form with a real save.
//
// Both consumers (items, names/suppliers) render this inside a fillBody page,
// whose body carries no padding — hence ContentContainer's `padded` below,
// which also centres the block at the same measure the sibling read-only tabs
// use.
export const CustomFieldsView = (props: { scope: string; values: unknown }) => {
  const reader = customFieldDefinitions(props.scope);
  const fields = createMemo(() =>
    shownCustomFields(reader.noSuspense()).map(parseCustomField)
  );
  const columns = createMemo(() => splitIntoColumns(fields()));
  const firstColumn = () => columns()[0];
  const secondColumn = () => columns()[1];

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
        {/* `padded`: both consumers render this inside a fillBody page, whose
            body carries no padding of its own. `form` is the same measure the
            item detail's other read-only tabs use, so the tabs read alike. */}
        <ContentContainer size="form" padded>
          <FormColumns>
            <FormColumn>
              <FieldColumn fields={firstColumn()} values={props.values} />
            </FormColumn>
            {/* Only when it has fields: an empty column would still claim its
                half of the row and squeeze the filled one. */}
            <Show when={secondColumn().length > 0}>
              <FormColumn>
                <FieldColumn fields={secondColumn()} values={props.values} />
              </FormColumn>
            </Show>
          </FormColumns>
        </ContentContainer>
      </Show>
    </Show>
  );
};

// One column's worth of fields. FormColumn's own gap is the between-SECTIONS
// rhythm (--space-6), too airy for individual fields, so the fields carry their
// own tighter stack.
const FieldColumn = (props: {
  fields: ParsedCustomField[];
  values: unknown;
}) => (
  <Stack gap="md">
    <For each={props.fields}>
      {field => (
        <LabelledValue
          variant="field"
          label={field.def.name}
          // The e2e hook, on every field kind (e2e/TESTIDS.md) — it used
          // to ride only the option type's dropdown.
          data-testid={`custom-field-${field.def.key}`}
        >
          {customFieldFormText(field, props.values)}
        </LabelledValue>
      )}
    </For>
  </Stack>
);

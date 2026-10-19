/*
 * The read-only fallback renderer (kdd/custom-forms/specs.md § Forms in the
 * UI; implementation-plan H12): a document no form can open, shown as it was
 * recorded, from the schema it is pinned to. It renders in place of the form
 * body (DocumentFormRegion), under the version notice that says why.
 *
 * Layout from recordedView.ts: the schema's groups as sections, its fields as
 * read-only values, and what the schema does not declare by path, after.
 */
import { createMemo, For, Match, Show, Switch, type JSX } from 'solid-js';
import { formatNumber, localisedDate, localisedDateTime, t } from '../../intl';
import { FormSection } from '../../ui/layout/Form/FormSection';
import { Stack } from '../../ui/layout/Stack/Stack';
import { LabelledValue } from '../../ui/elements/typography/LabelledValue';
import {
  recordedView,
  type RecordedEntry,
  type UndeclaredValue,
} from './recordedView';

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

// A stored date-time that does not parse is shown as stored, never as
// "Invalid Date".
const parses = (value: string): boolean => !Number.isNaN(Date.parse(value));

const scalar = (value: unknown, format?: string): string => {
  if (typeof value === 'boolean') {
    return value ? t('common.yes') : t('common.no');
  }
  if (typeof value === 'number') return formatNumber(value);
  if (typeof value === 'string') {
    // A calendar date is the recorded day wherever it is read: built as a
    // local date, not parsed as UTC midnight.
    const day = format === 'date' ? DATE_ONLY.exec(value) : null;
    if (day) {
      return localisedDate(
        new Date(Number(day[1]), Number(day[2]) - 1, Number(day[3]))
      );
    }
    if (format === 'date-time' && parses(value)) {
      return localisedDateTime(value);
    }
    return value;
  }
  return JSON.stringify(value);
};

const text = (value: unknown, format?: string): string =>
  Array.isArray(value)
    ? value.map(item => scalar(item, format)).join(', ')
    : scalar(value, format);

const Entry = (props: { entry: RecordedEntry; depth: number }): JSX.Element => (
  <Switch>
    <Match when={props.entry.kind === 'group' && props.entry} keyed>
      {group => (
        <FormSection
          title={group.label}
          headingLevel={props.depth === 0 ? 'h2' : 'h3'}
          heading={props.depth === 0 ? 'group' : 'subgroup'}
        >
          <For each={group.entries}>
            {entry => <Entry entry={entry} depth={props.depth + 1} />}
          </For>
        </FormSection>
      )}
    </Match>
    <Match when={props.entry.kind === 'value' && props.entry} keyed>
      {value => (
        <LabelledValue
          label={value.label}
          variant="field"
          data-testid="document-as-recorded-field"
        >
          {text(value.value, value.format)}
        </LabelledValue>
      )}
    </Match>
  </Switch>
);

export const DocumentAsRecorded = (props: {
  /** The JSON Schema the document is pinned to. */
  schema: unknown;
  data: unknown;
}): JSX.Element => {
  const view = createMemo(() => recordedView(props.schema, props.data));
  return (
    <Stack data-testid="document-as-recorded">
      <For each={view().entries}>
        {entry => <Entry entry={entry} depth={0} />}
      </For>
      <Show when={view().undeclared.length > 0}>
        <FormSection
          title={t('heading.document-undeclared-values')}
          heading="group"
          data-testid="document-undeclared-values"
        >
          <For each={view().undeclared}>
            {(value: UndeclaredValue) => (
              <LabelledValue label={value.path} variant="field">
                {text(value.value)}
              </LabelledValue>
            )}
          </For>
        </FormSection>
      </Show>
    </Stack>
  );
};

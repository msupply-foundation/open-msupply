/*
 * The values a document type's migrations keep (kdd/custom-forms/specs.md §
 * Opening an older document): fields removed from the type whose values stay
 * in the document and round-trip on save, listed read-only under the labels
 * their migration gives them. Rendered by the screens that mount the document
 * form host, after the form body; nothing when the document holds none.
 */
import { For, Show, type JSX } from 'solid-js';
import { t } from '../../intl';
import { FormSection } from '../../ui/layout/Form/FormSection';
import { LabelledValue } from '../../ui/elements/typography/LabelledValue';
import type { KeptValue } from './createDocumentForm';

const text = (value: unknown): string =>
  typeof value === 'string' ||
  typeof value === 'number' ||
  typeof value === 'boolean'
    ? String(value)
    : JSON.stringify(value);

export const DocumentKeptValues = (props: {
  values: readonly KeptValue[];
}): JSX.Element => (
  <Show when={props.values.length > 0}>
    <FormSection
      title={t('heading.document-kept-values')}
      heading="group"
      data-testid="document-kept-values"
    >
      <For each={props.values}>
        {kept => (
          <LabelledValue label={kept.label} variant="field">
            {text(kept.value)}
          </LabelledValue>
        )}
      </For>
    </FormSection>
  </Show>
);

/*
 * What the previous encounter recorded at a field's path, shown under the
 * field as the old client's `displayPrevious` shows it ("Observations from
 * last encounter on 14/04/2025:" over the value), over the core library's
 * read-only labelled value. It reads the view `usePreviousEncounter` returns,
 * writes nothing, and shows nothing while there is no previous encounter or
 * it recorded nothing there.
 */
import { Show, type JSX } from 'solid-js';
import { formatNumber, localisedDate, t } from '../../intl';
import { LabelledValue } from '../../ui/elements/typography/LabelledValue';
import type { Encounter } from '../../plugin-sdk/documents';
import type { PreviousEncounterView } from '../../plugin-sdk/encounters';
import { getAt, type NumberPath, type TextPath } from './paths';
import styles from './PreviousEncounterValue.module.css';

export interface PreviousEncounterValueProps<
  T extends Encounter,
  P extends TextPath<T> | NumberPath<T>,
> {
  /** The previous encounter, from `usePreviousEncounter`. */
  previous: PreviousEncounterView<T> | undefined;
  /** The field whose earlier value to show. */
  path: P;
  /** The field's label, already translated, which the line names. */
  label: string;
  /** `data-testid` for the value (e2e/TESTIDS.md). */
  testId?: string;
}

/** What the previous encounter holds at `path`, as text; empty for nothing. */
export const previousValueText = (
  previous: { data: unknown } | undefined,
  path: string
): string => {
  const v = previous ? getAt(previous.data, path) : undefined;
  if (typeof v === 'number') return formatNumber(v);
  return typeof v === 'string' ? v : '';
};

export const PreviousEncounterValue = <
  T extends Encounter,
  P extends TextPath<T> | NumberPath<T>,
>(
  props: PreviousEncounterValueProps<T, P>
): JSX.Element => {
  const value = () => previousValueText(props.previous, props.path);
  return (
    <Show when={props.previous && value() !== ''}>
      <LabelledValue
        variant="field"
        label={t('control.from-previous-encounter', {
          label: props.label,
          date: localisedDate(props.previous?.startDatetime ?? ''),
        })}
        data-testid={props.testId}
      >
        <span class={styles.text}>{value()}</span>
      </LabelledValue>
    </Show>
  );
};

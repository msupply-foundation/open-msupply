import { For, Show, type Component } from 'solid-js';
import { t } from '../../../intl';
import { StatusChip } from '../../../ui/elements/feedback/StatusChip';
import {
  DATE_AIS,
  gs1Date,
  itemNumber,
  scanCode,
  type ReadScan,
} from '@/domain/barcode';
import { visualiseRaw } from './scanDiagnostics';
import styles from './ScanReading.module.css';

/*
 * What the reading layer made of one scan (src/domain/barcode), shown under
 * the raw output rather than instead of it: the point of this screen is to
 * see the characters the hardware produced AND what the app will do with
 * them — structured or plain, which code the registry is asked for, and
 * every GS1 element exactly as split. A wrong split (a missing separator
 * running two fields together) is visible here and nowhere else.
 */

/** The fields a stock screen reads, named; any other AI shows as its number. */
const ELEMENT_LABELS: Record<string, () => string> = {
  '01': () => t('label.gtin'),
  '10': () => t('label.batch'),
  '11': () => t('label.manufacture-date'),
  '17': () => t('label.expiry-date'),
  '21': () => t('label.serial'),
  '30': () => t('label.quantity'),
  '37': () => t('label.pack-size'),
};

const chipLabel = (read: ReadScan): string =>
  read.kind === 'unreadable'
    ? t('label.reads-as-unreadable')
    : read.kind === 'gs1'
      ? t('label.reads-as-gs1')
      : itemNumber(read)
        ? t('label.reads-as-retail')
        : t('label.reads-as-plain');

const chipColour = (read: ReadScan): string =>
  read.kind === 'unreadable'
    ? 'var(--error-main)'
    : read.kind === 'gs1' || itemNumber(read)
      ? 'var(--success-main)'
      : 'var(--text-secondary)';

export const ScanReading: Component<{
  read: ReadScan;
  /** The characters as the scanner sent them, shown above this. */
  text: string;
}> = props => (
  <div class={styles.reading} data-testid="scan-reading">
    <div class={styles.summary}>
      <StatusChip label={chipLabel(props.read)} colour={chipColour(props.read)} />
      <span>
        {t('label.looked-up-as')}:{' '}
        <Show
          when={scanCode(props.read)}
          fallback={
            <span data-testid="scan-lookup-code">
              {t('messages.scan-has-no-code')}
            </span>
          }
        >
          {code => (
            <code class={styles.code} data-testid="scan-lookup-code">
              {visualiseRaw(code())}
            </code>
          )}
        </Show>
      </span>
    </div>
    {/* Only where tidying changed something — a stripped separator or
        in-text symbology identifier. Comparisons against the reference read
        count characters in THIS, not in the raw text above. */}
    <Show when={props.read.content !== props.text}>
      <span>
        {t('label.after-tidying')}:{' '}
        <code class={styles.code} data-testid="scan-tidied">
          {visualiseRaw(props.read.content)}
        </code>
      </span>
    </Show>
    <Show when={props.read.kind === 'gs1' ? props.read.elements : undefined}>
      {elements => (
        <dl class={styles.elements} data-testid="scan-gs1-elements">
          <For each={elements()}>
            {element => (
              <>
                <dt class={styles.ai}>
                  ({element.ai})
                  <Show when={ELEMENT_LABELS[element.ai]}>
                    {label => <span class={styles.aiName}> {label()()}</span>}
                  </Show>
                </dt>
                <dd class={styles.value}>
                  {visualiseRaw(element.data)}
                  <Show when={DATE_AIS.has(element.ai)}>
                    {' → '}
                    {gs1Date(element.data, new Date()) ?? t('label.not-a-date')}
                  </Show>
                </dd>
              </>
            )}
          </For>
        </dl>
      )}
    </Show>
  </div>
);

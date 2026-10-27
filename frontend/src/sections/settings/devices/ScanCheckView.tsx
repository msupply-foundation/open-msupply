import { Match, Show, Switch, type Component } from 'solid-js';
import { formatNumber, t } from '../../../intl';
import { localisedDate } from '../../../intl/formatDateTime';
import { Alert } from '../../../ui/elements/feedback/Alert';
import { LabelledValue } from '../../../ui/elements/typography/LabelledValue';
import { HStack } from '../../../ui/layout/Stack/HStack';
import { Stack } from '../../../ui/layout/Stack/Stack';
import { scannerInputName } from './scannerSourceModel';
import type { ItemMatch, ScanCheck } from './scanCheck';
import styles from './TestScannerPage.module.css';

/*
 * One scan, as the Test scanner screen's plain test section says it
 * (spec/settings/ui-surface.md § S2 — test section): that the scanner works,
 * which item the barcode belongs to, what the label says, and which input
 * read it — in the words of whoever is holding the scanner
 * (OMS-REG-SET-05.64–.66). Presentational only; the page owns the scan.
 */

/** What the section says about the item, in words. */
const ItemValue: Component<{ item: ItemMatch }> = props => (
  <Switch>
    <Match when={props.item.kind === 'item' && props.item}>
      {item => (
        <span data-testid="scan-check-item">
          {item().name} <span class={styles.secondary}>{item().code}</span>
        </span>
      )}
    </Match>
    <Match when={props.item.kind === 'checking'}>
      {t('messages.scan-item-checking')}
    </Match>
    <Match when={props.item.kind === 'not-linked'}>
      {t('messages.scan-not-linked')}
    </Match>
    <Match when={props.item.kind === 'no-code'}>
      {t('messages.scan-no-item-number')}
    </Match>
    <Match when={props.item.kind === 'not-in-store'}>
      {t('messages.scan-item-not-in-store')}
    </Match>
    <Match when={props.item.kind === 'several' ? props.item : undefined}>
      {several => t('messages.scan-several-items', { count: several().count })}
    </Match>
    <Match when={props.item.kind === 'failed'}>
      {t('messages.scan-item-check-failed')}
    </Match>
  </Switch>
);

export const ScanCheckView: Component<{ check: ScanCheck }> = props => (
  <Stack gap="md" data-testid="scan-check-result">
    {/* The alert's icon and words carry the meaning, never its tint alone
        (OMS-REG-SET-05.64). */}
    <Alert severity="success" testId="scan-check-working">
      {t('messages.scanner-working')}
    </Alert>
    <LabelledValue label={t('label.item')}>
      <ItemValue item={props.check.item} />
    </LabelledValue>
    <HStack gap="lg" wrap align="start">
      <Show when={props.check.code}>
        {code => (
          <LabelledValue label={t('label.barcode')}>{code()}</LabelledValue>
        )}
      </Show>
      <Show when={props.check.batch}>
        {batch => (
          <LabelledValue label={t('label.batch')}>{batch()}</LabelledValue>
        )}
      </Show>
      <Show when={props.check.expiryDate}>
        {expiry => (
          <LabelledValue label={t('label.expiry-date')}>
            {localisedDate(expiry())}
          </LabelledValue>
        )}
      </Show>
      <Show when={props.check.quantity}>
        {quantity => (
          <LabelledValue label={t('label.quantity')}>
            {formatNumber(quantity())}
          </LabelledValue>
        )}
      </Show>
      <Show when={props.check.source}>
        {source => (
          <LabelledValue label={t('label.scanned-with')}>
            {scannerInputName(source())}
          </LabelledValue>
        )}
      </Show>
    </HStack>
  </Stack>
);

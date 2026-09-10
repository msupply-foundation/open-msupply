import { createResource, Match, Show, Switch } from 'solid-js';
import type { Component } from 'solid-js';
import { graphqlFetch } from '@/api/graphql';
import { gated } from '@/api/gated';
import { localisedDateTime, t } from '@/intl';
import { Stack } from '@/ui/layout/Stack/Stack';
import { HStack } from '@/ui/layout/Stack/HStack';
import { Text } from '@/ui/elements/typography/Text';
import { LabelledValue } from '@/ui/elements/typography/LabelledValue';
import { Button } from '@/ui/elements/buttons/Button';
import { IconButton } from '@/ui/elements/buttons/IconButton';
import { Spinner } from '@/ui/elements/feedback/Spinner';
import { CloseIcon } from '@/ui/icons';
import { BreachSummary as BreachSummaryQuery } from '../monitoring.generated';
import { BreachGlyphMarker } from '../monitoring/BreachTypeCell';
import type { ListedBreach } from '../monitoring/monitoringState';

// S2 — the breach summary popover's content (spec/cold-chain-monitoring
// ui-surface S2): identify the breach behind a chart marker without leaving
// the chart. Mounted by the Popover on its first open, so the by-id read
// fires then and once. Top to bottom: the close affordance at the inline-end;
// the heading (sensor name, "Breach", the hot/cold glyph); the three labelled
// rows; the way through to the Breaches tab.

export interface BreachSummaryProps {
  storeId: string;
  breachId: string;
  /** Dismiss the popover. */
  close: () => void;
  /** Switch to the Breaches tab, sorted by breach start, with the shared
   *  filters widened so THIS breach is listed (rules › the chart). */
  onViewAllBreaches: (breach: ListedBreach) => void;
}

export const BreachSummary: Component<BreachSummaryProps> = props => {
  // `background`: a breach that cannot be loaded says so IN PLACE of the
  // summary (ui-surface S2), not through the global modal. Read through the
  // gate — this popover lives under the open screen's boundary, and a
  // suspending read would remount the chart beneath it.
  const [data] = createResource(
    () => ({ storeId: props.storeId, id: props.breachId }),
    async variables => {
      const result = await graphqlFetch(BreachSummaryQuery, variables, {
        background: true,
      });
      if (result.kind !== 'success') return { kind: 'error' as const };
      const breach = result.data.temperatureBreaches.nodes[0];
      return breach
        ? { kind: 'ok' as const, breach }
        : { kind: 'error' as const };
    }
  );
  const loaded = () => gated(data);
  const failed = () => loaded()?.kind === 'error';
  const breach = () => {
    const result = loaded();
    return result?.kind === 'ok' ? result.breach : undefined;
  };

  return (
    <Stack gap="sm" data-testid="breach-summary">
      <HStack justify="end">
        <IconButton
          icon={<CloseIcon />}
          label={t('button.close')}
          size="small"
          onClick={() => props.close()}
        />
      </HStack>
      <Switch fallback={<Spinner center />}>
        <Match when={failed()}>
          <Text variant="body">{t('error.unable-to-load-breach')}</Text>
        </Match>
        <Match when={breach()}>
          {b => (
            <>
              <HStack gap="sm">
                <Text variant="heading" level={3}>
                  {b().sensor?.name} {t('heading.breach')}
                </Text>
                <BreachGlyphMarker type={b().type} />
              </HStack>
              {/* The location's NAME here, where the tables show its code
                  (contract ⚠️ wire trap). */}
              <LabelledValue label={t('label.location')}>
                {b().location?.name ?? ''}
              </LabelledValue>
              <LabelledValue label={t('label.breach-start')}>
                {localisedDateTime(b().startDatetime)}
              </LabelledValue>
              <LabelledValue label={t('label.breach-end')}>
                <Show when={b().endDatetime}>
                  {end => localisedDateTime(end())}
                </Show>
              </LabelledValue>
              <HStack justify="center">
                <Button
                  variant="secondary"
                  size="small"
                  data-testid="view-all-breaches-button"
                  onClick={() => {
                    props.close();
                    props.onViewAllBreaches(b());
                  }}
                >
                  {t('button.view-all-breaches')}
                </Button>
              </HStack>
            </>
          )}
        </Match>
      </Switch>
    </Stack>
  );
};

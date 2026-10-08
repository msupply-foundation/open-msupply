import { Show } from 'solid-js';
import type { Component } from 'solid-js';
import { t } from '@/intl';
import { HStack } from '@/ui/layout/Stack/HStack';
import { StatusMarker } from '@/ui/elements/feedback/StatusMarker';
import { AlertCircleIcon, SnowflakeIcon, SunIcon } from '@/ui/icons';
import {
  breachGlyph,
  breachShapeLabelKey,
  breachTypeLabelKey,
  type BreachGlyph,
  type BreachType,
} from './breachDisplay';

// The glyph-plus-word treatment of a breach kind, shared by T2's Type column
// and T3's Breach type column (ui-surface): a sun in the warning tone for hot,
// a snowflake in the cool tone for cold, then Cumulative or Consecutive. The
// glyph carries the kind's FULL name as its accessible label, so the tone is
// never the only carrier (accessibility › colour independence). An excursion
// — a kind with neither half — is named as itself behind an alert glyph
// rather than falling through to a cold consecutive breach (README › known
// gaps).

const ICONS = {
  hot: SunIcon,
  cold: SnowflakeIcon,
  excursion: AlertCircleIcon,
} as const;

const SEVERITY: Record<BreachGlyph, 'warning' | 'info'> = {
  hot: 'warning',
  cold: 'info',
  excursion: 'warning',
};

/** The toned glyph alone — for a heading beside the kind's name. */
export const BreachGlyphMarker: Component<{ type: BreachType }> = props => (
  <StatusMarker
    severity={SEVERITY[breachGlyph(props.type)]}
    icon={ICONS[breachGlyph(props.type)]}
    label={t(breachTypeLabelKey(props.type))}
  />
);

export const BreachTypeCell: Component<{
  type: BreachType | null | undefined;
}> = props => (
  <Show when={props.type}>
    {type => (
      <HStack gap="sm">
        <BreachGlyphMarker type={type()} />
        {t(breachShapeLabelKey(type()))}
      </HStack>
    )}
  </Show>
);

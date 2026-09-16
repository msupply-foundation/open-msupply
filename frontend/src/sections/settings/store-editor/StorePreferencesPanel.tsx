import { createSignal, For, Match, Show, Switch, type JSX } from 'solid-js';
import { t, type LocaleKey } from '../../../intl';
import { TextField } from '../../../ui/elements/inputs/TextField';
import { NumberField } from '../../../ui/elements/inputs/NumberField';
import { Checkbox } from '../../../ui/elements/inputs/Checkbox';
import { ToggleSwitch } from '../../../ui/elements/inputs/ToggleSwitch';
import { IconButton } from '../../../ui/elements/buttons/IconButton';
import {
  ColourTagDot,
  ColourTagPicker,
} from '../../../ui/elements/selectors/ColourTag';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '../../../ui/elements/accordion/Accordion';
import { Alert } from '../../../ui/elements/feedback/Alert';
import { EmptyState } from '../../../ui/elements/feedback/EmptyState';
import { Text } from '../../../ui/elements/typography/Text';
import { Stack } from '../../../ui/layout/Stack/Stack';
import { CloseIcon } from '../../../ui/icons';
import {
  asBool,
  asColour,
  asNumber,
  asStatusList,
  asWarnParts,
  IMMUTABLE_INVOICE_STATUSES,
  INBOUND_STATUS_OPTIONS,
  matchesPreferenceFilter,
  OUTBOUND_STATUS_OPTIONS,
  preferenceValue,
  toggleInvoiceStatus,
  type InvoiceStatusOption,
  type PreferenceDraft,
  type StorePreference,
  type WarnStocktakeParts,
} from './storeEditorLogic';
import styles from './StorePreferencesPanel.module.css';

/*
 * S5 › the Preferences panel (spec/settings/ui-surface.md § S5): a text filter,
 * then one labelled row per store preference in the SERVED order — the
 * server's catalogue order is the display order (contract § The store
 * editor). Each row is label inline-start, control inline-end, on the
 * hairline row rhythm (the module CSS); the two composites — the
 * recent-stocktake group and the invoice-status choice — take a full-width
 * block each. Every control is disabled unless this is a central server and
 * the session holds the central-data permission (OMS-REG-SET-05.36); the
 * filter stays enabled.
 *
 * Controls are written out per kind rather than resolved from a config map
 * (kdd/explicit-composition).
 */
export const StorePreferencesPanel = (props: {
  preferences: StorePreference[];
  draft: PreferenceDraft;
  disabled: boolean;
  /** True while the catalogue read is still in flight — suppresses the
   *  empty state so it never flashes before rows land (as Properties). */
  loading: boolean;
  onStage: (key: string, value: unknown) => void;
}) => {
  const [filter, setFilter] = createSignal('');
  // The invoice-status guard's refusal (SET-05.38) — shown after a refused
  // uncheck, cleared by the next successful toggle.
  const [statusGuardShown, setStatusGuardShown] = createSignal(false);

  // Each preference's label is its own key under `preference.` — the ported
  // dictionary carries every store key (ui-surface § S5), so the dynamic key
  // is the sanctioned `as LocaleKey` narrowing used app-wide.
  const label = (preference: StorePreference) =>
    t(`preference.${preference.key}` as LocaleKey);

  const visible = () =>
    props.preferences.filter(preference =>
      matchesPreferenceFilter(label(preference), filter())
    );

  const value = (preference: StorePreference) =>
    preferenceValue(preference, props.draft);

  const stageStatusToggle = (
    current: readonly InvoiceStatusOption[],
    status: InvoiceStatusOption,
    checked: boolean
  ) => {
    const next = toggleInvoiceStatus(current, status, checked);
    setStatusGuardShown(next === null);
    if (next !== null) props.onStage('invoiceStatusOptions', next);
  };

  // One preference row: the visible label inline-start, the control hugging
  // the inline-end (the control hides its own label — FieldRow contract).
  const Row = (rowProps: { label: string; children: JSX.Element }) => (
    <div class={styles.row}>
      <span class={styles.label}>{rowProps.label}</span>
      {rowProps.children}
    </div>
  );

  // The recent-stocktake composite: ONE preference of three parts, presented
  // as a collapsible group closed by default (SET-05.39). Any part's edit
  // stages the whole three-part value.
  const WarnStocktakeGroup = (groupProps: { preference: StorePreference }) => {
    const parts = () => asWarnParts(value(groupProps.preference));
    const stagePart = (patch: Partial<WarnStocktakeParts>) =>
      props.onStage(groupProps.preference.key, { ...parts(), ...patch });
    const partLabel = (part: 'enabled' | 'maxAge' | 'minItems') =>
      t(`preference.warnWhenMissingRecentStocktake.${part}` as LocaleKey);
    return (
      <Accordion multiple>
        <AccordionItem value="warn-when-missing-recent-stocktake">
          <AccordionTrigger>{label(groupProps.preference)}</AccordionTrigger>
          <AccordionContent>
            <Stack>
              <Text variant="bodySmall">
                {t('preference.warnWhenMissingRecentStocktake.description')}
              </Text>
              <div class={styles.rows}>
                <Row label={partLabel('enabled')}>
                  <ToggleSwitch
                    label={partLabel('enabled')}
                    hideLabel
                    checked={parts().enabled}
                    disabled={props.disabled}
                    testId="store-preference-warn-stocktake-enabled"
                    onChange={enabled => stagePart({ enabled })}
                  />
                </Row>
                <Row label={partLabel('maxAge')}>
                  <NumberField
                    label={partLabel('maxAge')}
                    hideLabel
                    width="compact"
                    value={parts().maxAge}
                    decimalLimit={0}
                    disabled={props.disabled || !parts().enabled}
                    data-testid="store-preference-warn-stocktake-max-age"
                    onChange={maxAge => stagePart({ maxAge: maxAge ?? 0 })}
                  />
                </Row>
                <Row label={partLabel('minItems')}>
                  <NumberField
                    label={partLabel('minItems')}
                    hideLabel
                    width="compact"
                    value={parts().minItems}
                    decimalLimit={0}
                    disabled={props.disabled || !parts().enabled}
                    data-testid="store-preference-warn-stocktake-min-items"
                    onChange={minItems =>
                      stagePart({ minItems: minItems ?? 0 })
                    }
                  />
                </Row>
              </div>
            </Stack>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    );
  };

  const StatusGroup = (groupProps: {
    heading: string;
    /** Distinguishes the two groups' testids (NEW appears in both). */
    idPrefix: string;
    options: readonly InvoiceStatusOption[];
    current: InvoiceStatusOption[];
  }) => (
    <Stack gap="sm">
      <Text variant="subtitle">{groupProps.heading}</Text>
      <div class={styles.statusGrid}>
        <For each={groupProps.options}>
          {status => (
            <Checkbox
              label={t(`status.${status.toLowerCase()}` as LocaleKey)}
              checked={groupProps.current.includes(status)}
              disabled={
                props.disabled || IMMUTABLE_INVOICE_STATUSES.includes(status)
              }
              testId={`store-preference-invoice-status-${groupProps.idPrefix}-${status.toLowerCase()}`}
              onChange={checked =>
                stageStatusToggle(groupProps.current, status, checked)
              }
            />
          )}
        </For>
      </div>
    </Stack>
  );

  return (
    <Stack>
      <TextField
        label={t('label.filter-preferences')}
        hideLabel
        value={filter()}
        onInput={event => setFilter(event.currentTarget.value)}
        data-testid="store-preferences-filter"
        endAction={
          <Show when={filter() !== ''}>
            <IconButton
              icon={<CloseIcon />}
              label={t('label.clear-filter')}
              size="small"
              onClick={() => setFilter('')}
            />
          </Show>
        }
      />
      <Show
        when={visible().length > 0}
        fallback={
          <Show when={!props.loading}>
            <EmptyState
              message={t('error.no-results')}
              data-testid="store-preferences-empty"
            />
          </Show>
        }
      >
        <div class={styles.rows}>
          <For each={visible()}>
            {preference => (
              <Switch>
                <Match when={preference.valueType === 'BOOLEAN'}>
                  <Row label={label(preference)}>
                    <ToggleSwitch
                      label={label(preference)}
                      hideLabel
                      checked={asBool(value(preference))}
                      disabled={props.disabled}
                      testId={`store-preference-${preference.key}`}
                      onChange={checked =>
                        props.onStage(preference.key, checked)
                      }
                    />
                  </Row>
                </Match>
                <Match
                  when={
                    preference.valueType === 'INTEGER' ||
                    preference.valueType === 'FLOAT'
                  }
                >
                  <Row label={label(preference)}>
                    <NumberField
                      label={label(preference)}
                      hideLabel
                      width="compact"
                      value={asNumber(value(preference))}
                      // A whole number stays whole; a fractional threshold
                      // gets two places, as the reference app.
                      decimalLimit={preference.valueType === 'FLOAT' ? 2 : 0}
                      disabled={props.disabled}
                      data-testid={`store-preference-${preference.key}`}
                      // The wire has no "unset" — a cleared field stages the
                      // kind's zero (rules § The store editor › Preferences).
                      onChange={next =>
                        props.onStage(preference.key, next ?? 0)
                      }
                    />
                  </Row>
                </Match>
                <Match when={preference.valueType === 'COLOUR'}>
                  <Row label={label(preference)}>
                    <Show
                      when={!props.disabled}
                      fallback={
                        <ColourTagDot
                          colour={asColour(value(preference)) || null}
                        />
                      }
                    >
                      <ColourTagPicker
                        colour={asColour(value(preference)) || null}
                        label={label(preference)}
                        variant="field"
                        allowCustom
                        onSelect={colour =>
                          props.onStage(preference.key, colour)
                        }
                        // Reset stages the kind's zero — "no colour" (SET-05.40).
                        onReset={() => props.onStage(preference.key, '')}
                      />
                    </Show>
                  </Row>
                </Match>
                <Match
                  when={
                    preference.valueType ===
                    'WARN_WHEN_MISSING_RECENT_STOCKTAKE_DATA'
                  }
                >
                  <div class={styles.block}>
                    <WarnStocktakeGroup preference={preference} />
                  </div>
                </Match>
                <Match when={preference.valueType === 'MULTI_CHOICE'}>
                  {/* The invoice-status choice: two labelled groups over ONE
                      stored set; bookends immutable; the Delivered/Received
                      pair can never both be off (SET-05.38). */}
                  <div class={styles.block}>
                    <Stack gap="sm">
                      <span class={styles.label}>{label(preference)}</span>
                      <StatusGroup
                        heading={`${t('label.outbound-shipment')} / ${t('supplier-return')}`}
                        idPrefix="outbound"
                        options={OUTBOUND_STATUS_OPTIONS}
                        current={asStatusList(value(preference))}
                      />
                      <StatusGroup
                        heading={`${t('label.inbound-shipment')} / ${t('customer-return')}`}
                        idPrefix="inbound"
                        options={INBOUND_STATUS_OPTIONS}
                        current={asStatusList(value(preference))}
                      />
                      <Show when={statusGuardShown()}>
                        <Alert
                          severity="error"
                          testId="store-preference-invoice-status-error"
                        >
                          {t(
                            'error.invoice-status-inbound-requires-delivered-or-received'
                          )}
                        </Alert>
                      </Show>
                    </Stack>
                  </div>
                </Match>
              </Switch>
            )}
          </For>
        </div>
      </Show>
    </Stack>
  );
};

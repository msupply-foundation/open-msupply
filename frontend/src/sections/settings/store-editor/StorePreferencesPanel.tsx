import { createSignal, For, Match, Show, Switch } from 'solid-js';
import { t, type LocaleKey } from '../../../intl';
import { TextField } from '../../../ui/elements/inputs/TextField';
import { NumberField } from '../../../ui/elements/inputs/NumberField';
import { Checkbox } from '../../../ui/elements/inputs/Checkbox';
import { ToggleSwitch } from '../../../ui/elements/inputs/ToggleSwitch';
import { FieldRow } from '../../../ui/elements/inputs/FieldRow';
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
} from './storeEditorLogic';

/*
 * S5 › the Preferences panel (spec/settings/ui-surface.md § S5): a text filter,
 * then one field per store preference in the SERVED order — the server's
 * catalogue order is the display order (contract § The store editor). Each
 * field follows the Properties panel's rhythm: full width, the control's own
 * label above it, a switch being the label-beside exception (D114). Every
 * control is disabled unless this is a central server and the session holds
 * the central-data permission (OMS-REG-SET-05.36); the filter stays enabled.
 *
 * Controls are written out per kind rather than resolved from a config map
 * (kdd/explicit-composition) — the composite recent-stocktake group and the
 * invoice-status choice each get their own explicit block below.
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
  // The invoice-status guard's refusal message (SET-05.38) — cleared by the
  // next successful toggle.
  const [statusGuardMessage, setStatusGuardMessage] = createSignal<
    string | undefined
  >();

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
    if (next === null) {
      setStatusGuardMessage(
        t('error.invoice-status-inbound-requires-delivered-or-received')
      );
      return;
    }
    setStatusGuardMessage(undefined);
    props.onStage('invoiceStatusOptions', next);
  };

  const isImmutableStatus = (status: InvoiceStatusOption) =>
    (IMMUTABLE_INVOICE_STATUSES as readonly InvoiceStatusOption[]).includes(
      status
    );

  const StatusGroup = (groupProps: {
    heading: string;
    /** Distinguishes the two groups' testids (NEW appears in both). */
    idPrefix: string;
    options: readonly InvoiceStatusOption[];
    current: InvoiceStatusOption[];
  }) => (
    <Stack gap="sm">
      <Text variant="subtitle">{groupProps.heading}</Text>
      <For each={groupProps.options}>
        {status => (
          <Checkbox
            label={t(`status.${status.toLowerCase()}` as LocaleKey)}
            checked={groupProps.current.includes(status)}
            disabled={props.disabled || isImmutableStatus(status)}
            testId={`store-preference-invoice-status-${groupProps.idPrefix}-${status.toLowerCase()}`}
            onChange={checked =>
              stageStatusToggle(groupProps.current, status, checked)
            }
          />
        )}
      </For>
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
        <Stack>
          <For each={visible()}>
            {preference => (
              <Switch>
                <Match when={preference.valueType === 'BOOLEAN'}>
                  {/* A switch is the label-beside exception, as the Properties
                      panel's checkbox (D114). */}
                  <ToggleSwitch
                    label={label(preference)}
                    checked={asBool(value(preference))}
                    disabled={props.disabled}
                    testId={`store-preference-${preference.key}`}
                    onChange={checked => props.onStage(preference.key, checked)}
                  />
                </Match>
                <Match
                  when={
                    preference.valueType === 'INTEGER' ||
                    preference.valueType === 'FLOAT'
                  }
                >
                  <NumberField
                    label={label(preference)}
                    value={asNumber(value(preference))}
                    // A whole number stays whole; a fractional threshold gets
                    // two places, as the reference app.
                    decimalLimit={preference.valueType === 'FLOAT' ? 2 : 0}
                    disabled={props.disabled}
                    data-testid={`store-preference-${preference.key}`}
                    // The wire has no "unset" — a cleared field stages the
                    // kind's zero (rules § The store editor › Preferences).
                    onChange={next => props.onStage(preference.key, next ?? 0)}
                  />
                </Match>
                <Match when={preference.valueType === 'COLOUR'}>
                  {/* Label beside the dot — a label above an isolated dot
                      reads as a heading over nothing, as the checkbox rule. */}
                  <FieldRow label={label(preference)} labelWidth="auto">
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
                        onSelect={colour =>
                          props.onStage(preference.key, colour)
                        }
                      />
                    </Show>
                  </FieldRow>
                </Match>
                <Match
                  when={
                    preference.valueType ===
                    'WARN_WHEN_MISSING_RECENT_STOCKTAKE_DATA'
                  }
                >
                  {/* ONE preference of three parts, presented as a collapsible
                      group, closed by default (SET-05.39). Any part's edit
                      stages the whole three-part value. */}
                  <Accordion multiple>
                    <AccordionItem value="warn-when-missing-recent-stocktake">
                      <AccordionTrigger>{label(preference)}</AccordionTrigger>
                      <AccordionContent>
                        <Stack>
                          <Text variant="bodySmall">
                            {t(
                              'preference.warnWhenMissingRecentStocktake.description'
                            )}
                          </Text>
                          <ToggleSwitch
                            label={t(
                              'preference.warnWhenMissingRecentStocktake.enabled'
                            )}
                            checked={asWarnParts(value(preference)).enabled}
                            disabled={props.disabled}
                            testId="store-preference-warn-stocktake-enabled"
                            onChange={enabled =>
                              props.onStage(preference.key, {
                                ...asWarnParts(value(preference)),
                                enabled,
                              })
                            }
                          />
                          <NumberField
                            label={t(
                              'preference.warnWhenMissingRecentStocktake.maxAge'
                            )}
                            value={asWarnParts(value(preference)).maxAge}
                            decimalLimit={0}
                            disabled={
                              props.disabled ||
                              !asWarnParts(value(preference)).enabled
                            }
                            data-testid="store-preference-warn-stocktake-max-age"
                            onChange={maxAge =>
                              props.onStage(preference.key, {
                                ...asWarnParts(value(preference)),
                                maxAge: maxAge ?? 0,
                              })
                            }
                          />
                          <NumberField
                            label={t(
                              'preference.warnWhenMissingRecentStocktake.minItems'
                            )}
                            value={asWarnParts(value(preference)).minItems}
                            decimalLimit={0}
                            disabled={
                              props.disabled ||
                              !asWarnParts(value(preference)).enabled
                            }
                            data-testid="store-preference-warn-stocktake-min-items"
                            onChange={minItems =>
                              props.onStage(preference.key, {
                                ...asWarnParts(value(preference)),
                                minItems: minItems ?? 0,
                              })
                            }
                          />
                        </Stack>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </Match>
                <Match when={preference.valueType === 'MULTI_CHOICE'}>
                  {/* The invoice-status choice: two labelled groups over ONE
                      stored set; bookends immutable; the Delivered/Received
                      pair can never both be off (SET-05.38). */}
                  <Stack gap="sm">
                    <Text>{label(preference)}</Text>
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
                    <Show when={statusGuardMessage()}>
                      {message => (
                        <Alert
                          severity="error"
                          testId="store-preference-invoice-status-error"
                        >
                          {message()}
                        </Alert>
                      )}
                    </Show>
                  </Stack>
                </Match>
              </Switch>
            )}
          </For>
        </Stack>
      </Show>
    </Stack>
  );
};

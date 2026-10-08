import {
  createResource,
  createSignal,
  For,
  Match,
  onCleanup,
  Show,
  Switch,
  type Component,
  type JSX,
} from 'solid-js';
import { useParams } from '@solidjs/router';
import { graphqlFetch } from '../../api/graphql';
import { isCentralServer } from '../../api/serverInfo';
import { hasPermission } from '../../store/storeContext';
import { t, type LocaleKey } from '../../intl';
import { Page } from '../../ui/layout/Page/Page';
import { Header } from '../../ui/layout/Header/Header';
import { Breadcrumb } from '../../ui/layout/Header/Breadcrumb';
import { ContentContainer } from '../../ui/layout/ContentContainer/ContentContainer';
import { Stack } from '../../ui/layout/Stack/Stack';
import { TextField } from '../../ui/elements/inputs/TextField';
import { NumberField } from '../../ui/elements/inputs/NumberField';
import { ToggleSwitch } from '../../ui/elements/inputs/ToggleSwitch';
import { Checkbox } from '../../ui/elements/inputs/Checkbox';
import { IconButton } from '../../ui/elements/buttons/IconButton';
import { Button } from '../../ui/elements/buttons/Button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '../../ui/elements/accordion/Accordion';
import { Alert } from '../../ui/elements/feedback/Alert';
import { EmptyState } from '../../ui/elements/feedback/EmptyState';
import { Text } from '../../ui/elements/typography/Text';
import { CloseIcon, EditIcon } from '../../ui/icons';
import {
  GlobalPreferences,
  UpsertGlobalPreferences,
} from './globalPreferences.generated';
import {
  asBackdatingParts,
  asBool,
  asNumber,
  buildAutoSaveInput,
  canEditGlobalPreferences,
  filterCatalogue,
  genderLabelKey,
  groupPreferences,
  isAmcExplainerShown,
  OFFERED_GENDER_OPTIONS,
  preferenceLabelKey,
  selectedGenders,
  toggleGender,
  type BackdatingParts,
  type GlobalPreference,
  type PreferenceGroup,
} from './globalPreferencesLogic';
import { asV2 } from './translationsLogic';
import { CustomTranslationsModal } from './CustomTranslationsModal';
import styles from './GlobalPreferencesPage.module.css';

/** How long rapid successive edits to one preference coalesce before the
 *  one-field auto-save fires (rules § Editing — the final value persists). */
const AUTO_SAVE_DEBOUNCE_MS = 350;

/*
 * S1 — the Global preferences page (spec/global-preferences/ui-surface.md
 * § S1): a centred column — filter, the ungrouped rows in SERVED order,
 * then the four group accordions (closed on arrival) — where every control
 * saves its own change immediately (no Save button, OMS-REG-GPREF-01.8).
 * Controls are written out per kind rather than resolved from a config map
 * (kdd/explicit-composition).
 *
 * Saved values live in a local overrides map layered over the served
 * catalogue — a successful save keeps the control's value with no refetch; a
 * failed one drops the override so the control reverts, with an inline notice
 * keyed to the row (OMS-REG-GPREF-01.11; controls › action feedback — never a
 * toast).
 */
const GlobalPreferencesPage: Component = () => {
  const params = useParams<{ storeId: string }>();

  // The catalogue — a screen's own first load, so the plain suspending read
  // is fine (kdd/solid-reactivity-pitfalls: direct reads are reserved for
  // exactly this). Never refetched: auto-saves land in `overrides`.
  const [preferencesData] = createResource(
    () => params.storeId,
    async storeId => {
      const result = await graphqlFetch(GlobalPreferences, { storeId });
      return result.kind === 'success'
        ? result.data.preferenceDescriptions
        : [];
    }
  );
  const preferences = () => preferencesData.latest ?? [];

  const [filter, setFilter] = createSignal('');
  // Values saved (or being saved) this visit, keyed by preference key —
  // layered over the served value. `undefined` IS a member state: a cleared
  // number shows empty while the stored value stands (rules § Editing).
  const [overrides, setOverrides] = createSignal<Record<string, unknown>>({});
  // Keys whose last save failed — each shows an inline notice under its row.
  const [failedKeys, setFailedKeys] = createSignal<ReadonlySet<string>>(
    new Set()
  );
  const [translationsOpen, setTranslationsOpen] = createSignal(false);

  const disabled = () =>
    !canEditGlobalPreferences({
      canEditCentralData: hasPermission('EDIT_CENTRAL_DATA'),
      isCentralServer: isCentralServer(),
    });

  const label = (preference: GlobalPreference) =>
    t(preferenceLabelKey(preference.key) as LocaleKey);
  const groupLabel = (group: PreferenceGroup) => t(group.labelKey);

  const current = (preference: GlobalPreference) =>
    preference.key in overrides()
      ? overrides()[preference.key]
      : preference.value;

  const catalogue = () =>
    filterCatalogue(
      groupPreferences(preferences()),
      label,
      groupLabel,
      filter()
    );
  const nothingVisible = () =>
    catalogue().ungrouped.length === 0 && catalogue().groups.length === 0;

  // -------------------------------------------------------------------------
  // Auto-save: one debounced, one-field write per changed preference
  // (contract § Editing). Per-key timers so edits to different preferences
  // never coalesce with each other.
  const timers = new Map<string, ReturnType<typeof setTimeout>>();
  onCleanup(() => timers.forEach(timer => clearTimeout(timer)));

  const save = async (key: GlobalPreference['key']) => {
    const input = buildAutoSaveInput(key, overrides()[key]);
    if (!input) return;
    // Local error handling (returnGraphqlErrors): the refusal reverts ONE
    // control in place rather than the global error modal closing over the
    // page (contract § Editing — bare OkResponse, failures are top-level
    // GraphQL errors).
    const result = await graphqlFetch(
      UpsertGlobalPreferences,
      { storeId: params.storeId, input },
      { background: true, returnGraphqlErrors: true }
    );
    const ok =
      result.kind === 'success' &&
      result.data.centralServer.preferences.upsertPreferences.ok;
    setFailedKeys(previous => {
      const next = new Set(previous);
      if (ok) next.delete(key);
      else next.add(key);
      return next;
    });
    // A newer edit is already pending — its save owns the outcome; leave the
    // newer value in place either way.
    if (timers.has(key)) return;
    if (!ok) setOverrides(({ [key]: _dropped, ...rest }) => rest); // revert to stored
  };

  const stage = (preference: GlobalPreference, value: unknown) => {
    setOverrides(previous => ({ ...previous, [preference.key]: value }));
    const pending = timers.get(preference.key);
    if (pending) clearTimeout(pending);
    // A cleared number saves nothing — the field shows empty, the stored
    // value stands (rules § Editing, OMS-REG-GPREF-01.10).
    if (value === undefined) {
      timers.delete(preference.key);
      return;
    }
    timers.set(
      preference.key,
      setTimeout(() => {
        timers.delete(preference.key);
        void save(preference.key);
      }, AUTO_SAVE_DEBOUNCE_MS)
    );
  };

  // -------------------------------------------------------------------------
  // Rows — one explicit control per kind (ui-surface § S1 › The catalogue)

  const Row = (rowProps: { label: string; children: JSX.Element }) => (
    <div class={styles.row}>
      <span class={styles.label}>{rowProps.label}</span>
      {rowProps.children}
    </div>
  );

  /** The inline save-failure notice keyed to its row (OMS-REG-GPREF-01.11). */
  const RowError = (errorProps: { preference: GlobalPreference }) => (
    <Show when={failedKeys().has(errorProps.preference.key)}>
      <Alert severity="error" testId="global-preference-row-error">
        {t('error.something-wrong')}
      </Alert>
    </Show>
  );

  /* The gender choice set: the seven offered genders in a two-column grid;
     toggling one saves the new selection, no minimum enforced
     (OMS-REG-GPREF-01.12). */
  const GenderChoice = (choiceProps: { preference: GlobalPreference }) => (
    <div class={styles.block}>
      <span class={styles.label}>{label(choiceProps.preference)}</span>
      <div class={styles.choiceGrid}>
        <For each={OFFERED_GENDER_OPTIONS}>
          {option => (
            <Checkbox
              label={t(genderLabelKey(option) as LocaleKey)}
              checked={selectedGenders(
                current(choiceProps.preference)
              ).includes(option)}
              disabled={disabled()}
              testId={`global-preference-gender-${option.toLowerCase()}`}
              onChange={checked =>
                stage(
                  choiceProps.preference,
                  toggleGender(current(choiceProps.preference), option, checked)
                )
              }
            />
          )}
        </For>
      </div>
      <RowError preference={choiceProps.preference} />
    </div>
  );

  /* The backdating composite: three sub-rows; the number is editable only
     while a switch is on; any part's change saves the whole value
     (OMS-REG-GPREF-01.13). */
  const BackdatingRows = (backProps: { preference: GlobalPreference }) => {
    const parts = () => asBackdatingParts(current(backProps.preference));
    const stagePart = (patch: Partial<BackdatingParts>) =>
      stage(backProps.preference, { ...parts(), ...patch });
    return (
      <>
        <Row label={t('preference.allowBackdatingOfShipments')}>
          <ToggleSwitch
            label={t('preference.allowBackdatingOfShipments')}
            hideLabel
            checked={parts().shipmentsEnabled}
            disabled={disabled()}
            testId="global-preference-backdating-shipments"
            onChange={shipmentsEnabled => stagePart({ shipmentsEnabled })}
          />
        </Row>
        <Row label={t('preference.allowBackdatingOfInventoryAdjustments')}>
          <ToggleSwitch
            label={t('preference.allowBackdatingOfInventoryAdjustments')}
            hideLabel
            checked={parts().inventoryAdjustmentsEnabled}
            disabled={disabled()}
            testId="global-preference-backdating-inventory-adjustments"
            onChange={inventoryAdjustmentsEnabled =>
              stagePart({ inventoryAdjustmentsEnabled })
            }
          />
        </Row>
        <Row label={t('preference.maximumBackdatingDays')}>
          <NumberField
            label={t('preference.maximumBackdatingDays')}
            hideLabel
            width="compact"
            value={parts().maxDays}
            decimalLimit={0}
            disabled={
              disabled() ||
              (!parts().shipmentsEnabled &&
                !parts().inventoryAdjustmentsEnabled)
            }
            data-testid="global-preference-backdating-max-days"
            onChange={maxDays => stagePart({ maxDays: maxDays ?? 0 })}
          />
        </Row>
        <RowError preference={backProps.preference} />
      </>
    );
  };

  /* One catalogue row, dispatched by kind. The GLOBAL read serves BOOLEAN /
     INTEGER / FLOAT / MULTI_CHOICE (genders) / CUSTOM_TRANSLATIONS_V2 /
     BACKDATING_DATA only — other kinds are store-scoped and never arrive. */
  const PreferenceRow = (props: { preference: GlobalPreference }) => (
    <Switch>
      <Match when={props.preference.valueType === 'BOOLEAN'}>
        <Row label={label(props.preference)}>
          <ToggleSwitch
            label={label(props.preference)}
            hideLabel
            checked={asBool(current(props.preference))}
            disabled={disabled()}
            testId={`global-preference-${props.preference.key}`}
            onChange={checked => stage(props.preference, checked)}
          />
        </Row>
        <RowError preference={props.preference} />
      </Match>
      <Match
        when={
          props.preference.valueType === 'INTEGER' ||
          props.preference.valueType === 'FLOAT'
        }
      >
        <Row label={label(props.preference)}>
          <NumberField
            label={label(props.preference)}
            hideLabel
            width="compact"
            value={
              props.preference.key in overrides() &&
              overrides()[props.preference.key] === undefined
                ? undefined
                : asNumber(current(props.preference))
            }
            // A whole number stays whole; days-in-a-month gets two places
            // (rules § Editing).
            decimalLimit={props.preference.valueType === 'FLOAT' ? 2 : 0}
            disabled={disabled()}
            data-testid={`global-preference-${props.preference.key}`}
            onChange={next => stage(props.preference, next)}
          />
        </Row>
        <RowError preference={props.preference} />
      </Match>
      <Match when={props.preference.valueType === 'MULTI_CHOICE'}>
        <GenderChoice preference={props.preference} />
      </Match>
      <Match when={props.preference.valueType === 'CUSTOM_TRANSLATIONS_V2'}>
        <Row label={label(props.preference)}>
          <Button
            variant="secondary"
            onClick={() => setTranslationsOpen(true)}
            disabled={disabled()}
            data-testid="global-preference-customTranslationsV2"
          >
            <EditIcon /> {t('button.edit')}
          </Button>
        </Row>
      </Match>
      <Match when={props.preference.valueType === 'BACKDATING_DATA'}>
        <BackdatingRows preference={props.preference} />
      </Match>
    </Switch>
  );

  const translationsPreference = () =>
    preferences().find(p => p.key === 'customTranslationsV2');

  return (
    <Page
      header={
        <Header>
          <Breadcrumb crumbs={[{ label: t('global-preferences') }]} />
        </Header>
      }
    >
      <ContentContainer>
        <div class={styles.column}>
          <Stack>
            <TextField
              label={t('label.filter-preferences')}
              hideLabel
              value={filter()}
              onInput={event => setFilter(event.currentTarget.value)}
              data-testid="global-preferences-filter"
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
              when={!nothingVisible()}
              fallback={
                <Show when={!preferencesData.loading}>
                  <EmptyState
                    message={t('error.no-results')}
                    data-testid="global-preferences-empty"
                  />
                </Show>
              }
            >
              <div class={styles.rows}>
                <For each={catalogue().ungrouped}>
                  {preference => <PreferenceRow preference={preference} />}
                </For>
              </div>
              {/* The four groups, closed on arrival (OMS-REG-GPREF-01.3),
                  ordered by first member's catalogue position. */}
              <Accordion multiple>
                <For each={catalogue().groups}>
                  {group => (
                    <AccordionItem
                      value={group.labelKey.replace(/^(label|title)\./, '')}
                    >
                      <AccordionTrigger>{groupLabel(group)}</AccordionTrigger>
                      <AccordionContent>
                        <div class={styles.rows}>
                          <For each={group.members}>
                            {preference => (
                              <PreferenceRow preference={preference} />
                            )}
                          </For>
                          {/* The AMC calculation explainer, while either AMC
                              preference is active (OMS-REG-GPREF-01.7). */}
                          <Show
                            when={
                              group.labelKey ===
                                'title.average-monthly-consumption' &&
                              isAmcExplainerShown(group.members, current)
                            }
                          >
                            <div
                              class={styles.explainer}
                              data-testid="global-preferences-amc-explainer"
                            >
                              <span class={styles.label}>
                                {t('label.amc-calculation')}
                              </span>
                              <Text variant="bodySmall">
                                {t('messages.amc-calculation')}
                              </Text>
                              <Text variant="bodySmall">
                                {t('messages.amc-consumption')}
                              </Text>
                              <Text variant="bodySmall">
                                {t('messages.amc-lookback-months')}
                              </Text>
                              <Text variant="bodySmall">
                                {t('messages.amc-lookback-days')}
                              </Text>
                              <Text variant="bodySmall">
                                {t('messages.amc-days-out-of-stock')}
                              </Text>
                              <Text variant="bodySmall">
                                {t('messages.amc-days-out-of-stock-adjustment')}
                              </Text>
                              <Text variant="bodySmall">
                                {t('messages.amc-minus-transfers')}
                              </Text>
                            </div>
                          </Show>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  )}
                </For>
              </Accordion>
            </Show>
          </Stack>
        </div>
      </ContentContainer>
      <Show when={translationsOpen()}>
        <CustomTranslationsModal
          storeId={params.storeId}
          value={asV2(
            translationsPreference()
              ? current(translationsPreference()!)
              : undefined
          )}
          onSaved={nested => {
            const preference = translationsPreference();
            if (preference)
              setOverrides(previous => ({
                ...previous,
                [preference.key]: nested,
              }));
          }}
          onClose={() => setTranslationsOpen(false)}
        />
      </Show>
    </Page>
  );
};

export default GlobalPreferencesPage;

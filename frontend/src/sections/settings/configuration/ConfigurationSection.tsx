import { createResource, createSignal, Show } from 'solid-js';
import { graphqlFetch } from '../../../api/graphql';
import { hasPermission } from '../../../store/storeContext';
import { FieldRow } from '../../../ui/elements/inputs/FieldRow';
import { Button } from '../../../ui/elements/buttons/Button';
import { Alert } from '../../../ui/elements/feedback/Alert';
import { t, locale } from '../../../intl';
import {
  forecastingConfigured,
  forecastingProperties,
  gapsConfigured,
  gapsProperties,
  parseAllowedValues,
  SUPPLY_LEVEL_KEY,
  type NamePropertyInput,
} from './propertySets';
import { SupplyLevelsModal } from './SupplyLevelsModal';
import {
  ConfigureNameProperties,
  NameProperties,
} from './nameProperties.generated';
import { Stack } from '../../../ui/layout/Stack/Stack';

/*
 * Configuration (spec/settings/ui-surface.md § Configuration) — shown only to
 * a Server Admin on the central server (gated by the page, OMS-REG-SET-05.24).
 * Each action is independently gated FURTHER (rules § Configuration):
 *  - The two Initialise actions need EDIT_CENTRAL_DATA + NAME_PROPERTIES_
 *    MUTATE together, checked server-side; a Forbidden response surfaces
 *    through the app's global Permission-denied surface — graphqlFetch
 *    detects the error before any nested field is read, so the reference
 *    app's crash is not reproduced (OMS-REG-SET-05.25, D51).
 *  - Configure supply levels is permission-checked client-side BEFORE its
 *    editor opens (OMS-REG-SET-05.26).
 */
export const ConfigurationSection = () => {
  // The catalogue of existing name properties: drives the
  // Initialise/Re-initialise button labels and seeds the supply-level editor.
  // Non-suspending read (kdd/solid-reactivity-pitfalls § no remounts).
  const [propertiesData, { refetch }] = createResource(async () => {
    const result = await graphqlFetch(NameProperties, {});
    return result.kind === 'success'
      ? result.data.nameProperties.nodes
      : undefined;
  });
  const properties = () =>
    propertiesData.state === 'ready' || propertiesData.state === 'refreshing'
      ? (propertiesData.latest ?? [])
      : [];
  const loading = () => propertiesData.loading;

  const existingKeys = () => properties().map(node => node.property.key);
  const supplyLevelValues = () =>
    parseAllowedValues(
      properties().find(node => node.property.key === SUPPLY_LEVEL_KEY)
        ?.property.allowedValues
    );

  const [initialising, setInitialising] = createSignal<
    'gaps' | 'forecasting'
  >();
  const [supplyOpen, setSupplyOpen] = createSignal(false);
  const [supplyDenied, setSupplyDenied] = createSignal(false);

  // Initialise / Re-initialise — the same idempotent, all-or-nothing upsert
  // either time (OMS-REG-SET-05.15/.16; atomicity is server-side, contract
  // § Configuration). Default fetch options on purpose: a Forbidden routes to
  // the global Permission-denied modal (OMS-REG-SET-05.25, D51), any other
  // failure to the global unexpected-error modal.
  const initialise = async (
    which: 'gaps' | 'forecasting',
    input: NamePropertyInput[]
  ) => {
    setInitialising(which);
    const result = await graphqlFetch(ConfigureNameProperties, { input });
    if (result.kind === 'success') await refetch();
    setInitialising(undefined);
  };

  const initialiseLabel = (configured: boolean) =>
    configured ? t('button.re-initialise') : t('button.initialise');

  // The editor's own gate, checked before it opens: EDIT_CENTRAL_DATA alone,
  // client-side — on failure a plain permission-denied message and the modal
  // never appears, no request sent (OMS-REG-SET-05.26).
  const openSupplyLevels = () => {
    if (!hasPermission('EDIT_CENTRAL_DATA')) {
      setSupplyDenied(true);
      return;
    }
    setSupplyDenied(false);
    setSupplyOpen(true);
  };

  return (
    <Stack>
      <FieldRow label={t('label.initialise-store-properties-gaps')}>
        <Button
          variant="secondary"
          loading={initialising() === 'gaps'}
          disabled={loading() || initialising() != null}
          title={t('tooltip.re-initialise-in-language', {
            language: locale(),
          })}
          onClick={() => void initialise('gaps', gapsProperties(locale()))}
          data-testid="initialise-gaps"
        >
          {initialiseLabel(gapsConfigured(existingKeys()))}
        </Button>
      </FieldRow>
      <FieldRow
        label={t(
          'label.initialise-store-properties-population-based-forecasting'
        )}
      >
        <Button
          variant="secondary"
          loading={initialising() === 'forecasting'}
          disabled={loading() || initialising() != null}
          title={t('tooltip.re-initialise-in-language', {
            language: locale(),
          })}
          onClick={() =>
            void initialise('forecasting', forecastingProperties(locale()))
          }
          data-testid="initialise-forecasting"
        >
          {initialiseLabel(forecastingConfigured(existingKeys()))}
        </Button>
      </FieldRow>
      <FieldRow label={t('label.configure-supply-level')}>
        <Button
          variant="secondary"
          onClick={openSupplyLevels}
          data-testid="configure-supply-levels"
        >
          {t('label.edit')}
        </Button>
      </FieldRow>
      <Show when={supplyDenied()}>
        <Alert severity="error">{t('error.no-supply-level-permission')}</Alert>
      </Show>
      <SupplyLevelsModal
        open={supplyOpen()}
        initialValues={supplyLevelValues()}
        onClose={() => setSupplyOpen(false)}
        onSaved={() => void refetch()}
      />
    </Stack>
  );
};

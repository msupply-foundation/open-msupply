import {
  createEffect,
  createResource,
  createSignal,
  For,
  Show,
} from 'solid-js';
import { useNavigate, useParams } from '@solidjs/router';
import { graphqlFetch } from '../../../api/graphql';
import { PRINT_LABEL_TEST_URL } from '../../../config';
import { getLabelPrinterUseUsb, setLabelPrinterUseUsb } from '../../../appData';
import { hasPermission } from '../../../store/storeContext';
import { FieldRow } from '../../../ui/elements/inputs/FieldRow';
import { FormSection } from '../../../ui/layout/Form/FormSection';
import { Stack } from '../../../ui/layout/Stack/Stack';
import { TextField } from '../../../ui/elements/inputs/TextField';
import { NumberField } from '../../../ui/elements/inputs/NumberField';
import { ToggleSwitch } from '../../../ui/elements/inputs/ToggleSwitch';
import { Button } from '../../../ui/elements/buttons/Button';
import { Alert } from '../../../ui/elements/feedback/Alert';
import { SaveIcon, ZapIcon } from '../../../ui/icons';
import { t } from '../../../intl';
import {
  buildLabelPrinterInput,
  canTestOrSave,
  defaultLabelPrinterForm,
  type LabelPrinterForm,
} from './labelPrinterForm';
import {
  availableScanners,
  mockScannerEnabled,
  scannerConnected,
  scanningEnabled,
  setMockScannerEnabled,
} from './scanner';
import {
  LabelPrinterSettings,
  UpdateLabelPrinterSettings,
} from './labelPrinter.generated';
import { HStack } from '../../../ui/layout/Stack/HStack';
import styles from '../Settings.module.css';

/*
 * Devices (spec/settings/ui-surface.md § Devices).
 *  - Label printer: visible and usable by ANY signed-in user — deliberately
 *    no Server Admin requirement, unlike every other write in this vertical
 *    (OMS-REG-SET-05.20). Test and Save both require all four network/label
 *    fields, even in USB mode (OMS-REG-SET-05.21); the USB preference is
 *    device-local and never saved to the server (OMS-REG-SET-05.22).
 *  - Barcode scanner: Server Admin only (OMS-REG-SET-05.23) — a diagnostic
 *    surface over local-device state; it never decides which screen accepts a
 *    scan (owned by spec/android).
 */
export const DevicesSection = () => {
  const params = useParams<{ storeId: string }>();
  const navigate = useNavigate();

  // Stored printer settings (store-wide). Non-suspending read (kdd/solid-
  // reactivity-pitfalls § no remounts).
  const [storedData, { refetch }] = createResource(async () => {
    const result = await graphqlFetch(LabelPrinterSettings, {});
    return result.kind === 'success' ? result.data.labelPrinterSettings : null;
  });

  const [form, setForm] = createSignal<LabelPrinterForm>(
    defaultLabelPrinterForm()
  );
  const [useUsb, setUseUsb] = createSignal(getLabelPrinterUseUsb());
  const [busy, setBusy] = createSignal<'test' | 'save'>();
  const [outcome, setOutcome] = createSignal<{
    severity: 'success' | 'error';
    message: string;
  }>();

  // Seed the form from the stored settings once they arrive, unless the user
  // has started editing. Gate on 'ready' (not 'refreshing'): our own Save calls
  // refetch(), and during 'refreshing' stored() still returns the stale
  // .latest — re-seeding from it would snap just-saved fields back to their old
  // values (kdd/solid-reactivity-pitfalls). Re-seed only once fresh data lands.
  let touched = false;
  createEffect(() => {
    const settings =
      storedData.state === 'ready' ? storedData.latest : undefined;
    if (settings && !touched)
      setForm({
        address: settings.address,
        port: settings.port,
        labelHeight: settings.labelHeight,
        labelWidth: settings.labelWidth,
      });
  });

  const edit = (patch: Partial<LabelPrinterForm>) => {
    touched = true;
    setOutcome(undefined);
    setForm({ ...form(), ...patch });
  };

  // The USB choice is remembered only on this device and never sent to the
  // server (OMS-REG-SET-05.22).
  const toggleUsb = (checked: boolean) => {
    setUseUsb(checked);
    setLabelPrinterUseUsb(checked);
  };

  // Test asks the server to probe the printer and reports success or failure;
  // it saves nothing — and the server probes the STORED settings, not the
  // form's current values (rules § Devices — label printer: a captured trap,
  // not smoothed over; the request carries no body).
  const test = async () => {
    setBusy('test');
    setOutcome(undefined);
    try {
      const response = await fetch(PRINT_LABEL_TEST_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const valid =
        response.ok &&
        ((await response.json()) as { is_valid?: boolean }).is_valid === true;
      setOutcome(
        valid
          ? {
              severity: 'success',
              message: t('messages.connected-to-printer'),
            }
          : {
              severity: 'error',
              message: t('error.unable-to-connect-to-printer'),
            }
      );
    } catch {
      setOutcome({
        severity: 'error',
        message: t('error.unable-to-connect-to-printer'),
      });
    }
    setBusy(undefined);
  };

  // Save persists the four network/label fields for the store — the USB
  // preference is not part of what's saved (OMS-REG-SET-05.22).
  const save = async () => {
    setBusy('save');
    setOutcome(undefined);
    const result = await graphqlFetch(
      UpdateLabelPrinterSettings,
      { input: buildLabelPrinterInput(form()) },
      { background: true }
    );
    const succeeded =
      result.kind === 'success' &&
      result.data.updateLabelPrinterSettings.__typename ===
        'LabelPrinterUpdateResult' &&
      result.data.updateLabelPrinterSettings.success;
    setOutcome(
      succeeded
        ? { severity: 'success', message: t('success.data-saved') }
        : { severity: 'error', message: t('error.problem-saving') }
    );
    if (succeeded) {
      touched = false;
      await refetch();
    }
    setBusy(undefined);
  };

  return (
    <Stack>
      {/* Sub-groups are the library's titled field groups (FormSection,
          kdd/form-layout) — h3 under the section trigger's h2. ⚠️ inconsistent
          i18n namespace captured as-is by the spec: `settings.label-printing`,
          not `heading.*`. */}
      <FormSection title={t('settings.label-printing')} headingLevel="h3">
        {/* The switch's own label serves — no FieldRow wrapper, which would
            duplicate the visible label (registry › labelled field row). */}
        <ToggleSwitch
          label={t('settings.print-via-usb')}
          checked={useUsb()}
          onChange={toggleUsb}
          testId="print-via-usb"
        />
        <FieldRow label={t('settings.printer-address')}>
          <TextField
            label={t('settings.printer-address')}
            hideLabel
            value={form().address}
            onInput={e => edit({ address: e.currentTarget.value })}
            disabled={busy() != null}
            data-testid="printer-address"
          />
        </FieldRow>
        <FieldRow label={t('settings.printer-port')}>
          <NumberField
            label={t('settings.printer-port')}
            hideLabel
            min={1}
            max={65535}
            noFormatting
            value={form().port}
            onChange={port => edit({ port })}
            disabled={busy() != null}
            data-testid="printer-port"
          />
        </FieldRow>
        <FieldRow label={t('settings.printer-label-height')}>
          <NumberField
            label={t('settings.printer-label-height')}
            hideLabel
            min={1}
            value={form().labelHeight}
            onChange={labelHeight => edit({ labelHeight })}
            disabled={busy() != null}
            data-testid="printer-label-height"
          />
        </FieldRow>
        <FieldRow label={t('settings.printer-label-width')}>
          <NumberField
            label={t('settings.printer-label-width')}
            hideLabel
            min={1}
            value={form().labelWidth}
            onChange={labelWidth => edit({ labelWidth })}
            disabled={busy() != null}
            data-testid="printer-label-width"
          />
        </FieldRow>
        <Show when={outcome()}>
          {o => <Alert severity={o().severity}>{o().message}</Alert>}
        </Show>
        <HStack justify="end" gap="md">
          <Button
            variant="secondary"
            icon={<ZapIcon />}
            loading={busy() === 'test'}
            disabled={!canTestOrSave(form()) || busy() != null}
            onClick={() => void test()}
            data-testid="printer-test"
          >
            {t('button.test')}
          </Button>
          <Button
            icon={<SaveIcon />}
            loading={busy() === 'save'}
            disabled={!canTestOrSave(form()) || busy() != null}
            onClick={() => void save()}
            data-testid="printer-save"
          >
            {t('button.save')}
          </Button>
        </HStack>
      </FormSection>

      {/* Barcode scanner — Server Admin only, strictly stricter than the
          label printer beside it (OMS-REG-SET-05.23). All state is local-device; nothing
          here reaches the server (contract § Devices — barcode scanner). */}
      <Show when={hasPermission('SERVER_ADMIN')}>
        <FormSection title={t('settings.barcode-scanner')} headingLevel="h3">
          <FieldRow label={t('label.barcode-scanner-status')}>
            <span data-testid="scanner-status">
              {scanningEnabled()
                ? t('label.barcode-scanner-enabled')
                : t('label.barcode-scanner-disabled')}
            </span>
          </FieldRow>
          <FieldRow label={t('label.barcode-scanner-connection-status')}>
            <span data-testid="scanner-connection">
              {scannerConnected()
                ? t('label.barcode-scanner-connected')
                : t('label.barcode-scanner-not-connected')}
            </span>
          </FieldRow>
          <FieldRow label={t('label.barcode-scanner-available')}>
            <Show
              when={availableScanners().length > 0}
              fallback={<span>{t('messages.no-scanners-available')}</span>}
            >
              <ul class={styles.scanResultList} data-testid="scanner-list">
                <For each={availableScanners()}>{name => <li>{name}</li>}</For>
              </ul>
            </Show>
          </FieldRow>
          <HStack gap="sm">
            <ToggleSwitch
              label={t('settings.enable-mock-barcode-scanner')}
              checked={mockScannerEnabled()}
              onChange={setMockScannerEnabled}
              testId="mock-scanner-toggle"
            />
            {/* Literal, non-localised pair — an i18n gap in the reference app
              captured as-is by the spec (ui-surface § Devices); the
              correctly-localised pair two rows above is deliberate contrast. */}
            <span>{mockScannerEnabled() ? 'Enabled' : 'Disabled'}</span>
          </HStack>
          <HStack justify="end" gap="md">
            <Button
              variant="secondary"
              onClick={() =>
                navigate(`/${params.storeId}/settings/test-scanner`)
              }
              data-testid="test-scanner"
            >
              {t('label.barcode-scanner-test')}
            </Button>
          </HStack>
        </FormSection>
      </Show>
    </Stack>
  );
};

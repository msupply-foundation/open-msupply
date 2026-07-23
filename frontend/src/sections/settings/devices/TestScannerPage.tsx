import { createSignal, For, Show, type Component } from 'solid-js';
import { useParams } from '@solidjs/router';
import { t } from '../../../intl';
import { Page } from '../../../ui/layout/Page/Page';
import { Header } from '../../../ui/layout/Header/Header';
import { Breadcrumb } from '../../../ui/layout/Header/Breadcrumb';
import { Button } from '../../../ui/elements/buttons/Button';
import { Alert } from '../../../ui/elements/feedback/Alert';
import { FormSection } from '../../../ui/layout/Form/FormSection';
import { localisedTime } from '../../../intl/formatDateTime';
import {
  availableScanners,
  scannerConnected,
  triggerMockScan,
  type ScanResult,
} from './scanner';
import styles from '../Settings.module.css';

/*
 * S2 — Test scanner (spec/settings/ui-surface.md § S2): trigger scans and
 * watch results arrive live, to verify a physical/mock device is working.
 * Nothing scanned here is recorded server-side — results accumulate locally
 * and Clear results empties the list without touching the scanner connection
 * (AC-BS2). With no scanner present the scan controls are disabled; an
 * available scanner — including the mock — enables them (rules § Devices —
 * barcode scanner; AC-BS3).
 */
const TestScannerPage: Component = () => {
  const params = useParams<{ storeId: string }>();
  const [listening, setListening] = createSignal(false);
  const [results, setResults] = createSignal<ScanResult[]>([]);

  const noScanner = () => availableScanners().length === 0;

  const scanOnce = () => setResults([...results(), triggerMockScan()]);

  return (
    <Page
      header={
        <Header>
          <Breadcrumb
            crumbs={[
              { label: t('settings'), to: `/${params.storeId}/settings` },
              { label: t('label.barcode-scanner-test') },
            ]}
          />
        </Header>
      }
    >
      <div class={`${styles.measure} ${styles.sectionBody}`}>
        <Show when={noScanner()}>
          <Alert severity="warning">
            {t('messages.no-barcode-scanner-available')}
          </Alert>
        </Show>

        <FormSection title={t('heading.scanner-controls')}>
          <div class={styles.scannerActions}>
            <Button
              variant="secondary"
              disabled={noScanner()}
              onClick={() => setListening(v => !v)}
              data-testid="scanner-start-listening"
            >
              {listening()
                ? t('button.stop-listening')
                : t('button.start-listening')}
            </Button>
            <Button
              variant="secondary"
              disabled={noScanner()}
              onClick={scanOnce}
              data-testid="scanner-scan-once"
            >
              {t('button.scan-once')}
            </Button>
            <Button
              variant="secondary"
              disabled={results().length === 0}
              onClick={() => setResults([])}
              data-testid="scanner-clear-results"
            >
              {t('button.clear-results')}
            </Button>
          </div>
        </FormSection>

        <FormSection title={t('heading.scanner-status')}>
          <p data-testid="scanner-listening-state">
            <strong>{t('label.listening')}:</strong>{' '}
            {listening() && scannerConnected()
              ? t('label.active')
              : t('label.inactive')}
          </p>
        </FormSection>

        <FormSection title={t('heading.scan-results')}>
          <Show
            when={results().length > 0}
            fallback={<p>{t('messages.no-scans-yet')}</p>}
          >
            <ul class={styles.scanResultList} data-testid="scan-results">
              <For each={results()}>
                {result => (
                  <li>
                    <code>{result.barcode}</code>{' '}
                    <span class={styles.inUseTag}>
                      {t('label.time')}: {localisedTime(result.scannedAt)}
                    </span>
                  </li>
                )}
              </For>
            </ul>
          </Show>
        </FormSection>
      </div>
    </Page>
  );
};

export default TestScannerPage;

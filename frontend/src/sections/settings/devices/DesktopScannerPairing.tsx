import { createSignal, For, Show, type Component } from 'solid-js';
import { t } from '../../../intl';
import { Button } from '../../../ui/elements/buttons/Button';
import { desktopHidStatus } from '../../../platform/barcodeSources/desktopHid';
import {
  cancelScannerPairing,
  forgetNativeScanner,
  pairScannerByScan,
  pairScannerDevice,
  scannerCandidates,
  type DesktopHidCandidate,
  type NativePairOutcome,
} from './scanner';
import styles from './ScannerSources.module.css';
// The pairing barcode — the old front end's own image, encoding the code the
// shell waits for (client/packages/electron/src/hidScanner § PAIRING_CODE).
import pairingBarcode from './omsupply-barcode.gif';

/*
 * The desktop app's USB scanner row controls (spec/settings/ui-surface.md §
 * Devices). Two ways to pair, because each covers the other's failure:
 * scanning the pairing barcode finds the scanner without the user knowing its
 * name, and the list reaches a scanner that cannot read the barcode off a
 * screen, or whose reports split the code.
 *
 * Scanning pairs on a KNOWN barcode, not the first device to report: HID
 * devices that report on their own (a Mac's trackpad and Apple's vendor
 * interfaces) otherwise pair before anything is scanned.
 */
export const DesktopScannerPairing: Component = () => {
  const [waiting, setWaiting] = createSignal(false);
  const [busy, setBusy] = createSignal(false);
  const [candidates, setCandidates] = createSignal<
    DesktopHidCandidate[] | undefined
  >();
  const [notice, setNotice] = createSignal<string | undefined>();
  // The list shows likely scanners only until asked for everything: a Mac
  // alone lists a dozen devices that are none of them a scanner.
  const [showAll, setShowAll] = createSignal(false);
  const shown = () =>
    candidates()?.filter(c => showAll() || c.scannerUsage) ?? [];
  const hiddenCount = () => (candidates()?.length ?? 0) - shown().length;

  const noticeFor = (outcome: NativePairOutcome): string | undefined => {
    switch (outcome) {
      case 'timeout':
        return t('messages.scanner-pair-timeout');
      case 'no-devices':
        return t('messages.scanner-pair-no-devices');
      case 'not-found':
        return t('messages.no-scanners-found');
      // Paired says itself — the row names the scanner. Cancelling is silent.
      default:
        return undefined;
    }
  };

  const pairByScan = async () => {
    setCandidates(undefined);
    setNotice(undefined);
    setWaiting(true);
    const outcome = await pairScannerByScan();
    setWaiting(false);
    setNotice(noticeFor(outcome));
  };

  const showList = async () => {
    setNotice(undefined);
    setShowAll(false);
    setBusy(true);
    setCandidates(await scannerCandidates());
    setBusy(false);
  };

  const pick = async (key: string) => {
    setBusy(true);
    const outcome = await pairScannerDevice(key);
    setBusy(false);
    setCandidates(undefined);
    setNotice(noticeFor(outcome));
  };

  const forget = async () => {
    setBusy(true);
    await forgetNativeScanner();
    setBusy(false);
    setNotice(undefined);
  };

  return (
    <>
      <div class={styles.control}>
        <Show
          when={!waiting()}
          fallback={
            <Button
              variant="ghost"
              size="small"
              onClick={() => void cancelScannerPairing()}
              data-testid="cancel-pairing"
            >
              {t('button.cancel')}
            </Button>
          }
        >
          <Button
            variant="ghost"
            size="small"
            loading={busy()}
            onClick={() => void showList()}
            data-testid="choose-scanner"
          >
            {t('button.choose-scanner')}
          </Button>
          <Button
            variant="secondary"
            size="small"
            disabled={busy()}
            onClick={() => void pairByScan()}
            data-testid="pair-by-scanning"
          >
            {t('button.pair-by-scanning')}
          </Button>
          <Show when={desktopHidStatus().paired}>
            <Button
              variant="ghost"
              size="small"
              loading={busy()}
              onClick={() => void forget()}
              data-testid="forget-desktop-scanner"
            >
              {t('button.forget-scanner')}
            </Button>
          </Show>
        </Show>
      </div>

      <Show when={waiting()}>
        <div class={`${styles.panel} ${styles.pairing}`} role="status">
          <img
            src={pairingBarcode}
            alt={t('label.pairing-barcode')}
            width={334}
            height={100}
            data-testid="pairing-barcode"
          />
          <span>{t('messages.scanner-pair-scan-prompt')}</span>
        </div>
      </Show>

      <Show when={candidates()}>
        <Show
          when={shown().length > 0}
          fallback={
            <span class={styles.panel}>{t('messages.no-scanners-found')}</span>
          }
        >
          <ul class={`${styles.panel} ${styles.candidates}`}>
            <For each={shown()}>
              {candidate => (
                <li>
                  <Button
                    variant="ghost"
                    size="small"
                    disabled={busy()}
                    onClick={() => void pick(candidate.key)}
                    data-testid="scanner-candidate"
                  >
                    {candidate.name}
                  </Button>
                  <Show when={candidate.scannerUsage}>
                    <span class={styles.detail}>
                      {t('label.likely-scanner')}
                    </span>
                  </Show>
                </li>
              )}
            </For>
          </ul>
        </Show>
        {/* A scanner that does not advertise the bar-code usage page is
            only reachable this way. */}
        <Show when={hiddenCount() > 0}>
          <div class={styles.panel}>
            <Button
              variant="ghost"
              size="small"
              onClick={() => setShowAll(true)}
              data-testid="show-all-devices"
            >
              {t('button.pair-any-device')}
            </Button>
          </div>
        </Show>
      </Show>

      <Show when={notice()}>
        {message => <span class={styles.panel}>{message()}</span>}
      </Show>
    </>
  );
};

import { createSignal, For, onMount, Show, type Component } from 'solid-js';
import { t } from '../../../intl';
import { StatusChip } from '../../../ui/elements/feedback/StatusChip';
import { ToggleSwitch } from '../../../ui/elements/inputs/ToggleSwitch';
import { Select } from '../../../ui/elements/selectors/Select';
import { FieldRow } from '../../../ui/elements/inputs/FieldRow';
import { Button } from '../../../ui/elements/buttons/Button';
import { DesktopScannerPairing } from './DesktopScannerPairing';
import {
  scannerRowPairs,
  scannerRowPairsNatively,
  scannerRowToggle,
  scannerSourceRows,
  scannerStateColour,
  scannerStateLabel,
} from './scannerSourceModel';
import {
  cameraEngine,
  keyboardWedgeEnabled,
  forgetScanners,
  mockScannerEnabled,
  pairedScanners,
  pairScanner,
  refreshPairedScanners,
  setCameraEngine,
  setKeyboardWedgeEnabled,
  setMockScannerEnabled,
} from './scanner';
import styles from './ScannerSources.module.css';

/*
 * The barcode-scanner inputs, one row each.
 *
 * This replaces a stack of label/value rows that managed to say "no scanner"
 * three times over ("Scanner status: Disabled", "Connection status: Not
 * connected", "Available scanners: none") without ever naming an input. A row
 * per input answers the question people actually bring to this screen —
 * which one will my scan come from, and why isn't it the one I expected —
 * and puts each input's own control beside it.
 *
 * Every input is a row of its own, including the two that arrive over the
 * same USB cable: reading a scanner's data reports and reading its
 * keystrokes share no code, fail differently, and can both be present at
 * once. Folding them into one row with a mode selector made a device with
 * both unrepresentable, and made neither's state honest.
 *
 * Shared by the Devices settings section and the Test scanner screen, so the
 * two cannot drift.
 */
export const ScannerSources: Component<{ compact?: boolean }> = props => {
  const [pairing, setPairing] = createSignal(false);
  // True once a filtered chooser came back empty-handed: the scanner may not
  // advertise the bar-code usage page, so the wider list is then offered.
  const [offerAll, setOfferAll] = createSignal(false);

  // What the browser has already granted this origin — the paired scanner
  // survives a reload, so the row can name it on arrival.
  onMount(() => void refreshPairedScanners());

  const [notice, setNotice] = createSignal<string | undefined>();

  const forget = async () => {
    setPairing(true);
    const result = await forgetScanners();
    setPairing(false);
    setOfferAll(false);
    setNotice(result.ok ? undefined : t('messages.scanner-forget-unsupported'));
  };

  const pair = async (anyDevice: boolean) => {
    setPairing(true);
    const outcome = await pairScanner(anyDevice);
    setPairing(false);
    // Dismissing the chooser is not a failure — but if the filtered list had
    // nothing worth picking, widening it is the useful next offer.
    if (outcome === 'dismissed' && !anyDevice) setOfferAll(true);
  };

  return (
    <ul class={styles.list} data-testid="scanner-list">
      <For each={scannerSourceRows()}>
        {row => (
          <li class={styles.row} data-state={row.state} data-source={row.id}>
            <div class={styles.identity}>
              <span class={styles.name}>{row.name}</span>
              <Show when={!props.compact}>
                <span class={styles.detail}>{row.detail}</span>
              </Show>
            </div>

            {/* The state as text as well as colour — the chip's tint never
              carries the meaning alone. */}
            <StatusChip
              label={scannerStateLabel(row.state)}
              colour={scannerStateColour(row.state)}
            />

            {/* The row already names the input and says what it is for, so each
              switch shows no label of its own — it keeps the long one as its
              accessible name. */}
            <Show when={!props.compact && scannerRowToggle(row.id)}>
              {toggle => (
                <div class={styles.control}>
                  <Show when={toggle() === 'manual'}>
                    <ToggleSwitch
                      label={t('settings.enable-mock-barcode-scanner')}
                      hideLabel
                      checked={mockScannerEnabled()}
                      onChange={setMockScannerEnabled}
                      testId="mock-scanner-toggle"
                    />
                  </Show>
                  <Show when={toggle() === 'keyboard-wedge'}>
                    <ToggleSwitch
                      label={t('label.barcode-scanner-keyboard-wedge')}
                      hideLabel
                      checked={keyboardWedgeEnabled()}
                      onChange={setKeyboardWedgeEnabled}
                      testId="keyboard-wedge-toggle"
                    />
                  </Show>
                  {/* Labelled, unlike the two above: the row names the
                    camera, not which decoder it uses. A choice between two
                    decoders, not on/off — a switch read as turning the
                    camera off. */}
                  <Show when={toggle() === 'camera-engine'}>
                    <FieldRow label={t('label.camera-mode')} labelWidth="auto">
                      <Select
                        label={t('label.camera-mode')}
                        hideLabel
                        size="small"
                        width="short"
                        options={[
                          {
                            value: 'google',
                            label: t('label.camera-mode-google'),
                          },
                          {
                            value: 'bundled',
                            label: t('label.camera-mode-bundled'),
                          },
                        ]}
                        value={cameraEngine()}
                        onValueChange={engine =>
                          setCameraEngine(
                            engine === 'bundled' ? 'bundled' : 'google'
                          )
                        }
                        testId="camera-engine-select"
                      />
                    </FieldRow>
                  </Show>
                </div>
              )}
            </Show>

            {/* Pairing is a BUTTON because a browser only raises its device
              chooser from a real click — and a chooser is the only way a
              page may reach a HID device at all. */}
            <Show when={!props.compact && scannerRowPairs(row.id)}>
              <div class={styles.control}>
                <Show when={offerAll()}>
                  <Button
                    variant="ghost"
                    size="small"
                    loading={pairing()}
                    onClick={() => void pair(true)}
                    data-testid="pair-any-device"
                  >
                    {t('button.pair-any-device')}
                  </Button>
                </Show>
                <Button
                  variant="secondary"
                  size="small"
                  loading={pairing()}
                  onClick={() => void pair(false)}
                  data-testid="pair-scanner"
                >
                  {t('button.pair-scanner')}
                </Button>
                {/* A grant outlives the scanner mode it was given for, and
                  pairing again on top of a stale one does not replace it.
                  Offered only once something is paired. */}
                <Show when={pairedScanners().length > 0}>
                  <Button
                    variant="ghost"
                    size="small"
                    loading={pairing()}
                    onClick={() => void forget()}
                    data-testid="forget-scanner"
                  >
                    {t('button.forget-scanner')}
                  </Button>
                </Show>
              </div>
              <Show when={notice()}>
                {message => <span class={styles.detail}>{message()}</span>}
              </Show>
            </Show>

            {/* The desktop app pairs by scan or from a list — the shell does it,
              so no browser chooser is involved. */}
            <Show when={!props.compact && scannerRowPairsNatively(row.id)}>
              <DesktopScannerPairing />
            </Show>
          </li>
        )}
      </For>
    </ul>
  );
};

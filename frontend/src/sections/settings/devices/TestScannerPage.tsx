import {
  createSignal,
  For,
  Match,
  onCleanup,
  onMount,
  Show,
  Switch,
  type Component,
} from 'solid-js';
import { useParams } from '@solidjs/router';
import { t } from '../../../intl';
import { Page } from '../../../ui/layout/Page/Page';
import { Header } from '../../../ui/layout/Header/Header';
import { Breadcrumb } from '../../../ui/layout/Header/Breadcrumb';
import { Button } from '../../../ui/elements/buttons/Button';
import { StatusChip } from '../../../ui/elements/feedback/StatusChip';
import { EmptyState } from '../../../ui/elements/feedback/EmptyState';
import { FormSection } from '../../../ui/layout/Form/FormSection';
import { localisedTime } from '../../../intl/formatDateTime';
import { generateUUID } from '../../../uuid';
import {
  activeSource,
  availableSources,
  refreshScanSources,
  scanOnce,
  scanOwner,
  sourceDisplayName,
  startListening,
  supportsContinuousScanning,
  type RawScan,
  type ScanSourceId,
} from '../../../platform/barcodeScanner';
import { ScannerSources } from './ScannerSources';
import {
  readScan,
  scanCharacters,
  scanCode,
  scanText,
  type ReadScan,
} from '@/domain/barcode';
import { ScanReading } from './ScanReading';
import { classifyKey } from '../../../platform/barcodeSources/wedgeDetect';
import {
  compareScans,
  hasInvisibleCharacters,
  invisibleCount,
  separatorCount,
  toHex,
  visualiseRaw,
} from './scanDiagnostics';
import { ContentContainer } from '../../../ui/layout/ContentContainer/ContentContainer';
import { Stack } from '../../../ui/layout/Stack/Stack';
import styles from './TestScannerPage.module.css';

/*
 * Test scanner — the verification surface for the whole hardware layer.
 *
 * Nothing scanned here is recorded server-side; results accumulate locally
 * and Clear empties them without touching the scanner connection.
 *
 * Three things this screen does that a list of scanned strings cannot:
 *
 *  - NAMES THE INPUT each read came from. The sources are meant to be
 *    indistinguishable to the rest of the app, which makes this the one
 *    screen allowed to tell them apart.
 *  - SHOWS EVERY CHARACTER, including the invisible ones, as control
 *    pictures. A GS1 separator, a stray space, a terminator the scanner
 *    appended: exactly the characters a plain list hides, and exactly the
 *    ones that matter, because the registry keys on the code character for
 *    character and has no screen anywhere that can correct a wrong one.
 *  - COMPARES AGAINST A REFERENCE READ. One label read in USB report mode
 *    and again in keyboard-wedge mode must give identical characters, or the
 *    same physical label is learned into the registry twice. Making that a
 *    glance rather than an exercise is most of why this screen exists.
 */

type ScanEntry = {
  kind: 'scan';
  id: string;
  text: string;
  source: ScanSourceId | undefined;
  /** What the transport actually produced, before interpretation. */
  raw: RawScan;
  /** What the reading layer made of it. */
  read: ReadScan;
  at: Date;
};

type ErrorEntry = {
  kind: 'error';
  id: string;
  message: string;
  /** Whatever arrived before the read failed — usually the whole point. */
  raw: RawScan | undefined;
  at: Date;
};

type Entry = ScanEntry | ErrorEntry;

type Verdict = 'error' | 'reference' | 'matches' | 'differs';

const isScan = (entry: Entry): entry is ScanEntry => entry.kind === 'scan';

/** The untouched reading, for the diagnostic line under each scan. */
const rawDetail = (raw: RawScan | undefined): string | undefined => {
  if (!raw) return undefined;
  if (raw.kind === 'bytes') {
    // The symbology comes out of the report's framing where it was
    // recognised (src/domain/barcode/hidReport.ts) — shown, because a
    // report the framing did NOT recognise is exactly the one to look at.
    const { aimId } = scanCharacters(raw);
    return [
      `${t('label.raw-report')}: ${toHex([...raw.bytes])}`,
      aimId && `${t('label.symbology-id')}: ${aimId}`,
    ]
      .filter(Boolean)
      .join(' · ');
  }
  if (raw.kind === 'keystrokes') {
    return `${t('label.raw-keys')}: ${raw.keys
      .map(k => {
        const name = [
          k.ctrl ? 'Ctrl+' : '',
          k.alt ? 'Alt+' : '',
          k.shift ? 'Shift+' : '',
          k.code,
        ].join('');
        // Mark the keys the decoder could not place. On a failed read
        // this is the whole answer — it is almost always a separator
        // spelled a way the app does not recognise yet, and marking it
        // turns "unable to read a barcode" into a one-line fix.
        return classifyKey(k) === 'unmappable' ? `⚠${name}` : name;
      })
      .join(' ')}`;
  }
  // Text sources decode for themselves; what they can add is WHICH
  // symbology they read, which decides whether the text is GS1.
  const parts = [
    raw.aimId && `${t('label.symbology-id')}: ${raw.aimId}`,
    raw.format && `${t('label.barcode-format')}: ${raw.format}`,
    raw.decoder && `${t('label.barcode-decoder')}: ${raw.decoder}`,
  ].filter(Boolean);
  if (parts.length > 0) return parts.join(' · ');
  return undefined;
};

/** The untouched reading beneath a row, when there is anything to show. */
const RawReport: Component<{ raw: RawScan | undefined }> = props => (
  <Show when={rawDetail(props.raw)}>
    {detail => (
      <span class={styles.rawReport} data-testid="scan-raw-report">
        {detail()}
      </span>
    )}
  </Show>
);

/** One read in the results list: a scan, or a read that failed. */
const ScanEntryRow: Component<{
  entry: Entry;
  verdict: Verdict | undefined;
  verdictText: string | undefined;
  isReference: boolean;
  onUseAsReference: () => void;
}> = props => (
  <li class={styles.result} data-verdict={props.verdict}>
    <Switch>
      <Match when={props.entry.kind === 'error' && props.entry}>
        {failure => (
          <>
            <span class={styles.errorText}>{failure().message}</span>
            {/* What arrived before it failed. The key the
                decoder could not place is visible here and
                nowhere else. */}
            <RawReport raw={failure().raw} />
            <div class={styles.meta}>
              <span>{localisedTime(failure().at)}</span>
            </div>
          </>
        )}
      </Match>
      <Match when={props.entry.kind === 'scan' && props.entry}>
        {scan => (
          <>
            {/* Every character, including the ones that
                would otherwise be invisible. */}
            <span class={styles.scanText} data-testid="scan-text">
              {visualiseRaw(scan().text)}
            </span>
            <div class={styles.meta}>
              <span>
                {t('label.characters')}: {[...scan().text].length}
              </span>
              <Show when={separatorCount(scan().text) > 0}>
                <span>GS1 ␝ × {separatorCount(scan().text)}</span>
              </Show>
              <Show when={hasInvisibleCharacters(scan().text)}>
                <span class={styles.invisible}>
                  {t('messages.scan-contains-invisible', {
                    count: String(invisibleCount(scan().text)),
                  })}
                </span>
              </Show>
              <Show when={scan().source}>
                {id => <span>{sourceDisplayName(id())}</span>}
              </Show>
              <span>{localisedTime(scan().at)}</span>
            </div>
            {/* What the transport handed over, before any
                interpretation — the evidence the framing and
                the layout tables get written from. */}
            <RawReport raw={scan().raw} />
            {/* What the app will do with those characters. */}
            <ScanReading read={scan().read} text={scan().text} />
            <div class={styles.footerRow}>
              <span class={styles.verdict} data-testid="scan-verdict">
                {props.verdictText ?? ''}
              </span>
              <Show when={!props.isReference}>
                <Button
                  variant="ghost"
                  size="small"
                  onClick={() => props.onUseAsReference()}
                  data-testid="scan-use-as-reference"
                >
                  {t('button.use-as-reference')}
                </Button>
              </Show>
            </div>
          </>
        )}
      </Match>
    </Switch>
  </li>
);

const TestScannerPage: Component = () => {
  const params = useParams<{ storeId: string }>();
  const [listening, setListening] = createSignal(false);
  const [entries, setEntries] = createSignal<Entry[]>([]);
  const [referenceId, setReferenceId] = createSignal<string | undefined>();

  // Whoever armed the scanner last owns it; this is our claim on it.
  let dispose: (() => void) | undefined;

  const noScanner = () => availableSources().length === 0;

  const reference = () =>
    entries()
      .filter(isScan)
      .find(e => e.id === referenceId());

  const record = (raw: RawScan) =>
    setEntries(prev => [
      {
        kind: 'scan',
        id: generateUUID(),
        // The interpreted characters, and the untouched reading beside them.
        // Only one HID framing is known and the keyboard layout is assumed,
        // so what the transport actually produced is the evidence both get
        // written from (src/domain/barcode/scanText.ts).
        text: scanText(raw),
        raw,
        read: readScan(raw),
        // Which input produced this read. Half of what a reference
        // comparison is checking, so it is stamped on the read itself rather
        // than only shown above — the strip changes, the history must not.
        source: activeSource(),
        at: new Date(),
      },
      ...prev,
    ]);

  // A failed reading is an event in the same stream, not a banner that
  // replaces the history: its position between two good reads is the
  // diagnostic.
  // A failed reading carries what arrived with it. Rejecting a read and then
  // showing nothing leaves the user with "unable to read a barcode" and no
  // way to find out why — when the answer is almost always one keystroke the
  // decoder could not place, sitting right there in the sequence.
  const recordError = (failure: { message: string; raw?: RawScan }) =>
    setEntries(prev => [
      {
        kind: 'error',
        id: generateUUID(),
        message: failure.message,
        raw: failure.raw,
        at: new Date(),
      },
      ...prev,
    ]);

  // Arriving is the moment to re-ask what is attached: a scanner may have
  // been plugged in, or a mode changed, since the app started.
  onMount(() => void refreshScanSources());

  // "Leaving a screen stops its scanning." The disposer is inert if something
  // else has since taken the scan, so this cannot disarm a screen that
  // replaced us.
  onCleanup(() => dispose?.());

  const toggleListening = async () => {
    if (listening()) {
      dispose?.();
      dispose = undefined;
      setListening(false);
      return;
    }
    const handle = await startListening(record, {
      label: 'test-scanner',
      onError: recordError,
    });
    if (!handle.ok) return recordError({ message: handle.message });
    dispose = handle.dispose;
    setListening(true);
  };

  const scanOnceNow = async () => {
    const outcome = await scanOnce();
    if (outcome.ok) return record(outcome.scan);
    // A cancelled scan is silent — cancelling is not a failure.
    if (outcome.cancelled) return;
    recordError({ message: outcome.message });
  };

  const clear = () => {
    setEntries([]);
    setReferenceId(undefined);
  };

  /*
   * Reads are compared as the READER left them, not as the scanner sent
   * them. Scanners disagree about framing — MLKit writes "]C1" into the
   * text where the Honeywell reports it out of band — and that is fine as
   * long as the reading layer irons it out. What must never differ is what
   * the registry would see: the tidied characters, and the code they are
   * looked up by.
   */
  const compareToReference = (entry: ScanEntry) => {
    const ref = reference();
    if (!ref) return undefined;
    const characters = compareScans(ref.read.content, entry.read.content);
    if (!characters.equal) return characters;
    return scanCode(ref.read) === scanCode(entry.read)
      ? characters
      : ({ equal: false, lookup: true } as const);
  };

  /** How a read stands against the reference one. */
  const verdict = (entry: Entry): Verdict | undefined => {
    if (entry.kind === 'error') return 'error';
    if (entry.id === referenceId()) return 'reference';
    const result = compareToReference(entry);
    if (!result) return undefined;
    return result.equal ? 'matches' : 'differs';
  };

  const verdictText = (entry: Entry) => {
    if (!isScan(entry)) return undefined;
    if (entry.id === referenceId()) return t('label.reference-scan');
    const result = compareToReference(entry);
    if (!result) return undefined;
    if (result.equal) return t('messages.scan-matches-reference');
    if ('lookup' in result) return t('messages.scan-looked-up-differently');
    return t('messages.scan-differs-from-reference', {
      position: String(result.position),
    });
  };

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
      <ContentContainer size="form" align="start">
        <Stack>
          {/* Which inputs exist and which is driving — the same rows the
              Devices section shows, without their controls. */}
          <ScannerSources compact />

          <div class={styles.controls}>
            {/* Arming is offered only where the input can stay armed — a
                camera can only ever be asked for one scan at a time. */}
            <Show when={supportsContinuousScanning()}>
              <Button
                disabled={noScanner()}
                onClick={() => void toggleListening()}
                data-testid="scanner-start-listening"
              >
                {listening()
                  ? t('button.stop-listening')
                  : t('button.start-listening')}
              </Button>
            </Show>
            <Button
              variant="secondary"
              disabled={noScanner()}
              onClick={() => void scanOnceNow()}
              data-testid="scanner-scan-once"
            >
              {t('button.scan-once')}
            </Button>
            <Button
              variant="ghost"
              disabled={entries().length === 0}
              onClick={clear}
              data-testid="scanner-clear-results"
            >
              {t('button.clear-results')}
            </Button>

            {/* Armed state sits WITH the control that changes it, not adrift
                above it. */}
            <StatusChip
              label={
                listening() ? t('messages.scanner-in-use') : t('label.inactive')
              }
              colour={
                listening() ? 'var(--success-main)' : 'var(--text-secondary)'
              }
            />
            {/* Scan routing made visible: one screen owns the scan at a time,
                so a screen that finds itself deaf can see who took it. */}
            <Show when={scanOwner() && !listening()}>
              <span class={styles.hint} data-testid="scanner-owner">
                {t('label.held-by')}: {scanOwner()}
              </span>
            </Show>
          </div>

          <FormSection title={t('heading.scan-results')}>
            <Show
              when={entries().length > 0}
              fallback={
                <EmptyState
                  message={
                    noScanner()
                      ? t('messages.no-barcode-scanner-available')
                      : t('messages.no-scans-yet')
                  }
                />
              }
            >
              <Show when={!reference()}>
                <p class={styles.hint}>{t('messages.no-scan-reference')}</p>
              </Show>
              <ul class={styles.results} data-testid="scan-results">
                <For each={entries()}>
                  {entry => (
                    <ScanEntryRow
                      entry={entry}
                      verdict={verdict(entry)}
                      verdictText={verdictText(entry)}
                      isReference={entry.id === referenceId()}
                      onUseAsReference={() => setReferenceId(entry.id)}
                    />
                  )}
                </For>
              </ul>
            </Show>
          </FormSection>
        </Stack>
      </ContentContainer>
    </Page>
  );
};

export default TestScannerPage;

import { createEffect, createResource, createSignal, Show } from 'solid-js';
import { graphqlFetch } from '../../../api/graphql';
import { gated } from '../../../api/gated';
import { supportLogUrl } from '../../../config';
import { isAndroid } from '../../../platform';
import { saveDocument } from '../../../platform/openDocument';
import { Dialog } from '../../../ui/elements/feedback/Dialog';
import { Button } from '../../../ui/elements/buttons/Button';
import { Alert } from '../../../ui/elements/feedback/Alert';
import { Select } from '../../../ui/elements/selectors/Select';
import { Spinner } from '../../../ui/elements/feedback/Spinner';
import { CopyIcon, SaveIcon } from '../../../ui/icons';
import { t } from '../../../intl';
import { LogContents, LogFileNames } from './serverLog.generated';
import styles from './ServerLogModal.module.css';

/*
 * S3 — Server log viewer (spec/settings/ui-surface.md § S3): pick any one of
 * the server's log files — the current log and its rotated/compressed
 * history — and view its raw text, as written, in a <pre>; copy it to the
 * clipboard or save it to a file. Viewing never changes anything
 * (OMS-REG-SET-03.1/.2/.3; rules § Support).
 *
 * A log file can be 100 MB (#1012), so the viewer is sent only its last 1 MiB
 * and says so when the file is longer. Save downloads the whole file over REST
 * instead, streamed to disk rather than built up in memory here.
 *
 * Both resources are read via the .state gate, never suspending — this modal
 * lives inside an already-open page, and a suspending read would detach the
 * open <dialog> (kdd/solid-reactivity-pitfalls § no remounts). Fetch failures
 * stay inside the viewer (`background`), surfaced as its own inline error.
 */
export const ServerLogModal = (props: {
  open: boolean;
  onClose: () => void;
}) => {
  const [selectedFile, setSelectedFile] = createSignal<string>();
  const [notice, setNotice] = createSignal<{
    severity: 'success' | 'info' | 'error';
    message: string;
  }>();
  const [savingFile, setSavingFile] = createSignal(false);

  // The file list, fetched when the modal opens.
  const [namesData] = createResource(
    () => props.open || undefined,
    async () => {
      const result = await graphqlFetch(LogFileNames, {}, { background: true });
      return result.kind === 'success'
        ? { fileNames: result.data.logFileNames.fileNames ?? [] }
        : { error: true as const };
    }
  );
  const names = () => gated(namesData);
  const fileNames = () => names()?.fileNames ?? [];

  // No file preselected — content loads when the user picks one
  // (OMS-REG-SET-03.1/.2/.3; matches the reference viewer's initial state).
  const file = () => selectedFile();

  const [contentsData] = createResource(
    () => (props.open ? file() : undefined),
    async fileName => {
      const result = await graphqlFetch(
        LogContents,
        { fileName },
        { background: true }
      );
      return result.kind === 'success'
        ? result.data.logContents
        : { error: true as const };
    }
  );
  const contents = () => gated(contentsData);
  const log = () => {
    const c = contents();
    return c && !('error' in c) ? c : undefined;
  };
  const text = () => log()?.content ?? '';
  const truncated = () => log()?.truncated === true;
  const loadFailed = () =>
    names()?.error === true || (contents() !== undefined && !log());

  // A log's newest entries are at its end, so open a file scrolled to the
  // bottom.
  let viewer: HTMLPreElement | undefined;
  createEffect(() => {
    text();
    if (viewer) viewer.scrollTop = viewer.scrollHeight;
  });

  const close = () => {
    setSelectedFile(undefined);
    setNotice(undefined);
    props.onClose();
  };

  const copy = async () => {
    if (!text()) {
      setNotice({ severity: 'info', message: t('message.nothing-to-copy') });
      return;
    }
    try {
      await navigator.clipboard.writeText(text());
      setNotice({ severity: 'success', message: t('message.copy-success') });
    } catch (e) {
      // A denied/unfocused clipboard write rejects — report it rather than
      // leaving a silent dead button.
      setNotice({
        severity: 'error',
        message: e instanceof Error ? e.message : String(e),
      });
    }
  };

  // Save downloads the whole file, as it is on disk (a rotated .gz stays
  // compressed), from GET /support/log/{name}. Web: direct navigation — the
  // session cookie authenticates and the browser streams the file to disk, as
  // the database download does. Android: navigation is a silent no-op in the
  // WebView (#1169), so the platform save flow — the SAF picker, then the
  // shell streams the endpoint into the pick. The Save button is busy
  // (spinner, inert) while that's in flight — the standard action feedback
  // (ui-standards controls.md).
  const saveToFile = async () => {
    // Belt only — the button is inert while busy.
    if (savingFile()) return;
    const name = file();
    if (!name || !text()) {
      setNotice({ severity: 'info', message: t('message.nothing-to-save') });
      return;
    }
    setNotice(undefined);
    if (!isAndroid()) {
      location.href = supportLogUrl(name);
      return;
    }
    setSavingFile(true);
    try {
      const result = await saveDocument(supportLogUrl(name), name);
      if (result.ok) {
        // saved === false = the user dismissed the OS save picker (declined,
        // not a failure) — no notice. Matches SaveServerLogLink.
        if (result.saved)
          setNotice({
            severity: 'success',
            message: t('messages.log-saved-successfully'),
          });
      } else {
        setNotice({ severity: 'error', message: result.message });
      }
    } finally {
      // Unconditional un-busy: a save that failed any way at all must never
      // leave the button stuck spinning.
      setSavingFile(false);
    }
  };

  return (
    <Dialog
      open={props.open}
      onClose={close}
      title={t('heading.server-log')}
      widthRem={52}
      testId="server-log-modal"
      actions={
        <>
          <Button
            variant="secondary"
            icon={<SaveIcon />}
            loading={savingFile()}
            onClick={() => void saveToFile()}
            data-testid="server-log-save"
          >
            {t('button.save')}
          </Button>
          <Button
            variant="secondary"
            icon={<CopyIcon />}
            onClick={() => void copy()}
            data-testid="server-log-copy"
          >
            {t('button.copy-to-clipboard')}
          </Button>
          {/* Save-to-file and copy-to-clipboard are side actions on the log, not
              this dialog's confirm, so they claim no role; OK is the way out. */}
          <Button
            confirms="plain"
            onClick={close}
            data-testid="dialog-button-ok"
          >
            {t('button.ok')}
          </Button>
        </>
      }
    >
      <Select
        label={t('label.server-log')}
        options={fileNames().map(name => ({ value: name, label: name }))}
        value={file()}
        onValueChange={name => {
          setNotice(undefined);
          setSelectedFile(name);
        }}
        testId="server-log-file"
      />
      <Show when={notice()}>
        {n => <Alert severity={n().severity}>{n().message}</Alert>}
      </Show>
      <Show when={loadFailed()}>
        <Alert severity="error">{t('error.unable-to-load-server-log')}</Alert>
      </Show>
      <Show
        when={!contentsData.loading}
        fallback={<Spinner label={t('label.server-log')} />}
      >
        <Show when={!loadFailed()}>
          <Show when={truncated()}>
            <Alert severity="info">{t('message.server-log-truncated')}</Alert>
          </Show>
          {/* The log is already line-formatted text: shown as written, not
              mapped into an input. Focusable so it scrolls from the keyboard. */}
          <pre
            ref={viewer}
            class={styles.content}
            tabindex="0"
            aria-label={t('label.server-log')}
            data-testid="server-log-content"
          >
            {text()}
          </pre>
        </Show>
      </Show>
    </Dialog>
  );
};

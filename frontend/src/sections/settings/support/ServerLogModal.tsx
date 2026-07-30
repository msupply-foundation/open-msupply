import { createResource, createSignal, Show } from 'solid-js';
import { graphqlFetch } from '../../../api/graphql';
import { Dialog } from '../../../ui/elements/feedback/Dialog';
import { Button } from '../../../ui/elements/buttons/Button';
import { Alert } from '../../../ui/elements/feedback/Alert';
import { Select } from '../../../ui/elements/selectors/Select';
import { Spinner } from '../../../ui/elements/feedback/Spinner';
import { CopyIcon, SaveIcon } from '../../../ui/icons';
import { t } from '../../../intl';
import { TextArea } from '../../../ui/elements/inputs/TextArea';
import { LogContents, LogFileNames } from './serverLog.generated';

/*
 * S3 — Server log viewer (spec/settings/ui-surface.md § S3): pick any one of
 * the server's log files — the current log and its rotated/compressed
 * history — and view its raw text; copy it to the clipboard or save it to a
 * file. Viewing never changes anything (OMS-REG-SET-03.1/.2/.3; rules §
 * Support).
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
    severity: 'success' | 'info';
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
  const names = () =>
    namesData.state === 'ready' || namesData.state === 'refreshing'
      ? namesData.latest
      : undefined;
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
        ? { text: (result.data.logContents.fileContent ?? []).join('\n') }
        : { error: true as const };
    }
  );
  const contents = () =>
    contentsData.state === 'ready' || contentsData.state === 'refreshing'
      ? contentsData.latest
      : undefined;
  const text = () => contents()?.text ?? '';
  const loadFailed = () =>
    names()?.error === true || contents()?.error === true;

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
    await navigator.clipboard.writeText(text());
    setNotice({ severity: 'success', message: t('message.copy-success') });
  };

  const saveToFile = () => {
    if (savingFile()) {
      setNotice({ severity: 'info', message: t('message.already-saving') });
      return;
    }
    if (!text()) {
      setNotice({ severity: 'info', message: t('message.nothing-to-save') });
      return;
    }
    setSavingFile(true);
    const blob = new Blob([text()], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = file() ?? 'server.log';
    anchor.click();
    URL.revokeObjectURL(url);
    setSavingFile(false);
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
            onClick={saveToFile}
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
          <Button onClick={close} data-testid="dialog-button-ok">
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
          {/* The registry's multi-line role (ui-surface S3 → TextArea),
              read-only — not a bespoke viewer (C3). */}
          <TextArea
            label={t('label.server-log')}
            hideLabel
            readonly
            rows={16}
            value={text()}
            data-testid="server-log-content"
          />
        </Show>
      </Show>
    </Dialog>
  );
};

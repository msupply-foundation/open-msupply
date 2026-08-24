import { createSignal, Show } from 'solid-js';
import { SUPPORT_DATABASE_URL } from '../../../config';
import { isAndroid } from '../../../platform';
import { saveDocument } from '../../../platform/openDocument';
import { FieldRow } from '../../../ui/elements/inputs/FieldRow';
import { Button } from '../../../ui/elements/buttons/Button';
import { Alert } from '../../../ui/elements/feedback/Alert';
import { DownloadIcon, FileIcon } from '../../../ui/icons';
import { createFlash } from '../../../ui/utils/createFlash';
import { t } from '../../../intl';
import { ServerLogModal } from './ServerLogModal';
import { Stack } from '../../../ui/layout/Stack/Stack';
import { InstalledPlugins } from './InstalledPlugins';

/*
 * Support (spec/settings/ui-surface.md § Support) — Server Admin only (gated
 * by the page). Two tools, neither of which touches store data:
 *  - Server log: pick and view any of the server's log files (S3).
 *  - Download database: GET /support/database — the server vacuums the
 *    database in place, then streams the file, inside this one authenticated
 *    request (rules § Support — server-side effect). It always downloads from
 *    the CONNECTED server. Web/desktop: direct navigation — the session
 *    cookie authenticates and the browser streams the file to disk (a fetch
 *    would buffer the whole database in memory). Android: navigation is a
 *    silent no-op in the WebView (#1169), so the platform save flow instead —
 *    the SAF picker, then the shell streams the same endpoint into the pick.
 *    SET-04.5's client-mode gate (disabled + message.database-not-local)
 *    awaits client mode itself — this build has no client mode to gate.
 *
 * Plus one read-only block, Installed plugins. It sits here rather than in a
 * section of its own because it answers the same question the two tools above
 * do — what is this installation actually running — for the same audience.
 */
export const SupportSection = () => {
  const [logOpen, setLogOpen] = createSignal(false);

  const [downloading, setDownloading] = createSignal(false);
  const downloadFailed = createFlash<true>();
  const [downloadError, setDownloadError] = createSignal<string>();

  // The Android path. The generous read timeout covers the server-side VACUUM
  // that runs before the first byte — minutes for a large database. The
  // suggested name is the conventional database file name (the server names
  // the real file from its connection string, unknowable before the picker;
  // the user can rename in the picker). A saved file is its own confirmation
  // and a dismissed picker is a decline — only failure reports, on the button
  // and in the inline alert.
  const downloadDatabase = async () => {
    if (downloading()) return;
    setDownloading(true);
    setDownloadError(undefined);
    try {
      const result = await saveDocument(
        SUPPORT_DATABASE_URL,
        'omsupply-database.sqlite',
        { readTimeoutSeconds: 600 }
      );
      if (!result.ok) {
        downloadFailed.show(true);
        setDownloadError(result.message);
      }
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Stack>
      <FieldRow label={t('label.server-log')}>
        <Button
          variant="secondary"
          icon={<FileIcon />}
          onClick={() => setLogOpen(true)}
          data-testid="server-log-view"
        >
          {t('button.view')}
        </Button>
      </FieldRow>
      <FieldRow label={t('label.download-database')}>
        <Button
          variant="secondary"
          icon={<DownloadIcon />}
          title={t('label.download-database')}
          loading={downloading()}
          onClick={() => {
            if (!isAndroid()) {
              // Direct navigation — the browser handles the streamed file as
              // a download (see the header note).
              location.href = SUPPORT_DATABASE_URL;
              return;
            }
            void downloadDatabase();
          }}
          data-testid="download-database"
        >
          {downloadFailed.value()
            ? t('message.download-failed')
            : t('button.download')}
        </Button>
      </FieldRow>
      <Show when={downloadError()}>
        <Alert severity="error">{downloadError()}</Alert>
      </Show>
      <InstalledPlugins />
      <ServerLogModal open={logOpen()} onClose={() => setLogOpen(false)} />
    </Stack>
  );
};

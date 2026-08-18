import { createSignal } from 'solid-js';
import { SUPPORT_DATABASE_URL } from '../../../config';
import { FieldRow } from '../../../ui/elements/inputs/FieldRow';
import { Button } from '../../../ui/elements/buttons/Button';
import { DownloadIcon, FileIcon } from '../../../ui/icons';
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
 *    request (rules § Support — server-side effect). On this web/desktop build
 *    the button is never disabled: it always downloads from the connected
 *    server, so the Android-only "device isn't hosting the database" gate does
 *    not apply (OMS-REG-SET-04.5 / OMS-REG-SET-03.7).
 *
 * Plus one read-only block, Installed plugins. It sits here rather than in a
 * section of its own because it answers the same question the two tools above
 * do — what is this installation actually running — for the same audience.
 */
export const SupportSection = () => {
  const [logOpen, setLogOpen] = createSignal(false);

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
          onClick={() => {
            // Direct navigation — the session cookie authenticates, and the
            // browser handles the streamed file as a download.
            location.href = SUPPORT_DATABASE_URL;
          }}
          data-testid="download-database"
        >
          {t('button.download')}
        </Button>
      </FieldRow>
      <InstalledPlugins />
      <ServerLogModal open={logOpen()} onClose={() => setLogOpen(false)} />
    </Stack>
  );
};

import { createSignal } from 'solid-js';
import { SUPPORT_DATABASE_URL } from '../../../config';
import { FieldRow } from '../../../ui/elements/inputs/FieldRow';
import { Button } from '../../../ui/elements/buttons/Button';
import { DownloadIcon, FileIcon } from '../../../ui/icons';
import { t } from '../../../intl';
import { ServerLogModal } from './ServerLogModal';
import { ServerInfo } from './ServerInfo';
import styles from '../Settings.module.css';

/*
 * Support (spec/settings/ui-surface.md § Support) — Server Admin only (gated
 * by the page). Opens with the settings-owned server-info block (ServerInfo:
 * QR + server URL / site / version / central-server — issue #500), then two
 * tools, neither of which touches store data:
 *  - Server log: pick and view any of the server's log files (S3).
 *  - Download database: GET /support/database — the server vacuums the
 *    database in place, then streams the file, inside this one authenticated
 *    request (rules § Support — server-side effect). On this web/desktop build the
 *    button is never disabled: it always downloads from the connected server,
 *    so the Android-only "device isn't hosting the database" gate does not
 *    apply (OMS-REG-SET-04.5 / OMS-REG-SET-03.7).
 */
export const SupportSection = () => {
  const [logOpen, setLogOpen] = createSignal(false);

  return (
    <div class={styles.sectionBody}>
      <ServerInfo />
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
      <ServerLogModal open={logOpen()} onClose={() => setLogOpen(false)} />
    </div>
  );
};

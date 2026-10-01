import { Show } from 'solid-js';
import { serverVersion, serverVersionDiffers } from '../api/serverInfo';
import { FieldRow } from '../ui/elements/inputs/FieldRow';
import { Text } from '../ui/elements/typography/Text';
import { t } from '../intl';
import styles from './AppVersionRow.module.css';

// The utility pages' labelled version row (chrome OMS-REG-FTR-02.11; shared by
// the Settings server-info block and the Help app bar). One "Version:" row
// with the build's version while it matches the server's — or the server's is
// not known — and, only when the two differ, both values named Interface /
// Server, one per line (issue #574). Kept to the one labelled row either way:
// Settings already carries a "Server:" row for the URL.
export const AppVersionRow = () => (
  <FieldRow label={t('label.app-version')}>
    <Text variant="body" as="span" data-testid="app-version">
      <Show when={serverVersionDiffers()} fallback={APP_VERSION}>
        <span class={styles.line}>
          <strong>{t('label.version-interface')}</strong> {APP_VERSION}
        </span>
        <span class={styles.line}>
          <strong>{t('label.version-server')}</strong> {serverVersion()}
        </span>
      </Show>
    </Text>
  </FieldRow>
);

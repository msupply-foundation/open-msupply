import { createResource, Show } from 'solid-js';
import { graphqlFetch } from '../../../api/graphql';
import { isCentralServer } from '../../../api/serverInfo';
import { InitialisationStatus } from '../../../api/initialisation.generated';
import { QrCode } from '../../../ui/elements/display/QrCode';
import { LabelledValue } from '../../../ui/elements/typography/LabelledValue';
import { Text } from '../../../ui/elements/typography/Text';
import { CentralIcon } from '../../../ui/icons';
import { t } from '../../../intl';
import styles from '../Settings.module.css';

/*
 * Server-info block (spec/settings/ui-surface.md § Support; issue #500) — the
 * settings-owned mirror of the reference app's Admin/ServerInfo: the server
 * URL, site name, app version, central-server label, and a QR of the server
 * URL that expands on click for scanning/pairing. Rendered once, at the top of
 * the Support section (the reference mounts ServerInfo in exactly one place).
 * Version and the central-server label also surface in this app's chrome;
 * duplicating them here matches ServerInfo (issue #500).
 */

// The web/desktop build reaches its own origin — the reference's native
// connected-server path (frontEndHostUrl) doesn't apply here. Static, so read
// once outside the component.
const serverUrl = window.location.origin;

export const ServerInfo = () => {
  // Site name from the initialisation status. Read via the .state gate, never
  // suspending — this lives inside the already-open Settings page
  // (kdd/solid-reactivity-pitfalls § no remounts).
  const [statusData] = createResource(async () => {
    const result = await graphqlFetch(InitialisationStatus, {});
    return result.kind === 'success'
      ? result.data.initialisationStatus
      : undefined;
  });
  const siteName = () =>
    statusData.state === 'ready' || statusData.state === 'refreshing'
      ? (statusData.latest?.siteName ?? undefined)
      : undefined;

  return (
    <div class={styles.serverInfo}>
      {/* QR of the server URL — click to enlarge for scanning/pairing. */}
      <QrCode value={serverUrl} title={t('label.server')} />
      <div class={styles.serverInfoDetails}>
        <LabelledValue label={t('label.server')}>{serverUrl}</LabelledValue>
        <Show when={siteName()}>
          {name => (
            <LabelledValue label={t('label.site')}>{name()}</LabelledValue>
          )}
        </Show>
        <LabelledValue label={t('label.app-version')}>
          {APP_VERSION}
        </LabelledValue>
        <Show when={isCentralServer()}>
          <span class={styles.centralServer}>
            <CentralIcon aria-hidden="true" />
            <Text variant="body" as="span">
              {t('label.central-server')}
            </Text>
          </span>
        </Show>
      </div>
    </div>
  );
};

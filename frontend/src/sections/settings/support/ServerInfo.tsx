import { createResource, Show } from 'solid-js';
import { graphqlFetch } from '../../../api/graphql';
import { gated } from '../../../api/gated';
import { isCentralServer } from '../../../api/serverInfo';
import { InitialisationStatus } from '../../../api/initialisation.generated';
import { QrCode } from '../../../ui/elements/display/QrCode';
import { FieldRow } from '../../../ui/elements/inputs/FieldRow';
import { Text } from '../../../ui/elements/typography/Text';
import { t } from '../../../intl';
import styles from '../Settings.module.css';

/*
 * Server-info block (spec/settings/ui-surface.md § Server-info block; issue
 * #500) — the settings-owned mirror of the reference app's Admin/ServerInfo:
 * the server URL, site name, app version, central-server label, and a QR of the
 * server URL that expands on click for scanning/pairing. Mounted once, in the
 * Settings page header (HeaderButtons) — the reference renders it in the
 * Settings app-bar region (AppBarButtonsPortal), always visible, not inside a
 * collapsible section. It subsumes the header's former standalone version line
 * (it carries the same `app-version` testid). Version and the central-server
 * label also surface in this app's chrome; duplicating them here matches
 * ServerInfo (issue #500).
 */

// The web/desktop build reaches its own origin — the reference's native
// connected-server path (frontEndHostUrl) doesn't apply here. Static, so read
// once outside the component.
const serverUrl = window.location.origin;

export const ServerInfo = () => {
  // Site name from the initialisation status. Non-suspending read — this
  // lives inside the already-open Settings page
  // (kdd/solid-reactivity-pitfalls § no remounts).
  const [statusData] = createResource(async () => {
    const result = await graphqlFetch(InitialisationStatus, {});
    return result.kind === 'success'
      ? result.data.initialisationStatus
      : undefined;
  });
  const siteName = () => gated(statusData)?.siteName ?? undefined;

  return (
    <div class={styles.serverInfo}>
      {/* QR of the server URL — click to enlarge for scanning/pairing. */}
      <QrCode
        value={serverUrl}
        title={t('label.server')}
        triggerTestId="server-qr"
        expandedTestId="server-qr-expanded"
      />
      {/* Details column beside the QR. A plain grouping div — the FieldRows
          block-stack flush on their own, matching the reference (no gap), so no
          layout class is needed here. */}
      <div>
        {/* Inline label:value rows via the shared FieldRow (the app's inline
            label convention, as used by the tools below). label.server lacks a
            trailing colon in the catalogue (unlike label.site / app-version);
            append one so the rows read consistently, as the reference does. */}
        <FieldRow label={`${t('label.server')}:`}>
          <Text variant="body" as="span" data-testid="server-url">
            {serverUrl}
          </Text>
        </FieldRow>
        <Show when={siteName()}>
          {name => (
            <FieldRow label={t('label.site')}>
              <Text variant="body" as="span" data-testid="server-site-name">
                {name()}
              </Text>
            </FieldRow>
          )}
        </Show>
        <FieldRow label={t('label.app-version')}>
          <Text variant="body" as="span" data-testid="app-version">
            {APP_VERSION}
          </Text>
        </FieldRow>
        {/* Central-server line: a FieldRow label with no value — reuses the
            same label styling (weight/size/colour) as the rows above, so no
            bespoke text style, and it aligns at the same inline-start. */}
        <Show when={isCentralServer()}>
          <FieldRow label={t('label.central-server')} labelWidth="auto">
            {null}
          </FieldRow>
        </Show>
      </div>
    </div>
  );
};

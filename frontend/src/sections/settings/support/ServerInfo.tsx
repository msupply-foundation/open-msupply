import { AppVersionRow } from '../../../nav/AppVersionRow';
import { QrCode } from '../../../ui/elements/display/QrCode';
import { FieldRow } from '../../../ui/elements/inputs/FieldRow';
import { Text } from '../../../ui/elements/typography/Text';
import { t } from '../../../intl';
import styles from '../Settings.module.css';

/*
 * Server-info block (spec/settings/ui-surface.md § Server-info block; issue
 * #500) — the settings-owned mirror of the reference app's Admin/ServerInfo:
 * the server URL, app version, and a QR of the server URL that expands on
 * click for scanning/pairing. Mounted once, in the Settings page header
 * (HeaderButtons) — the reference renders it in the Settings app-bar region
 * (AppBarButtonsPortal), always visible, not inside a collapsible section. It
 * subsumes the header's former standalone version line (it carries the same
 * `app-version` testid). The reference's site-name and central-server rows are
 * left out to save header room (issue #574); the bottom bar already carries
 * the central-server marker.
 */

// The web/desktop build reaches its own origin — the reference's native
// connected-server path (frontEndHostUrl) doesn't apply here. Static, so read
// once outside the component.
const serverUrl = window.location.origin;

export const ServerInfo = () => (
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
          trailing colon in the catalogue (unlike label.app-version); append
          one so the rows read consistently, as the reference does. */}
      <FieldRow label={`${t('label.server')}:`}>
        <Text variant="body" as="span" data-testid="server-url">
          {serverUrl}
        </Text>
      </FieldRow>
      <AppVersionRow />
    </div>
  </div>
);

import { createSignal, Show } from 'solid-js';
import { isAndroid } from './index';
import { saveServerLog } from './readServerLog';
import { SaveIcon } from '../ui/icons';
import { t } from '../intl';

// The "Save log" affordance for the initialisation screen (issue #519.5). On
// Android the embedded server's log is the only diagnostic a user can share
// before the site is initialised — the server-log GraphQL API needs an
// authenticated session and doesn't exist in the pre-init schema, so this
// screen reads the log file natively (src/platform/readServerLog.ts) and hands
// it to the platform save flow. Only the initialisation screen carries it (as
// in the current app — NOT the login screen, which is post-initialisation and
// can reach logs through the authenticated app). Renders nothing off Android:
// there is no on-device server, so nothing to save.
//
// Self-contained (kdd/explicit-composition): owns its busy + notice state so
// the screen drops it in as one line. The notice is a plain inline line under
// the link — this screen has no global toast host before auth.
export const SaveServerLogLink = (props: {
  class: string;
  /** Sizing class for the leading glyph, from the host's own stylesheet. */
  iconClass?: string;
  noticeClass?: string;
}) => {
  const [busy, setBusy] = createSignal(false);
  const [notice, setNotice] = createSignal<{
    severity: 'success' | 'error';
    message: string;
  }>();

  const save = async () => {
    if (busy()) return;
    setBusy(true);
    setNotice(undefined);
    const result = await saveServerLog();
    if (result.ok) {
      // saved === false = the user dismissed the OS save picker (declined, not
      // a failure) — no notice.
      if (result.saved)
        setNotice({
          severity: 'success',
          message: t('messages.log-saved-successfully'),
        });
    } else {
      setNotice({ severity: 'error', message: result.message });
    }
    setBusy(false);
  };

  return (
    <Show when={isAndroid()}>
      <button
        type="button"
        class={props.class}
        disabled={busy()}
        onClick={() => void save()}
        data-testid="save-server-log"
      >
        <SaveIcon class={props.iconClass} aria-hidden="true" />
        {t('button.save-log')}
      </button>
      <Show when={notice()}>
        {n => (
          <p
            role="status"
            class={props.noticeClass}
            data-severity={n().severity}
          >
            {n().message}
          </p>
        )}
      </Show>
    </Show>
  );
};

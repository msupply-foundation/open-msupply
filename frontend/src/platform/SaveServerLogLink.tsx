import { createSignal, Show } from 'solid-js';
import { isAndroid } from './index';
import { saveServerLog } from './readServerLog';
import { t } from '../intl';

// The "Save log" affordance for the initialisation and login screens (issue
// #519.5). On Android the embedded server's log is the only diagnostic a user
// can share before they can sign in — the server-log GraphQL API needs an
// authenticated session and doesn't exist in the pre-init schema, so these
// screens read the log file natively (src/platform/readServerLog.ts) and hand
// it to the platform save flow. Renders nothing off Android: there is no
// on-device server, so nothing to save (matches the current app, which shows
// the link only on Android).
//
// Self-contained (kdd/explicit-composition): owns its busy + notice state so
// both screens drop in the same one line. The notice is a plain inline line
// under the link — these screens have no global toast host before auth.
export const SaveServerLogLink = (props: { class: string }) => {
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
        {t('button.save-log')}
      </button>
      <Show when={notice()}>
        {n => (
          <p role="status" data-severity={n().severity}>
            {n().message}
          </p>
        )}
      </Show>
    </Show>
  );
};

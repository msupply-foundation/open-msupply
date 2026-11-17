import { Show } from 'solid-js';
import type { JSX } from 'solid-js';
import { currentUserId } from '../auth/authContext';
import { t } from '../intl';
import styles from '../ui/styles/shared.module.css';
import { createLegacyTableImport } from './legacyTableImportState';

/*
 * Holds the app back while the current user's one-time import of the React
 * front end's table layouts runs (#2072), so that every table mounts reading
 * the imported layouts: createTableConfig reads a table's layout when the
 * table mounts. On a device with nothing to import, which is almost always,
 * the check is synchronous and the children render at once.
 *
 * The fallback is the app's own startup markup, as PluginGate's is, so the
 * import reads as part of startup.
 */
export const LegacyTableImportGate = (props: {
  children?: JSX.Element;
}): JSX.Element => {
  const legacyImport = createLegacyTableImport(currentUserId);
  return (
    <Show
      when={legacyImport.ready()}
      fallback={
        <div class={styles.page}>
          <p>{t('loading')}</p>
        </div>
      }
    >
      {props.children}
    </Show>
  );
};

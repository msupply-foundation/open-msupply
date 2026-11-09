import { createResource, For, Show } from 'solid-js';
import { graphqlFetch } from '../../../api/graphql';
import { isCentralServer } from '../../../api/serverInfo';
import { t } from '../../../intl';
import {
  HOST_RUNTIME,
  PLUGIN_API_VERSION,
} from '../../../plugin-sdk/apiVersion';
import { pluginDiagnostics } from '../../../plugins/diagnostics';
import { loadedPlugins } from '../../../plugins/registry';
import { Alert } from '../../../ui/elements/feedback/Alert';
import { FieldRow } from '../../../ui/elements/inputs/FieldRow';
import { Text } from '../../../ui/elements/typography/Text';
import { FormSection } from '../../../ui/layout/Form/FormSection';
import { Stack } from '../../../ui/layout/Stack/Stack';
import styles from '../Settings.module.css';
import { InstalledPlugins as InstalledPluginsQuery } from './installedPlugins.generated';
import {
  hasNothingToReport,
  pluginProblems,
  pluginRows,
  serverPluginRows,
} from './pluginsLogic';

/*
 * Installed plugins (spec/settings/ui-surface.md § Support) — which plugins
 * this app actually loaded, and anything it refused.
 *
 * This is the administrator-facing surface that spec/plugins/ui-surface.md § S3
 * left as a ⚠️ VERIFY ("notification vs. a diagnostics screen"). A section of
 * Support rather than a notification, because the question it answers —
 * "is the plugin running here?" — is asked during a support call, long after
 * any notification would have been dismissed, and it is asked about plugins
 * that are working as often as ones that are not.
 *
 * Read-only, and read from the registry rather than re-queried: discovery and
 * loading finish before the first operational screen renders (rules §
 * lifecycle), so by the time Settings is open this is settled. Both sources are
 * signals, so a dev-mode hot reload still updates the list in place.
 *
 * Server Admin only, inherited from the Support section that mounts it — no
 * gate of its own.
 */
export const InstalledPlugins = () => {
  const rows = () => pluginRows(loadedPlugins());
  const problems = () => pluginProblems(pluginDiagnostics());

  /*
   * What the SERVER holds — both kinds, every host runtime — which discovery
   * cannot tell us, since it answers only for this app's own runtime.
   *
   * Central-server only, and gated server-side on ConfigurePlugin rather than
   * the Server Admin that gates Support, so a non-success result is an
   * expected outcome here (remote site, or an administrator without that
   * permission), not an error worth reporting: the block is simply absent.
   * Read via the .state gate, never suspending — this lives inside the
   * already-open Settings page (kdd/solid-reactivity-pitfalls § no remounts).
   */
  const [installedData] = createResource(async () => {
    if (!isCentralServer()) return undefined;
    const result = await graphqlFetch(InstalledPluginsQuery, {});
    return result.kind === 'success'
      ? result.data.centralServer.plugin.installedPlugins.nodes
      : undefined;
  });
  const serverRows = () =>
    installedData.state === 'ready' || installedData.state === 'refreshing'
      ? serverPluginRows(
          installedData.latest ?? [],
          rows().map(row => row.code)
        )
      : [];

  return (
    <FormSection title={t('heading.plugins')} headingLevel="h3">
      <Stack>
        {/* What this app asked the server for, shown whether or not anything
         * came back. Without it the list below is uninterpretable: a bundle
         * built for a different front end is never offered to this app, so
         * "nothing here" and "nothing installed" look identical, and the
         * difference is the first thing to establish when a plugin an
         * administrator installed does not appear.
         *
         * An italic parenthetical on one line rather than a label:value row:
         * as a row it read as the first entry of the list beneath it — a
         * loaded plugin whose code was missing — which is how it was first
         * misread. It is context for the list, not a member of it, so it is
         * set apart as an aside instead. */}
        <Text
          variant="bodySmall"
          class={styles.pluginHostNote}
          data-testid="plugin-host-runtime"
        >
          {t('label.plugin-host-runtime', {
            runtime: HOST_RUNTIME,
            api: PLUGIN_API_VERSION,
          })}
        </Text>
        <Show
          when={!hasNothingToReport(rows(), problems())}
          fallback={
            <Stack>
              <Text variant="bodySmall" data-testid="plugins-none">
                {t('message.no-plugins-for-this-app')}
              </Text>
              {/* The distinction the server cannot make for us: discovery
               * answers only for THIS runtime, so a plugin installed for
               * another front end is absent here and present on the server. */}
              <Text variant="bodySmall">
                {t('message.plugins-other-runtime')}
              </Text>
            </Stack>
          }
        >
          <For each={rows()}>
            {row => (
              /* Code as the label: it is the plugin's identity and what
               * an administrator is given to look for. The version and API are
               * what they are checking it against.
               */
              <FieldRow label={<Text mono>{row.code}</Text>}>
                <Text variant="bodySmall" data-testid={`plugin-${row.code}`}>
                  {t('label.plugin-version-api', {
                    version: row.version,
                    api: row.pluginApiVersion,
                  })}
                </Text>
              </FieldRow>
            )}
          </For>
          {/* Failures carry their own already-administrator-comprehensible
              message, naming the plugin (spec/plugins/rules.md § discovery &
              loading), so they are shown as recorded rather than rebuilt from
              parts here. */}
          <For each={problems()}>
            {problem => (
              <Alert
                severity={problem.level === 'error' ? 'error' : 'warning'}
                testId="plugin-problem"
              >
                <Show
                  when={problem.pluginCode}
                  fallback={<span>{problem.message}</span>}
                >
                  <Text mono as="span">
                    {problem.pluginCode}
                  </Text>
                  {` — ${problem.message}`}
                </Show>
              </Alert>
            )}
          </For>
        </Show>
        {/* The server's own set, when it can be read. Answers the question the
         * list above cannot: a plugin the server holds that this app never
         * got — a backend one, or a bundle built for the other front end — is
         * otherwise indistinguishable from one that was never installed. */}
        {/* Why the block below is missing, on the sites where it always will
         * be. Silence here is indistinguishable from a fault: the server's set
         * is exactly what someone consults this section to see, and a remote
         * site can never show it. */}
        <Show when={!isCentralServer()}>
          <Text
            variant="bodySmall"
            class={styles.pluginHostNote}
            data-testid="plugins-server-list-unavailable"
          >
            {t('message.plugins-central-only')}
          </Text>
        </Show>
        <Show when={serverRows().length > 0}>
          <Text variant="bodySmall" class={styles.pluginHostNote}>
            {t('heading.plugins-on-server')}
          </Text>
          <For each={serverRows()}>
            {row => (
              <FieldRow label={<Text mono>{row.code}</Text>}>
                <Text
                  variant="bodySmall"
                  data-testid={`server-plugin-${row.code}`}
                >
                  {t(
                    row.status === 'server-side'
                      ? 'label.plugin-server-side'
                      : row.status === 'loaded'
                        ? 'label.plugin-loaded-here'
                        : 'label.plugin-not-loaded-here',
                    { version: row.version }
                  )}
                </Text>
              </FieldRow>
            )}
          </For>
        </Show>
      </Stack>
    </FormSection>
  );
};

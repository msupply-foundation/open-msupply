/*
 * The loader's acceptance decision (spec/plugins/rules.md § discovery &
 * loading, § compatibility gates) — pure, so the one place that decides
 * whether arbitrary third-party code is allowed into the app is unit-testable
 * without a server.
 *
 * A bundle is arbitrary code that may export anything at all, or nothing.
 * Every rejection here is a plugin SKIPPED with a stated reason: the app
 * continues, the other plugins are unaffected, and nothing is swallowed
 * silently.
 */
import { PLUGIN_API_VERSION, type PluginDefinition } from './sdk/types';
import type { RegisteredPlugin } from './registry';

export type BundleVerdict =
  | { kind: 'accepted'; plugin: RegisteredPlugin }
  | { kind: 'skipped'; reason: string };

/*
 * The default export is checked structurally rather than trusted. Note what is
 * NOT validated: a contribution's own fields. A contribution with a broken
 * `Component` throws at render and its error boundary contains it to its own
 * slot — that is the designed degradation. The one shape that must never get
 * through is a non-array `contributions`, because `contributionsFor` flatMaps
 * over it on every slot render, outside any boundary, so it would break every
 * slot in the app rather than just this plugin's.
 */
const definitionOf = (module: unknown): PluginDefinition | undefined => {
  const exported =
    typeof module === 'object' && module !== null && 'default' in module
      ? module.default
      : undefined;
  if (typeof exported !== 'object' || exported === null) return undefined;
  if (!('manifest' in exported)) return undefined;
  const { manifest } = exported;
  if (
    typeof manifest !== 'object' ||
    manifest === null ||
    !('code' in manifest) ||
    typeof manifest.code !== 'string' ||
    manifest.code.length === 0 ||
    !('version' in manifest) ||
    typeof manifest.version !== 'string' ||
    !('pluginApiVersion' in manifest) ||
    typeof manifest.pluginApiVersion !== 'number'
  )
    return undefined;
  if (
    'contributions' in exported &&
    exported.contributions !== undefined &&
    !Array.isArray(exported.contributions)
  )
    return undefined;
  // Trusted narrowing: every field the definition's shape requires is checked
  // above (kdd/type-safety — `as` is permitted in the plugin layer).
  return exported as PluginDefinition;
};

/**
 * Decide whether a loaded module may join the registry.
 *
 * `installedAs` is the code the SERVER reported. It is absent for a dev-linked
 * source tree, where the manifest is the only authority — the directory name is
 * just where the file sits, so comparing against it would reject every
 * dev-linked plugin whose folder is named anything but its code.
 */
export const acceptBundle = (
  module: unknown,
  installedAs?: string
): BundleVerdict => {
  const definition = definitionOf(module);
  if (!definition)
    return {
      kind: 'skipped',
      reason:
        'the bundle does not default-export a definePlugin({ manifest, … }) result',
    };

  // The compatibility gate: a plugin built against a NEWER plugin API than the
  // host provides never loads — the host cannot honour a contract it does not
  // have. An older one with the same major always does, because the surface
  // only grows within a major.
  const declared = definition.manifest.pluginApiVersion;
  if (declared > PLUGIN_API_VERSION)
    return {
      kind: 'skipped',
      reason: `built against plugin API v${declared}, this app provides v${PLUGIN_API_VERSION} — the plugin needs a newer app, or the app needs an older plugin`,
    };

  if (installedAs !== undefined && definition.manifest.code !== installedAs)
    // Its rows are stamped with the installed code and its i18n namespace IS
    // that code, so a manifest disagreeing with it would write data the plugin
    // itself could never read back.
    return {
      kind: 'skipped',
      reason: `manifest declares code "${definition.manifest.code}" but it is installed as "${installedAs}" — its stored data and translations would not resolve`,
    };

  return {
    kind: 'accepted',
    plugin: {
      // Always the manifest's code: it is what the plugin's own rows, i18n
      // namespace, and backend pairing use.
      code: definition.manifest.code,
      version: definition.manifest.version,
      contributions: definition.contributions ?? [],
    },
  };
};

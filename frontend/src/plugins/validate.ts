import {
  PLUGIN_API_MIN_SUPPORTED,
  PLUGIN_API_VERSION,
} from '../plugin-sdk/apiVersion';
import type { PluginModule, SlotId } from '../plugin-sdk/types';

/*
 * The gate every loaded bundle passes before the host trusts it
 * (spec/plugins/rules.md § compatibility gates, § contributions).
 *
 * Pure and synchronous: it inspects an already-evaluated module namespace and
 * returns a verdict. Fetching, importing, registering, and reporting are the
 * loader's — so every refusal path is unit-testable without a network, a DOM,
 * or a real bundle.
 *
 * A refusal is total: the plugin is skipped whole, never half-registered. That
 * is what makes "one plugin can never affect another" (rules § error isolation)
 * hold at registration time as well as at render time.
 */

// The slot ids the host actually has surfaces for. Declared as an exhaustive
// Record over SlotId so adding a slot to the SDK catalogue without publishing
// it here is a type error — the runtime set can never drift behind the type.
const SLOT_IDS: Record<SlotId, true> = {
  'dashboard.widget': true,
  'dashboard.panel': true,
  'dashboard.stat': true,
};

/** Every slot id the host recognises; anything else is refused. */
export const KNOWN_SLOT_IDS = Object.keys(SLOT_IDS) as readonly SlotId[];

export type ValidationVerdict =
  | {
      kind: 'ok';
      module: PluginModule;
      /** Non-fatal notes to record — today only the downlevel-API warning. */
      warnings: readonly string[];
    }
  | { kind: 'refused'; message: string };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

/**
 * Validate a plugin bundle's evaluated module namespace against the metadata
 * the server advertised it under.
 *
 * `code` is discovery's code — the identity the host loaded the bundle AS. The
 * manifest must agree with it, so a bundle can never register under another
 * plugin's namespace (its i18n namespace, its plugin-data scope, and its
 * contribution ids all derive from the code).
 */
export const validateLoadedModule = (
  code: string,
  imported: unknown
): ValidationVerdict => {
  if (!isRecord(imported)) {
    return { kind: 'refused', message: 'bundle did not evaluate to a module' };
  }
  const candidate = imported['default'];

  // The brand is what `definePlugin` stamps; a bundle default-exporting
  // anything else was not built against the SDK's entry contract.
  if (!isRecord(candidate) || candidate['kind'] !== 'oms.plugin') {
    return {
      kind: 'refused',
      message:
        'default export is not a definePlugin() result (missing the plugin brand)',
    };
  }

  const manifest = candidate['manifest'];
  if (!isRecord(manifest)) {
    return { kind: 'refused', message: 'manifest is missing' };
  }
  if (manifest['code'] !== code) {
    return {
      kind: 'refused',
      message: `manifest code "${String(manifest['code'])}" does not match the installed plugin code "${code}"`,
    };
  }

  const apiVersion = manifest['pluginApiVersion'];
  if (typeof apiVersion !== 'number' || !Number.isInteger(apiVersion)) {
    return {
      kind: 'refused',
      message: `pluginApiVersion must be an integer, got ${JSON.stringify(apiVersion)}`,
    };
  }
  // The version pair, as two integer comparisons (rules § compatibility gates):
  // newer than the host is refused (the host cannot provide what it does not
  // have), older than the floor is refused (the surface it was built against is
  // gone), anything between loads.
  if (apiVersion > PLUGIN_API_VERSION) {
    return {
      kind: 'refused',
      message: `built against plugin API ${apiVersion}, but this app provides ${PLUGIN_API_VERSION} — the plugin needs a newer app version`,
    };
  }
  if (apiVersion < PLUGIN_API_MIN_SUPPORTED) {
    return {
      kind: 'refused',
      message: `built against plugin API ${apiVersion}, which this app no longer supports (minimum ${PLUGIN_API_MIN_SUPPORTED}) — the plugin needs rebuilding`,
    };
  }
  const warnings: string[] = [];
  if (apiVersion < PLUGIN_API_VERSION) {
    warnings.push(
      `built against plugin API ${apiVersion}, older than this app's ${PLUGIN_API_VERSION} — supported, but rebuilding against the current SDK is recommended`
    );
  }

  const contributions = candidate['contributions'];
  if (contributions !== undefined) {
    if (!Array.isArray(contributions)) {
      return { kind: 'refused', message: 'contributions is not an array' };
    }
    // Uniqueness is per (slot, id) — the same id in two different slots is
    // fine, twice in one slot is not: the pair is the render key and the anchor
    // target, so a duplicate would make placement and suppression ambiguous.
    const seen = new Set<string>();
    for (const entry of contributions as readonly unknown[]) {
      if (!isRecord(entry)) {
        return { kind: 'refused', message: 'a contribution is not an object' };
      }
      const slot = entry['slot'];
      if (
        typeof slot !== 'string' ||
        !(KNOWN_SLOT_IDS as readonly string[]).includes(slot)
      ) {
        return {
          kind: 'refused',
          message: `contribution declares unknown slot ${JSON.stringify(slot)}`,
        };
      }
      const id = entry['id'];
      if (typeof id !== 'string' || id.length === 0) {
        return {
          kind: 'refused',
          message: `contribution in slot "${slot}" has no id`,
        };
      }
      if (typeof entry['Component'] !== 'function') {
        return {
          kind: 'refused',
          message: `contribution "${slot}/${id}" has no Component function`,
        };
      }
      const key = `${slot}/${id}`;
      if (seen.has(key)) {
        return {
          kind: 'refused',
          message: `duplicate contribution id "${id}" in slot "${slot}"`,
        };
      }
      seen.add(key);
    }
  }

  // Trusted-layer cast (kdd/type-safety): every field the contract depends on
  // has just been checked at runtime, which is exactly what the loader cannot
  // express in the type system about a module it did not build.
  return {
    kind: 'ok',
    module: candidate as unknown as PluginModule,
    warnings,
  };
};

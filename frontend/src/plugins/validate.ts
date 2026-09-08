import {
  PLUGIN_API_MIN_SUPPORTED,
  PLUGIN_API_VERSION,
} from '../plugin-sdk/apiVersion';
import type { PluginModule, SlotId } from '../plugin-sdk/types';
import { DASHBOARD_LEGACY_PATH, navDestinations } from '../nav/navConfig';

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
  'dashboard.body': true,
  'internalOrderLine.column': true,
  'internalOrderLine.infoPanel': true,
  'prescription.paymentForm': true,
};

/**
 * The slots whose contributions MAY render declaratively (a `value` function)
 * instead of with a `Component` — the column slots (sdk-contract § the column
 * slot). Everywhere else a `Component` is the only rendering there is.
 */
const VALUE_RENDERING_SLOTS: readonly string[] = ['internalOrderLine.column'];

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

// A page or section path: URL segments of letters, digits, `-` and `_`, each
// starting with a letter or digit (the spec states the same leading-character
// rule — sdk-contract § Paths). No leading/trailing/double slashes, no params,
// no dots — a path is an address, and everything else about a page is
// declared, not encoded.
const PATH_SEGMENT = /^[a-z0-9][a-z0-9_-]*$/i;
const isValidPagePath = (path: unknown): path is string =>
  typeof path === 'string' &&
  path.length > 0 &&
  path.split('/').every(segment => PATH_SEGMENT.test(segment));

/**
 * Two paths claim the same URL space when either is a segment-prefix of the
 * other — the router judges a path by its deepest matching destination, so
 * nesting under a host section would silently inherit (or shadow) its gates.
 * ONE definition, exported: the runtime resolver (pluginPages.tsx) applies the
 * same rule to plugin-vs-plugin collisions, and the two must never drift —
 * validation refusing one set of paths while the registry resolves another
 * would let a bundle pass the gate yet lose its section silently.
 */
export const pathsCollide = (a: string, b: string): boolean =>
  a === b || a.startsWith(`${b}/`) || b.startsWith(`${a}/`);

// The host's own address space: every registry destination, plus the routes
// the router owns outside the registry (Home's empty path is unreachable by a
// valid section path; the dashboard legacy redirect is declared beside the
// registry so it cannot drift from App.tsx's route).
const HOST_RESERVED_PATHS: readonly string[] = [
  ...navDestinations.map(dest => dest.path).filter(path => path !== ''),
  DASHBOARD_LEGACY_PATH,
];

// The `pages` entry kinds this host provides. A `pages` entry is a
// discriminated union (PluginPageContribution) with one arm today; an entry
// whose kind is not listed here was built for a newer arm, and refusing it BY
// NAME is what lets future arms join additively — an old host names the gap
// instead of misreading the entry as a malformed section.
const KNOWN_PAGE_KINDS: readonly string[] = ['section'];

/**
 * Validate one section of a `pages` contribution. Returns the refusal message,
 * or undefined when the section is well-formed. Collisions with the HOST are
 * refused here (they are knowable from this module alone); collisions between
 * two plugins are a load-order fact, so the registry's consumers resolve them
 * deterministically and record the loser in diagnostics instead.
 */
const validatePageSection = (
  section: unknown,
  seenIds: Set<string>,
  seenPaths: string[]
): string | undefined => {
  if (!isRecord(section)) return 'a pages section is not an object';
  const kind = section['kind'];
  if (
    kind !== undefined &&
    (typeof kind !== 'string' || !KNOWN_PAGE_KINDS.includes(kind))
  ) {
    return `a pages entry declares the kind ${JSON.stringify(kind)}, which this app's plugin API does not provide (known: ${KNOWN_PAGE_KINDS.map(known => `"${known}"`).join(', ')})`;
  }
  const id = section['id'];
  if (typeof id !== 'string' || id.length === 0) {
    return 'a pages section has no id';
  }
  if (seenIds.has(id)) return `duplicate pages section id "${id}"`;
  seenIds.add(id);

  if (typeof section['labelKey'] !== 'string' || !section['labelKey']) {
    return `pages section "${id}" has no labelKey`;
  }
  const path = section['path'];
  if (!isValidPagePath(path)) {
    return `pages section "${id}" has an invalid path ${JSON.stringify(path)}`;
  }
  const hostCollision = HOST_RESERVED_PATHS.find(host =>
    pathsCollide(host, path)
  );
  if (hostCollision) {
    return `pages section "${id}" path "${path}" collides with the host destination "${hostCollision}"`;
  }
  const priorPath = seenPaths.find(seen => pathsCollide(seen, path));
  if (priorPath !== undefined) {
    return `pages section "${id}" path "${path}" collides with this plugin's own "${priorPath}"`;
  }
  seenPaths.push(path);

  if (section['when'] !== undefined && typeof section['when'] !== 'function') {
    return `pages section "${id}" has a non-function when gate`;
  }
  const permissions = section['permissions'];
  if (
    permissions !== undefined &&
    (!Array.isArray(permissions) ||
      permissions.some(entry => typeof entry !== 'string' || entry === ''))
  ) {
    return `pages section "${id}" has an invalid permissions list`;
  }

  const pages = section['pages'];
  if (!Array.isArray(pages) || pages.length === 0) {
    return `pages section "${id}" declares no pages`;
  }
  const pagePaths = new Set<string>();
  for (const page of pages as readonly unknown[]) {
    if (!isRecord(page)) return `pages section "${id}" has a non-object page`;
    if (!isValidPagePath(page['path'])) {
      return `pages section "${id}" has a page with an invalid path ${JSON.stringify(page['path'])}`;
    }
    if (pagePaths.has(page['path'])) {
      return `pages section "${id}" declares the page path "${page['path']}" twice`;
    }
    pagePaths.add(page['path']);
    if (typeof page['labelKey'] !== 'string' || !page['labelKey']) {
      return `pages section "${id}" page "${page['path']}" has no labelKey`;
    }
    if (typeof page['load'] !== 'function') {
      return `pages section "${id}" page "${page['path']}" has no load function`;
    }
  }
  return undefined;
};

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
      // Something must render the contribution. A column slot accepts either
      // form; every other slot has only `Component`, so a bundle offering a
      // bare `value` there was built against a surface this host does not have.
      const hasComponent = typeof entry['Component'] === 'function';
      const hasValue =
        VALUE_RENDERING_SLOTS.includes(slot) &&
        typeof entry['value'] === 'function';
      if (!hasComponent && !hasValue) {
        return {
          kind: 'refused',
          message: VALUE_RENDERING_SLOTS.includes(slot)
            ? `contribution "${slot}/${id}" has neither a Component nor a value function`
            : `contribution "${slot}/${id}" has no Component function`,
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

  const pages = candidate['pages'];
  if (pages !== undefined) {
    if (!Array.isArray(pages)) {
      return { kind: 'refused', message: 'pages is not an array' };
    }
    const sectionIds = new Set<string>();
    const sectionPaths: string[] = [];
    for (const section of pages as readonly unknown[]) {
      const refusal = validatePageSection(section, sectionIds, sectionPaths);
      if (refusal) return { kind: 'refused', message: refusal };
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

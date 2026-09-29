import {
  PLUGIN_API_MIN_SUPPORTED,
  PLUGIN_API_VERSION,
} from '../plugin-sdk/apiVersion';
import { HOST_NAV_SECTION_IDS, HOST_WARNING_IDS } from '../plugin-sdk/types';
import type { PluginModule, SlotId } from '../plugin-sdk/types';
import {
  DASHBOARD_LEGACY_PATH,
  DISPENSING_LEGACY_PATH,
  navDestinations,
} from '../nav/navConfig';

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
  'internalOrder.sidePanelSection': true,
  'host.warningSuppression': true,
  'prescription.paymentForm': true,
};

/**
 * The slots whose contributions MAY render declaratively (a `value` function)
 * instead of with a `Component` — the column slots (sdk-contract § the column
 * slot). Everywhere else a `Component` is the only rendering there is.
 */
const VALUE_RENDERING_SLOTS: readonly string[] = ['internalOrderLine.column'];

/**
 * The slots that are CONSULTED rather than rendered — a resolver function is
 * their whole contribution, and a `Component` cannot stand in for it
 * (sdk-contract § the warning-suppression slot): a bundle offering one there
 * was built against a surface this host does not have. `SlotId`-keyed like
 * `SLOT_IDS`, so a mistyped or renamed slot id here is a type error rather
 * than a silent fall-through to the Component check.
 */
const RESOLVER_SLOTS: Readonly<Partial<Record<SlotId, string>>> = {
  'host.warningSuppression': 'suppresses',
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

// A refusal against a published id set names the whole set, formatted one way
// everywhere (the nav-section and warning checks below share it).
const publishedSet = (ids: readonly string[]): string =>
  ids.map(known => `"${known}"`).join(', ');

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
// valid section path; the legacy redirects are declared beside the registry so
// they cannot drift from App.tsx's routes).
const HOST_RESERVED_PATHS: readonly string[] = [
  ...navDestinations.map(dest => dest.path).filter(path => path !== ''),
  DASHBOARD_LEGACY_PATH,
  DISPENSING_LEGACY_PATH,
];

// The two gates share one shape wherever they appear (a page, a nav section),
// so their checks live once.
const gateShapeRefusal = (
  entry: Record<string, unknown>,
  described: string
): string | undefined => {
  if (entry['when'] !== undefined && typeof entry['when'] !== 'function') {
    return `${described} has a non-function when gate`;
  }
  const permissions = entry['permissions'];
  if (
    permissions !== undefined &&
    (!Array.isArray(permissions) ||
      permissions.some(item => typeof item !== 'string' || item === ''))
  ) {
    return `${described} has an invalid permissions list`;
  }
  return undefined;
};

/**
 * Validate one `navSections` entry — a menu group of the plugin's own: pure
 * menu object, no path, no route. Returns the refusal message, or undefined
 * when well-formed.
 */
const validateNavSection = (
  section: unknown,
  seenIds: Set<string>
): string | undefined => {
  if (!isRecord(section)) return 'a nav section is not an object';
  const id = section['id'];
  if (typeof id !== 'string' || id.length === 0) {
    return 'a nav section has no id';
  }
  if (seenIds.has(id)) return `duplicate nav section id "${id}"`;
  // A plugin section id that shadows a published host section id would make
  // every `nav.in` naming it ambiguous — refused while it is knowable from
  // this module alone, like a host path collision.
  if ((HOST_NAV_SECTION_IDS as readonly string[]).includes(id)) {
    return `nav section id "${id}" shadows the host section of the same id`;
  }
  seenIds.add(id);
  if (typeof section['labelKey'] !== 'string' || !section['labelKey']) {
    return `nav section "${id}" has no labelKey`;
  }
  return gateShapeRefusal(section, `nav section "${id}"`);
};

/**
 * Validate one page of a flat `pages` declaration. Returns the refusal
 * message, or undefined when the page is well-formed. Collisions with the
 * HOST — a path a host destination holds, a `nav.in` id the host and the
 * plugin both lack — are refused here (they are knowable from this module
 * alone); path collisions between two plugins are a load-order fact, so the
 * registry's consumers resolve them deterministically and record the loser in
 * diagnostics instead.
 */
const validatePage = (
  page: unknown,
  seenIds: Set<string>,
  seenPaths: string[],
  navSectionIds: ReadonlySet<string>
): string | undefined => {
  if (!isRecord(page)) return 'a page is not an object';
  const id = page['id'];
  if (typeof id !== 'string' || id.length === 0) return 'a page has no id';
  if (seenIds.has(id)) return `duplicate page id "${id}"`;
  seenIds.add(id);

  if (typeof page['labelKey'] !== 'string' || !page['labelKey']) {
    return `page "${id}" has no labelKey`;
  }
  const path = page['path'];
  if (!isValidPagePath(path)) {
    return `page "${id}" has an invalid path ${JSON.stringify(path)}`;
  }
  const hostCollision = HOST_RESERVED_PATHS.find(host =>
    pathsCollide(host, path)
  );
  if (hostCollision) {
    return `page "${id}" path "${path}" collides with the host destination "${hostCollision}"`;
  }
  const priorPath = seenPaths.find(seen => pathsCollide(seen, path));
  if (priorPath !== undefined) {
    return `page "${id}" path "${path}" collides with this plugin's own "${priorPath}"`;
  }
  seenPaths.push(path);

  if (typeof page['load'] !== 'function') {
    return `page "${id}" has no load function`;
  }
  const gateRefusal = gateShapeRefusal(page, `page "${id}"`);
  if (gateRefusal) return gateRefusal;

  // The placement: absent (routed, no menu entry), { in }, or { root: true }.
  // A shape that is neither, or an `in` id neither the host nor this plugin
  // provides, is refused BY NAME — that is what lets placements grow
  // additively: an old host names the gap instead of misreading the entry.
  const nav = page['nav'];
  if (nav === undefined) return undefined;
  if (!isRecord(nav)) {
    return `page "${id}" has a non-object nav placement`;
  }
  const inId = nav['in'];
  const root = nav['root'];
  if (inId !== undefined && root !== undefined) {
    return `page "${id}" nav declares both "in" and "root" — a placement is one of the two`;
  }
  if (root !== undefined) {
    if (root !== true) {
      return `page "${id}" nav declares root: ${JSON.stringify(root)} — only \`root: true\` is a placement`;
    }
    return undefined;
  }
  if (inId === undefined) {
    return `page "${id}" nav declares neither "in" nor "root" — this app's plugin API provides { in } and { root: true } placements`;
  }
  if (typeof inId !== 'string' || inId.length === 0) {
    return `page "${id}" nav has an invalid "in" id ${JSON.stringify(inId)}`;
  }
  if (
    !navSectionIds.has(inId) &&
    !(HOST_NAV_SECTION_IDS as readonly string[]).includes(inId)
  ) {
    return `page "${id}" nav places it in "${inId}", which is neither one of this plugin's nav sections nor a host section this app's plugin API provides (host sections: ${publishedSet(HOST_NAV_SECTION_IDS)})`;
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
      // Something must render — or, for a consulted slot, answer — the
      // contribution. A column slot accepts either rendering form; a resolver
      // slot takes only its named resolver; every other slot has only
      // `Component`. A bundle offering the wrong form was built against a
      // surface this host does not have.
      // The KNOWN_SLOT_IDS check above is what makes this assertion sound.
      const resolverField = RESOLVER_SLOTS[slot as SlotId];
      if (resolverField !== undefined) {
        if (typeof entry[resolverField] !== 'function') {
          return {
            kind: 'refused',
            message: `contribution "${slot}/${id}" has no ${resolverField} function`,
          };
        }
        // A consulted slot renders nothing, ever — a contribution ALSO
        // carrying a rendering form was built against a surface this host
        // does not have (sdk-contract § the warning-suppression slot: "a
        // `Component` there is refused"), and silently dropping the render
        // half would hide that from its author.
        if (entry['Component'] !== undefined || entry['value'] !== undefined) {
          return {
            kind: 'refused',
            message: `contribution "${slot}/${id}" carries a rendering form — the slot is consulted, never rendered`,
          };
        }
      }
      // The suppression slot names its TARGET — a published host warning id.
      // Keyed on the SLOT, not the resolver branch: a future consulted slot
      // would have a resolver but no warning to name, and must not be forced
      // through this check. Any other id means the bundle was built against a
      // host that publishes the warning (the same judgement as an unknown slot
      // id), refused by name so an old host names the gap instead of silently
      // never consulting the contribution.
      if (slot === 'host.warningSuppression') {
        const warning = entry['warning'];
        if (warning === undefined) {
          return {
            kind: 'refused',
            message: `contribution "${slot}/${id}" names no warning to suppress — this app's plugin API publishes: ${publishedSet(HOST_WARNING_IDS)}`,
          };
        }
        if (
          typeof warning !== 'string' ||
          !(HOST_WARNING_IDS as readonly string[]).includes(warning)
        ) {
          return {
            kind: 'refused',
            message: `contribution "${slot}/${id}" suppresses unknown warning ${JSON.stringify(warning)} — this app's plugin API publishes: ${publishedSet(HOST_WARNING_IDS)}`,
          };
        }
      }
      if (resolverField === undefined) {
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

  // Nav sections first: a page's `nav.in` is checked against their ids.
  const navSections = candidate['navSections'];
  const navSectionIds = new Set<string>();
  if (navSections !== undefined) {
    if (!Array.isArray(navSections)) {
      return { kind: 'refused', message: 'navSections is not an array' };
    }
    for (const section of navSections as readonly unknown[]) {
      const refusal = validateNavSection(section, navSectionIds);
      if (refusal) return { kind: 'refused', message: refusal };
    }
  }

  const pages = candidate['pages'];
  if (pages !== undefined) {
    if (!Array.isArray(pages)) {
      return { kind: 'refused', message: 'pages is not an array' };
    }
    const pageIds = new Set<string>();
    const pagePaths: string[] = [];
    for (const page of pages as readonly unknown[]) {
      const refusal = validatePage(page, pageIds, pagePaths, navSectionIds);
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

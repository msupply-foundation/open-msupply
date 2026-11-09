import { createEffect, createSignal, type Accessor } from 'solid-js';
import type { AnchorDiagnostic } from './anchorMerge';

/*
 * The plugin system's diagnostics channel (spec/plugins/rules.md § discovery &
 * loading — "the failure is surfaced (visible in diagnostics, not silently
 * swallowed)"; ui-surface § S3).
 *
 * Two sinks, deliberately: a signal, and the console, so a failure is
 * discoverable in a support session today. The signal is rendered by Settings ›
 * Support › Installed plugins (spec/settings/ui-surface.md § Support) — the
 * administrator-facing surface ui-surface § S3 used to leave open. The loader
 * also publishes the accessor on `globalThis.__oms__` so a walk (or an e2e
 * test) can read it.
 */

export type PluginDiagnosticLevel = 'error' | 'warning' | 'info';

export interface PluginDiagnostic {
  level: PluginDiagnosticLevel;
  /**
   * The plugin the diagnostic is about; absent for system-wide failures
   * (discovery).
   */
  pluginCode?: string;
  /**
   * Administrator-comprehensible, already naming the plugin where there is
   * one.
   */
  message: string;
}

const [diagnostics, setDiagnostics] = createSignal<readonly PluginDiagnostic[]>(
  []
);

/** Every diagnostic recorded this session, in the order it happened. */
export const pluginDiagnostics = diagnostics;

/**
 * Record a plugin diagnostic. Append-only and never throws — it is called from
 * inside the loader's own failure handling, where throwing would defeat the
 * point.
 */
export const recordPluginDiagnostic = (diagnostic: PluginDiagnostic): void => {
  const prefix = diagnostic.pluginCode
    ? `[plugins] ${diagnostic.pluginCode}: `
    : '[plugins] ';
  const line = `${prefix}${diagnostic.message}`;
  if (diagnostic.level === 'error') console.error(line);
  else if (diagnostic.level === 'warning') console.warn(line);
  else console.info(line);
  setDiagnostics(current => [...current, diagnostic]);
};

/**
 * Record a slot region's degradations, each one once
 * (spec/plugins/rules.md § contributions — a broken anchor degrades loudly).
 *
 * Every region that places contributions against host pieces reports the same
 * way, because the merge is pure by construction: it runs inside a memo and
 * recording is a write, so it RETURNS its degradations and the caller writes
 * them (kdd/solid-reactivity-pitfalls). This is that caller half, shared —
 * the dashboard's three piece regions, its body region, and the internal-order
 * line table were four copies of it.
 *
 * Deduped per call site on the whole (contribution, message) pair, so a
 * re-merge — a preference gate resolving, a batch landing, a plugin loading
 * after the screen mounted — cannot spam the same broken anchor, while a
 * genuinely different degradation from the same contribution still gets
 * through. Call it during setup: it owns an effect.
 *
 * `slot` prefixes the message, so an administrator reading the list can tell
 * which surface the plugin failed at.
 *
 * Both parameters are ACCESSORS, and the name is `create*` on purpose: that is
 * the shape `solid/reactivity` recognises as a primitive whose function
 * arguments are tracked scopes, so a caller passing `props.slot` needs no
 * eslint exemption — and a region whose slot really does change is read
 * correctly rather than frozen at setup.
 */
export const createRegionDiagnostics = (
  diagnostics: Accessor<readonly AnchorDiagnostic[]>,
  slot: Accessor<string>
): void => {
  const reported = new Set<string>();
  createEffect(() => {
    for (const diagnostic of diagnostics()) {
      const key = `${diagnostic.contributionId}:${diagnostic.message}`;
      if (reported.has(key)) continue;
      reported.add(key);
      recordPluginDiagnostic({
        level: 'warning',
        // The published id is `<pluginCode>.<contributionId>`, so the code is
        // its first segment — a plugin code carries no dots.
        pluginCode: diagnostic.contributionId.split('.')[0],
        message: `${slot()}: ${diagnostic.contributionId} — ${diagnostic.message}`,
      });
    }
  });
};

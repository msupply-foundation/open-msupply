import { createSignal } from 'solid-js';

/*
 * The plugin system's diagnostics channel (spec/plugins/rules.md § discovery &
 * loading — "the failure is surfaced (visible in diagnostics, not silently
 * swallowed)"; ui-surface § S3).
 *
 * Two sinks, deliberately: a signal any future surface can render, and the
 * console, so a failure is discoverable in a support session today. The
 * administrator-facing on-screen surface stays a spec ⚠️ VERIFY — nothing in
 * the app renders this yet; the loader also publishes the accessor on
 * `globalThis.__oms__` so a walk (or an e2e test) can read it.
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

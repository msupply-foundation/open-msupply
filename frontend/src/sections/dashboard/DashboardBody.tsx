import { createMemo, ErrorBoundary, onMount, Show, type JSX } from 'solid-js';
import {
  createRegionDiagnostics,
  recordPluginDiagnostic,
} from '@/plugins/diagnostics';
import { bodyRegion, type BodyOccupant } from './bodyRegion';
import { DashboardBuiltInBody } from './DashboardBuiltInBody';

/*
 * The render integration of the dashboard's BODY region
 * (spec/dashboard/ui-surface.md § body-region semantics).
 *
 * The screen-level seam, and the only one that is a swap rather than a tail:
 * while a contribution occupies it, the built-in widgets and every widget,
 * panel and stat contribution are absent — the two never render together — and
 * the frame around the body (the app frame, the page frame, the navigation
 * menu) is the host's and unchanged.
 *
 * Precedence is by MOUNT, not by hiding: `DashboardBuiltInBody` holds the
 * count resources, so while a body renders they are never created and the
 * built-ins' six count queries are never issued (OMS-REG-DB-02.13). The store
 * guard has resolved the session facts `when(ctx)` reads before this screen
 * mounts, so the region's answer is known before the first paint — the
 * built-ins never show and then give way.
 *
 * The two awkward cases are answered rather than left to emerge: more than one
 * claimant resolves to exactly one occupant with the rest named in diagnostics
 * (`bodyRegion.ts`), and a claimant that throws falls back to the built-in body
 * — never the neutral piece-region fallback, which in a whole-body region would
 * leave the screen with nothing in it.
 */

/**
 * A body contribution that threw: the built-in body renders in its place, and
 * the failure is named for whoever is asked about it later
 * (OMS-REG-DB-02.16).
 *
 * A component rather than inline fallback markup, so recording the diagnostic
 * is a mount effect and not a signal write during render.
 */
const FailedBody = (props: { id: string; error: unknown }): JSX.Element => {
  onMount(() => {
    console.error(
      `Dashboard body contribution "${props.id}" failed to render`,
      props.error
    );
    recordPluginDiagnostic({
      level: 'warning',
      pluginCode: props.id.split('.')[0],
      message: `dashboard.body: ${props.id} failed to render — the built-in dashboard body is shown in its place`,
    });
  });
  return <DashboardBuiltInBody />;
};

export const DashboardBody = (): JSX.Element => {
  const region = createMemo(bodyRegion);

  // The occupant, held stable while it is the same contribution. `bodyRegion`
  // rebuilds its result on every registry or store-context change, and a fresh
  // object through the keyed <Show> below would REMOUNT a live contributed body
  // — losing its state and re-running its fetches
  // (kdd/solid-reactivity-pitfalls). A genuinely different contribution, or the
  // same id carrying a new component (a dev hot reload), still remounts, which
  // is what should happen.
  const occupant = createMemo<BodyOccupant | undefined>(
    () => region().occupant,
    undefined,
    {
      equals: (previous, next) =>
        previous?.id === next?.id && previous?.Component === next?.Component,
    }
  );

  // Recorded from an effect, since recording is a write, and deduped so a
  // re-evaluation cannot spam the same passed-over claimant — both the shared
  // helper's (src/plugins/diagnostics).
  createRegionDiagnostics(
    () => region().diagnostics,
    () => 'dashboard.body'
  );

  return (
    <Show when={occupant()} keyed fallback={<DashboardBuiltInBody />}>
      {body => (
        <ErrorBoundary
          fallback={error => <FailedBody id={body.id} error={error} />}
        >
          <body.Component />
        </ErrorBoundary>
      )}
    </Show>
  );
};

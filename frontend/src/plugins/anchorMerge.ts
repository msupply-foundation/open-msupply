/*
 * The anchored merge every host region shares (spec/plugins/rules.md §
 * contributions, sdk-contract § the column slot).
 *
 * Two surfaces now publish anchor ids for their own pieces — the dashboard's
 * three regions and the internal-order line table's columns — and a third
 * (customer requisitions) is next. The ORDERING is identical in all of them and
 * is the part authors depend on ("anchor, then order, then id, identical on
 * every reload"), so it lives here once rather than being re-derived per
 * surface; each surface keeps its own vocabulary (built-ins + suppression;
 * columns + preference gates) and delegates only the sort.
 *
 * Pure data, no Solid and no diagnostics sink: the merge REPORTS degradations
 * and the caller records them (recording is a write, and these merges run
 * inside memos — kdd/solid-reactivity-pitfalls). Both callers are therefore
 * unit-testable as plain functions.
 */

/**
 * Where a contribution sits among the host's published ids. Absent — or
 * `{ end: true }` — means the container's end.
 */
export type Anchor = { after: string } | { before: string } | { end: true };

/**
 * A host piece as the merge sees it: its published id, and whether it currently
 * RENDERS. A hidden piece (a preference gate hides it, a plugin suppressed it)
 * keeps its published id but has no position, so anchoring to it degrades
 * exactly like anchoring to an id that never existed.
 */
export interface AnchorHost {
  id: string;
  hidden?: boolean;
}

/** A contribution as the merge sees it: identity, placement, tie-break. */
export interface AnchorContribution {
  /**
   * Already the published identity (`${pluginCode}.${id}`) where one exists.
   */
  id: string;
  anchor?: Anchor;
  order?: number;
}

/** A recorded degradation — surfaced by the caller, never silent. */
export interface AnchorDiagnostic {
  contributionId: string;
  message: string;
}

/** One merged position, carrying the caller's own object untouched. */
export type AnchorEntry<H, C> =
  { kind: 'host'; item: H } | { kind: 'contribution'; item: C };

export interface AnchorMergeResult<H, C> {
  /** Rendered hosts and contributions in final, deterministic order. */
  entries: AnchorEntry<H, C>[];
  diagnostics: AnchorDiagnostic[];
}

// A contribution's base position is a FRACTIONAL index into the rendered hosts:
// `before X` sits just ahead of X's index, `after X` just behind it, the
// container end past the last. Fractions are what keep a contribution between
// the right two hosts once the whole list is sorted as one.
const END = Number.POSITIVE_INFINITY;

/**
 * Merge contributions into a host's published pieces.
 *
 * Order is total and load-order independent: anchor position first, then a host
 * ahead of any contribution sharing its coordinate, then contribution `order`
 * (unset last), then contribution `id` (unique within a region). So the result
 * is identical on every reload and unchanged by the order the contributions
 * arrive in.
 *
 * A hidden host is dropped from `entries` — the caller renders only what it
 * gets back. A contribution whose anchor names no RENDERED host falls to the
 * end and the degradation is reported.
 *
 * An empty contribution list is the identity: the rendered hosts, in order,
 * with no diagnostics.
 */
export const anchorMerge = <H extends AnchorHost, C extends AnchorContribution>(
  hosts: readonly H[],
  contributions: readonly C[]
): AnchorMergeResult<H, C> => {
  const diagnostics: AnchorDiagnostic[] = [];

  const rendered = hosts.filter(host => host.hidden !== true);
  const positionOf = new Map(rendered.map((host, index) => [host.id, index]));

  const basePosition = (contribution: C): number => {
    const anchor = contribution.anchor;
    if (!anchor || 'end' in anchor) return END;
    const id = 'after' in anchor ? anchor.after : anchor.before;
    const target = positionOf.get(id);
    if (target === undefined) {
      // Absent, gate-hidden, or suppressed — all the same to placement.
      diagnostics.push({
        contributionId: contribution.id,
        message: `anchor "${id}" is not a rendered position — placed at the end`,
      });
      return END;
    }
    return 'after' in anchor ? target + 0.5 : target - 0.5;
  };

  type Row = {
    primary: number;
    /** 0 = host, 1 = contribution: a host wins a shared coordinate. */
    tier: 0 | 1;
    order: number;
    id: string;
    entry: AnchorEntry<H, C>;
  };
  const rows: Row[] = [];

  rendered.forEach((host, index) => {
    rows.push({
      primary: index,
      tier: 0,
      order: 0,
      id: host.id,
      entry: { kind: 'host', item: host },
    });
  });

  for (const contribution of contributions) {
    rows.push({
      primary: basePosition(contribution),
      tier: 1,
      order: contribution.order ?? END,
      id: contribution.id,
      entry: { kind: 'contribution', item: contribution },
    });
  }

  rows.sort(
    (a, b) =>
      a.primary - b.primary ||
      a.tier - b.tier ||
      a.order - b.order ||
      (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
  );

  return { entries: rows.map(row => row.entry), diagnostics };
};

import type { CampaignKind } from './campaignKind';

/**
 * The name + id of a record's CURRENT campaign, as the record itself carries
 * it. Only the two fields a label needs, so a caller's own line fragment
 * satisfies it without a re-lookup.
 */
export interface SelectedCampaign {
  id: string;
  name: string;
}

/**
 * One row of the Activity list. Every row is a register row; its kind decides
 * which tier it falls under. The kind is the WIRE kind, so a row carries the
 * register's own value and `campaignKindLabel` speaks for both the read-back
 * label and the heading.
 */
export interface ActivityOption {
  kind: CampaignKind;
  node: SelectedCampaign;
}

/**
 * Which tier the list is scoped to. `all` is both, and is where the field opens
 * — the filter narrows a long register, it does not hide half of it by default.
 */
export type KindFilter = 'all' | CampaignKind;

/** Is this row one of the routine entries, rather than a campaign? */
const isRoutine = (option: Pick<ActivityOption, 'kind'>): boolean =>
  option.kind === 'ROUTINE';

/**
 * The register's rows as the Activity list offers them: the **routine** entries
 * first, the campaigns after, each tier keeping the register's own order within
 * itself. One pass, since the kind IS the tier.
 *
 * `filter` narrows to a single tier, with ONE exemption: the row the field is
 * currently showing always survives. A value the field displays has to be in
 * the list — otherwise picking the field's own value back would be impossible,
 * and the Combobox would pin it above the filter strip that excluded it.
 */
export const activityOptions = (
  campaigns: readonly (SelectedCampaign & { kind: CampaignKind })[],
  filter: KindFilter,
  selectedId?: string
): ActivityOption[] => {
  const rows = campaigns
    .map(node => ({ kind: node.kind, node }))
    .filter(
      option =>
        filter === 'all' ||
        option.kind === filter ||
        option.node.id === selectedId
    );

  return [...rows.filter(isRoutine), ...rows.filter(o => !isRoutine(o))];
};

/**
 * Does this set span BOTH tiers? Two questions are answered by it:
 *
 *  - of the whole register, whether to offer the kind filter at all — a
 *    register of one tier scopes to nothing, so the strip would be furniture;
 *  - of what is on screen, whether to show headings — scoped to one tier, a
 *    heading over every row says nothing the filter has not already said.
 *
 * The second asks it of the options PLUS any pinned selection, since the
 * Combobox lists that alongside them.
 */
export const spansBothTiers = (
  options: readonly Pick<ActivityOption, 'kind'>[]
): boolean => options.some(isRoutine) && options.some(o => !isRoutine(o));

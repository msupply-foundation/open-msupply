import { createMemo, createSignal, type JSX } from 'solid-js';
import { t } from '../../intl';
import { Combobox } from '../../ui/elements/selectors/Combobox';
import { Tabs, TabList, type TabDef } from '../../ui/elements/tabs/Tabs';
import { campaignsResource, type Campaign } from './campaignsResource';
import { campaignKindLabel } from './campaignKind';
import {
  activityOptions,
  spansBothTiers,
  type ActivityOption,
  type KindFilter,
  type SelectedCampaign,
} from './activityOptions';

export type { SelectedCampaign };

const optionValue = (o: ActivityOption): string => o.node.id;

export interface ActivitySelectProps {
  /** The currently-selected campaign id (undefined = none). */
  campaignId?: string;
  /**
   * The record's own campaign node, used to LABEL a selection the register no
   * longer offers. A campaign is soft-deleted, and a tagged record keeps
   * resolving it (spec/campaigns contract › wire trap) while the register read
   * excludes it — so a deleted campaign still reads back here, and still can't
   * be re-picked, because it is not among the options. A campaign that never
   * reached this store resolves to nothing and the field shows empty.
   */
  campaign?: SelectedCampaign | null;
  /**
   * Fires with the chosen campaign (the full node, so callers can store
   * id+name for display), or null when the field is cleared.
   */
  onChange: (campaign: Campaign | null) => void;
  /**
   * Field label (required for a11y). Defaults to the field's own name —
   * every caller wants `label.activity`; pass one only to rename it.
   */
  label?: string;
  hideLabel?: boolean;
  disabled?: boolean;
  /**
   * `data-testid` for the text input (locale-stable test hook,
   * e2e/TESTIDS.md).
   */
  inputTestId?: string;
  /** Control size — 'small' for dense contexts (a batch-grid cell). */
  size?: 'default' | 'small';
  /** Max-width cap — forwarded to the Combobox, opt-in (default `full`). */
  width?: 'compact' | 'short' | 'long' | 'full';
}

/*
 * The ACTIVITY picker — what a line's stock is being held for. ONE combined
 * list, so the choice costs one click wherever it falls: **Routine** pinned at
 * the top under their own heading, then the campaigns under theirs. An
 * installation may configure SEVERAL routine entries, so Routine is a tier like
 * Campaign rather than one pinned row — which also means it is searchable and
 * can be scoped to.
 *
 * A register holding both tiers gets a **kind filter** pinned inside the
 * dropdown (the location picker's fullness strip, same mechanism): All ·
 * Routine · Campaign, opening on All. It only appears where it has something to
 * do — a register of one tier scopes to nothing — and the current selection is
 * exempt from it, since a value shown in the field must be present in the list
 * that claims to offer the options.
 *
 * Headings earn their place only when BOTH tiers are on screen: scoped to one,
 * a heading over every row says nothing the filter has not already said.
 *
 * Every value is a row of the campaign register. Carrying no campaign is the
 * EMPTY field, reached through the ✕ and read back as the placeholder's "None"
 * — not a row of its own, since clearability follows optionality here as
 * everywhere else (ui-standards › controls). A domain widget (src/domain): it
 * knows the data and the tiers, and is composed from the pure ui/ Combobox.
 */
export const ActivitySelect = (props: ActivitySelectProps): JSX.Element => {
  const campaigns = () => campaignsResource.noSuspense();
  const [kindFilter, setKindFilter] = createSignal<KindFilter>('all');

  // Does the register hold both tiers at all? The filter and the headings are
  // both answers to that question, so they ask it of the WHOLE register rather
  // than of the filtered list — otherwise scoping to Routine would hide the
  // strip that scoped it.
  const hasBothTiers = createMemo(() => spansBothTiers(campaigns()));

  // ROUTINE first, every other kind after, each keeping the register's own
  // order within its tier — one pass, since the kind IS the tier. The filter
  // narrows to one tier, EXEMPTING the current selection: a value the field
  // displays has to be in the list, or picking the field's own value back
  // would be impossible and the Combobox would pin it above the strip.
  const options = createMemo<ActivityOption[]>(() =>
    activityOptions(campaigns(), kindFilter(), props.campaignId)
  );

  // A chosen activity reads back qualified by its tier — "Campaign · ‹name›",
  // "Routine · ‹name›" — since with several of each they are otherwise bare
  // names with no hint of which is which. The option ROWS stay bare
  // (renderItem below): inside the list the heading already says it.
  const label = (o: ActivityOption): string =>
    `${campaignKindLabel(o.kind)} · ${o.node.name}`;

  // A selection the register no longer offers — a soft-deleted campaign the
  // record still carries. Labelled from the record's own node so it reads
  // back, and absent from the options so it cannot be re-picked.
  const selectedItem = (): ActivityOption | undefined =>
    props.campaign && !campaigns().some(c => c.id === props.campaign?.id)
      ? // The record carries a name, never a kind — a soft-deleted row is a
        // campaign by definition, since Routine is not deletable in practice.
        { kind: 'CAMPAIGN', node: props.campaign }
      : undefined;

  // Group only while both tiers are on screen — the pinned selection included,
  // since the Combobox lists it alongside the options.
  const grouped = createMemo(() => {
    const pinned = selectedItem();
    return spansBothTiers(pinned ? [...options(), pinned] : options());
  });

  // Nothing to pick: an empty register leaves the field disabled rather than
  // opening on an empty list. Gated on the fetch having settled, so the control
  // doesn't flicker enabled→disabled while the register loads — and on the
  // field being EMPTY, since a line that carries an activity must keep its
  // clear affordance.
  const noActivities = (): boolean =>
    !campaignsResource.loading() &&
    campaigns().length === 0 &&
    !props.campaignId;

  // The kind filter as a tab strip, pinned inside the dropdown as its listbox
  // header — so it scopes the options in place, exactly as the location
  // picker's fullness strip does.
  const kindTabs = (): TabDef[] => [
    { value: 'all', label: t('label.all'), testId: 'activity-kind-all' },
    {
      value: 'ROUTINE',
      label: campaignKindLabel('ROUTINE'),
      testId: 'activity-kind-routine',
    },
    {
      value: 'CAMPAIGN',
      label: campaignKindLabel('CAMPAIGN'),
      testId: 'activity-kind-campaign',
    },
  ];

  const filterHeader = (
    <Tabs
      value={kindFilter()}
      onValueChange={value => setKindFilter(value as KindFilter)}
    >
      <TabList label={t('label.filter-activities-by-kind')} tabs={kindTabs()} />
    </Tabs>
  );

  return (
    <Combobox<ActivityOption>
      label={props.label ?? t('label.activity')}
      hideLabel={props.hideLabel}
      size={props.size}
      width={props.width}
      disabled={props.disabled || noActivities()}
      inputTestId={props.inputTestId}
      items={options()}
      loading={campaignsResource.loading()}
      itemToString={label}
      itemToValue={optionValue}
      // Undefined turns grouping OFF entirely, which is what a single tier
      // wants: a flat list under the one heading the filter already names.
      itemGroup={grouped() ? o => campaignKindLabel(o.kind) : undefined}
      listboxHeader={hasBothTiers() ? filterHeader : undefined}
      // Search the activity's own NAME, not the tier-qualified label — typing
      // "campaign" should not match every campaign there is.
      filter={(o, input) =>
        o.node.name.toLocaleLowerCase().includes(input.toLocaleLowerCase())
      }
      renderItem={o => o.node.name}
      value={props.campaignId}
      selectedItem={selectedItem()}
      // An OPTIONAL pick clears through the ✕ (ui-standards › controls:
      // clearability follows optionality), so empty reads as "None" in the
      // placeholder's grey rather than as a row in the list.
      placeholder={t('label.none')}
      onChange={o =>
        props.onChange(
          o ? (campaigns().find(c => c.id === o.node.id) ?? null) : null
        )
      }
    />
  );
};

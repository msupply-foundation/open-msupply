import { createMemo, type JSX } from 'solid-js';
import { t } from '../../intl';
import { Combobox } from '../../ui/elements/selectors/Combobox';
import { campaignsResource, type Campaign } from './campaignsResource';

/**
 * The name + id of the record's CURRENT campaign, as the record itself carries
 * it. Only the two fields a label needs, so a caller's own line fragment
 * satisfies it without a re-lookup.
 */
export interface SelectedCampaign {
  id: string;
  name: string;
}

// One row of the Activity list. `None` is an option like any other rather than
// a placeholder, so emptying the field costs the same single click as filling
// it; `routine` and `campaign` are both register rows, split by their kind.
type Option =
  { kind: 'none' } | { kind: 'routine' | 'campaign'; node: SelectedCampaign };

const NONE = '__none__';
const optionValue = (o: Option): string =>
  o.kind === 'none' ? NONE : o.node.id;

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
   * id+name for display), or null for None.
   */
  onChange: (campaign: Campaign | null) => void;
  /** Field label (required for a11y). */
  label: string;
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
 * list, so the choice costs one click wherever it falls: **None** and
 * **Routine** pinned at the top, then a divider, then the campaigns under a
 * Campaign heading (the grouped Combobox's `itemGroup`). Typing narrows the
 * campaigns only; None and Routine never leave the list.
 *
 * Every value is a row of the campaign register: Routine is the row whose
 * `kind` is ROUTINE (an installation configures one, so an installation
 * without it simply offers None and its campaigns), and None is the absence of
 * a campaign. A domain widget (src/domain): it knows the data and the tiers,
 * and is composed from the pure ui/ Combobox.
 */
export const ActivitySelect = (props: ActivitySelectProps): JSX.Element => {
  const campaigns = () => campaignsResource.noSuspense();

  const options = createMemo<Option[]>(() => [
    { kind: 'none' },
    ...campaigns()
      .filter(c => c.kind === 'ROUTINE')
      .map(node => ({ kind: 'routine' as const, node })),
    ...campaigns()
      .filter(c => c.kind !== 'ROUTINE')
      .map(node => ({ kind: 'campaign' as const, node })),
  ]);

  // A chosen campaign reads back qualified by its tier — "Campaign · ‹name›" —
  // since a campaign and the routine entry are otherwise two bare names with
  // no hint of which is which. The option ROWS stay bare (renderItem below):
  // inside the list the heading already says it.
  const label = (o: Option): string =>
    o.kind === 'none'
      ? t('label.none')
      : o.kind === 'routine'
        ? o.node.name
        : `${t('label.campaign')} · ${o.node.name}`;

  // A selection the register no longer offers — a soft-deleted campaign the
  // record still carries. Labelled from the record's own node so it reads
  // back, and absent from the options so it cannot be re-picked.
  const selectedItem = (): Option | undefined =>
    props.campaign && !campaigns().some(c => c.id === props.campaign?.id)
      ? { kind: 'campaign', node: props.campaign }
      : undefined;

  return (
    <Combobox<Option>
      label={props.label}
      hideLabel={props.hideLabel}
      size={props.size}
      width={props.width}
      disabled={props.disabled}
      inputTestId={props.inputTestId}
      items={options()}
      loading={campaignsResource.loading()}
      itemToString={label}
      itemToValue={optionValue}
      itemGroup={o => (o.kind === 'campaign' ? t('label.campaign') : undefined)}
      // Search the campaign's own NAME, not the tier-qualified label — typing
      // "campaign" should not match every campaign there is.
      filter={(o, input) =>
        o.kind !== 'none' &&
        o.node.name.toLocaleLowerCase().includes(input.toLocaleLowerCase())
      }
      renderItem={o => (o.kind === 'none' ? t('label.none') : o.node.name)}
      value={props.campaignId ?? NONE}
      selectedItem={selectedItem()}
      // None is a real option, so there is nothing a clear button would add.
      clearable={false}
      onChange={o =>
        props.onChange(
          o && o.kind !== 'none'
            ? (campaigns().find(c => c.id === o.node.id) ?? null)
            : null
        )
      }
    />
  );
};

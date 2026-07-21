import { createResource, type JSX } from 'solid-js';
import { Combobox } from '../../ui/elements/selectors/Combobox';
import { campaignsResource, type Campaign } from './campaignsResource';
import { fetchItemPrograms, type ItemProgram } from './itemProgramsResource';

// A campaign OR a program picked as one value. The two are mutually exclusive
// on the line (separate campaignId / programId fields on the wire, but never
// both at once — matching OMS): picking a campaign clears the program, and the
// reverse.
export type CampaignOrProgram =
  | { campaign: Campaign; program: null }
  | { campaign: null; program: ItemProgram };

// One option in the merged list — a campaign or an item's program, tagged so
// the onChange can route the choice to the right field. The value key is
// prefixed by kind so a campaign and a program sharing an id never collide.
type Option =
  | { kind: 'campaign'; node: Campaign }
  | { kind: 'program'; node: ItemProgram };

const optionValue = (o: Option): string => `${o.kind}:${o.node.id}`;

export interface CampaignOrProgramSelectProps {
  /** The store, for the per-item program fetch. */
  storeId: string;
  /** The item whose programs are offered alongside the store's campaigns. */
  itemId: string;
  /** The currently-selected campaign id (undefined = none). */
  campaignId?: string;
  /** The currently-selected program id (undefined = none). */
  programId?: string;
  /**
   * Fired with the chosen campaign OR program (the full node, so callers can
   * store id+name for display), or null when cleared.
   */
  onChange: (value: CampaignOrProgram | null) => void;
  /** Field label (required for a11y). */
  label: string;
  hideLabel?: boolean;
  disabled?: boolean;
  placeholder?: string;
}

/*
 * The reusable campaign-or-program picker (spec/ui-standards ›
 * campaign-or-program lookup): one Combobox over a merged option set — the
 * store's campaigns (store-scoped cache) plus the edited item's programs
 * (narrowed by item, fetched per item). The two are mutually exclusive; a
 * chosen campaign clears any program and vice versa. A domain widget
 * (src/domain): it knows the data (fetches + labels both sides) but is composed
 * from the pure ui/ Combobox. Matches OMS's CampaignOrProgramSelector.
 */
export const CampaignOrProgramSelect = (
  props: CampaignOrProgramSelectProps
): JSX.Element => {
  const campaigns = () => campaignsResource.noSuspense();

  // Programs are per-item: refetch whenever the item (or store) changes. `[]`
  // until the first load resolves — the picker just shows campaigns meanwhile.
  const [programs] = createResource(
    () => ({ storeId: props.storeId, itemId: props.itemId }),
    ({ storeId, itemId }) => fetchItemPrograms(storeId, itemId)
  );

  const options = (): Option[] => [
    ...campaigns().map(node => ({ kind: 'campaign' as const, node })),
    ...(programs() ?? []).map(node => ({ kind: 'program' as const, node })),
  ];

  // The current selection resolved to its merged-list value key (or undefined).
  // A campaign id wins the label if set, else a program id — they're never both
  // set, but campaign is checked first to match the field order.
  const value = () => {
    if (props.campaignId) return `campaign:${props.campaignId}`;
    if (props.programId) return `program:${props.programId}`;
    return undefined;
  };

  return (
    <Combobox<Option>
      label={props.label}
      hideLabel={props.hideLabel}
      items={options()}
      loading={campaignsResource.loading() || programs.loading}
      itemToString={o => o.node.name}
      itemToValue={optionValue}
      value={value()}
      disabled={props.disabled}
      placeholder={props.placeholder}
      onChange={o => {
        if (!o) return props.onChange(null);
        props.onChange(
          o.kind === 'campaign'
            ? { campaign: o.node, program: null }
            : { campaign: null, program: o.node }
        );
      }}
    />
  );
};

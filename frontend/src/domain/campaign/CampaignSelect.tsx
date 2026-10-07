import { type JSX } from 'solid-js';
import { Combobox } from '../../ui/elements/selectors/Combobox';
import { campaignsResource, type Campaign } from './campaignsResource';

export interface CampaignSelectProps {
  /** Selected campaign id (undefined/null = none). */
  value?: string | null;
  onChange: (campaign: Campaign | null) => void;
  label: string;
  hideLabel?: boolean;
  size?: 'default' | 'small';
  disabled?: boolean;
  placeholder?: string;
  /** `data-testid` for the text input (locale-stable test hook, e2e/TESTIDS.md). */
  inputTestId?: string;
}

/*
 * A campaign-only lookup — a Combobox over the app-wide campaigns cache, for a
 * record that takes a campaign but never a program (an outbound shipment's
 * campaign). Where a program is also allowed, use CampaignOrProgramSelect.
 */
export const CampaignSelect = (props: CampaignSelectProps): JSX.Element => (
  <Combobox<Campaign>
    label={props.label}
    hideLabel={props.hideLabel}
    size={props.size}
    items={campaignsResource.noSuspense()}
    loading={campaignsResource.loading()}
    itemToString={c => c.name}
    itemToValue={c => c.id}
    value={props.value ?? undefined}
    disabled={props.disabled}
    placeholder={props.placeholder}
    inputTestId={props.inputTestId}
    onChange={c => props.onChange(c)}
  />
);

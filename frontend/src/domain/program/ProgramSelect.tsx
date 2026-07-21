import { createEffect, type JSX } from 'solid-js';
import { Combobox } from '../../ui/elements/selectors/Combobox';
import {
  programRegistriesResource,
  type ProgramRegistry,
} from './programResource';

export interface ProgramSelectProps {
  /** Selected program context id (undefined = none). */
  value?: string;
  /** Fires with the chosen program's CONTEXT id, or null when cleared. */
  onChange: (programContextId: string | null) => void;
  /** Field label (required for a11y). */
  label: string;
  hideLabel?: boolean;
  disabled?: boolean;
  error?: string;
  placeholder?: string;
}

/*
 * The reusable Program picker — a Combobox pre-wired to the store-scoped
 * program-enrolment registries resource (kdd/domain-modules). Options are the
 * registries the user may see, labelled by name; the reported value is the
 * program's CONTEXT id — what report data queries filter by — never the
 * registry's own id (spec/reports contract "Arguments", AC-R10).
 */
export const ProgramSelect = (props: ProgramSelectProps): JSX.Element => {
  const items = () => programRegistriesResource.noSuspense();

  // A lone option is pre-selected (spec/reports AC-R10) — the common
  // single-program store never has to touch the field.
  createEffect(() => {
    const single = items().length === 1 ? items()[0] : undefined;
    if (single && !props.value) props.onChange(single.contextId);
  });

  return (
    <Combobox<ProgramRegistry>
      label={props.label}
      hideLabel={props.hideLabel}
      items={items()}
      loading={programRegistriesResource.loading()}
      itemToString={r => r.name ?? r.documentType}
      itemToValue={r => r.contextId}
      value={props.value}
      disabled={props.disabled}
      error={props.error}
      placeholder={props.placeholder}
      onChange={r => props.onChange(r?.contextId ?? null)}
    />
  );
};

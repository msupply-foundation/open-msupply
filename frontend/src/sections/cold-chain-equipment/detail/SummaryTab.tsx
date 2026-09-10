import { createResource, createSignal, Show } from 'solid-js';
import type { Component } from 'solid-js';
import { gated } from '@/api/gated';
import { hasPermission } from '@/store/storeContext';
import { localisedDate, t } from '@/intl';
import { ContentContainer } from '@/ui/layout/ContentContainer/ContentContainer';
import { FormColumns } from '@/ui/layout/Form/FormColumns';
import { FormColumn } from '@/ui/layout/Form/FormColumn';
import { FormSection } from '@/ui/layout/Form/FormSection';
import { FormRow } from '@/ui/layout/Form/FormRow';
import { TextField } from '@/ui/elements/inputs/TextField';
import { TextArea } from '@/ui/elements/inputs/TextArea';
import { DateField } from '@/ui/elements/inputs/DateField';
import { Checkbox } from '@/ui/elements/inputs/Checkbox';
import { MultiSelect } from '@/ui/elements/selectors/MultiSelect';
import { LabelledValue } from '@/ui/elements/typography/LabelledValue';
import { StatusChip } from '@/ui/elements/feedback/StatusChip';
import { InfoTooltip } from '@/ui/elements/feedback/InfoTooltip';
import { NameSearch, toNameOption, type NameOption } from '@/domain/name';
import { StoreSearch, type StoreOption } from '@/domain/store';
import { fetchLocations } from '@/domain/location';
import { ABSENT, statusColour, statusLabelKey } from '../equipment';
import type { AssetDetailFragment } from '../equipment.generated';
import { isLockedField, type AssetFormState } from './assetEdit';

// S2.1 — the Summary tab (ui-surface S2.1). Two columns of form sections: the
// asset's identity and where its stock goes on the left, its condition, notes
// and donor on the right.
//
// Composed as the app's other detail forms are (kdd/form-layout, and the
// reference verticals): a ContentContainer measure inside the fillBody page,
// FormColumns → FormColumn → FormSection, and each control carrying its OWN
// label above it — paired two-up in a FormRow where the fields are short.
// The label-leading FieldRow is the DIALOG row, not the detail-form one.
//
// Read-only rows render as LABELLED VALUES, never disabled inputs
// (ui-standards/detail-views § never-editable fields) — except the scan-locked
// ones, which ARE controls the user simply may not use, and carry a standing
// explanation of why (OMS-REG-CCE-04.35).

export interface SummaryTabProps {
  storeId: string;
  asset: AssetDetailFragment;
  form: AssetFormState;
  onChange: (patch: Partial<AssetFormState>) => void;
  isCentral: boolean;
  disabled: boolean;
}

type LocationOption = {
  id: string;
  code: string;
  name: string;
  locationType?: { name: string } | null;
};

export const SummaryTab: Component<SummaryTabProps> = props => {
  // Only a server administrator may override a scan lock (OMS-REG-CCE-04.35).
  const isServerAdmin = () => hasPermission('SERVER_ADMIN');
  const locked = (
    field: 'serialNumber' | 'warrantyStart' | 'warrantyEnd'
  ): boolean => isLockedField(props.asset, field, isServerAdmin());

  // Whether the storage locations are this screen's to change: on a central
  // server an asset held by another store shows them but cannot edit them
  // (OMS-REG-CCE-05.24). `locationIds` is undefined exactly then.
  const canEditLocations = () => props.form.locationIds !== undefined;

  /*
   * The location picker's options — the ASSET's own store's locations, read
   * WITHOUT suspending because this tab renders under an already-open screen's
   * boundary and a pending read would reset the draft
   * (kdd/solid-reactivity-pitfalls § no remounts).
   *
   * The server would accept a location of any store; keeping the picker to the
   * asset's own is the frontend's obligation, and it is also the only set the
   * server will store (OMS-REG-CCE-05.21, OMS-REG-CCE-05.22).
   */
  const [locationData] = createResource(
    () => props.asset.storeId ?? props.storeId,
    storeId =>
      // Only the locations NO asset holds — one held by another asset never
      // appears, so the "already held" rejection is unreachable from the
      // screen (OMS-REG-CCE-05.20/.22).
      fetchLocations(storeId, { assignedToAsset: false })
  );
  // The store's unassigned locations PLUS the ones this asset already holds:
  // the filter above excludes the latter (they are assigned — to this asset),
  // so they are added back from what the asset itself reports.
  const options = (): LocationOption[] => {
    const seen = new Set<string>();
    return [
      ...(gated(locationData) ?? []),
      ...props.asset.locations.nodes,
    ].filter(location => {
      if (seen.has(location.id)) return false;
      seen.add(location.id);
      return true;
    });
  };
  const selected = () =>
    options().filter(option => props.form.locationIds?.includes(option.id));

  // `<code> (<location type>)`, or the code alone where it has none — the
  // option's own composition, not this vertical's copy. The type is what
  // distinguishes the places: a code like `+5°C` names a temperature, not
  // whether the user is choosing a fridge shelf or a cold room.
  const optionLabel = (option: LocationOption) =>
    option.locationType
      ? `${option.code} (${option.locationType.name})`
      : option.code;

  /*
   * The two party lookups show what the DRAFT holds, not what was last picked
   * in this session. The draft carries the id; the label comes from whichever
   * source knows it — the option the user just picked, or the asset's own
   * record, which the detail fragment selects in the picker's option shape for
   * exactly this. Seeded from the asset alone, a pick would not show; seeded
   * from the pick alone, an asset opened with a donor already recorded would
   * render blank and read as having none.
   */
  const [donorPick, setDonorPick] = createSignal<NameOption | undefined>();
  const [storePick, setStorePick] = createSignal<StoreOption | undefined>();

  const donor = (): NameOption | undefined => {
    const id = props.form.donorNameId;
    if (!id) return undefined;
    const picked = donorPick();
    if (picked?.id === id) return picked;
    const own = props.asset.donor;
    return own?.id === id ? toNameOption(own) : undefined;
  };

  const store = (): StoreOption | undefined => {
    const id = props.form.storeId;
    if (!id) return undefined;
    const picked = storePick();
    if (picked?.id === id) return picked;
    const own = props.asset.store;
    return own?.id === id ? own : undefined;
  };

  const status = () => props.asset.statusLog?.status;

  return (
    // `padded`: the page is fillBody so its table tabs can own their scroll,
    // which strips the body's edge padding this form would otherwise inherit.
    <ContentContainer size="form" padded>
      <FormColumns>
        <FormColumn>
          <FormSection title={t('heading.asset-identification')}>
            <Show when={props.isCentral}>
              <StoreSearch
                label={t('label.store')}
                inputTestId="store-input"
                disabled={props.disabled}
                selected={store()}
                onSelect={picked => {
                  setStorePick(picked ?? undefined);
                  props.onChange({ storeId: picked?.id ?? '' });
                }}
              />
            </Show>
            {/* Fixed after creation — a labelled value, not a disabled box
              (OMS-REG-CCE-05.7). */}
            <LabelledValue variant="field" label={t('label.category')}>
              {props.asset.assetCategory?.name ?? ABSENT}
            </LabelledValue>
            <LabelledValue variant="field" label={t('label.type')}>
              {props.asset.assetType?.name ?? ABSENT}
            </LabelledValue>
            <TextField
              label={t('label.serial')}
              data-testid="serial-input"
              disabled={props.disabled || locked('serialNumber')}
              labelInfo={
                locked('serialNumber') ? (
                  <InfoTooltip text={t('tooltip.defined-by-gs1-matrix')} />
                ) : undefined
              }
              value={props.form.serialNumber}
              onInput={e =>
                props.onChange({ serialNumber: e.currentTarget.value })
              }
            />
            <TextField
              label={t('label.asset-number')}
              data-testid="asset-number-input"
              disabled={props.disabled}
              value={props.form.assetNumber}
              onInput={e =>
                props.onChange({ assetNumber: e.currentTarget.value })
              }
            />
            {/* The two date pairs sit two-up: four short fields stacked
                would run this section far past the column beside it. */}
            <FormRow>
              <DateField
                label={t('label.installation-date')}
                disabled={props.disabled}
                value={props.form.installationDate || null}
                onChange={value =>
                  props.onChange({ installationDate: value ?? '' })
                }
              />
              <DateField
                label={t('label.replacement-date')}
                disabled={props.disabled}
                value={props.form.replacementDate || null}
                onChange={value =>
                  props.onChange({ replacementDate: value ?? '' })
                }
              />
            </FormRow>
            <FormRow>
              <DateField
                label={t('label.warranty-start-date')}
                disabled={props.disabled || locked('warrantyStart')}
                labelInfo={
                  locked('warrantyStart') ? (
                    <InfoTooltip text={t('tooltip.defined-by-gs1-matrix')} />
                  ) : undefined
                }
                value={props.form.warrantyStart || null}
                onChange={value =>
                  props.onChange({ warrantyStart: value ?? '' })
                }
              />
              <DateField
                label={t('label.warranty-end-date')}
                disabled={props.disabled || locked('warrantyEnd')}
                labelInfo={
                  locked('warrantyEnd') ? (
                    <InfoTooltip text={t('tooltip.defined-by-gs1-matrix')} />
                  ) : undefined
                }
                value={props.form.warrantyEnd || null}
                onChange={value => props.onChange({ warrantyEnd: value ?? '' })}
              />
            </FormRow>
          </FormSection>

          {/* Absent entirely when the assignment is not this screen's to change
            (OMS-REG-CCE-05.24) — the section is the assignment, so an uneditable one has
            nothing to show. */}
          <Show when={canEditLocations()}>
            <FormSection title={t('heading.cold-chain')}>
              <MultiSelect<LocationOption>
                label={t('label.location')}
                inputTestId="location-input"
                items={options()}
                itemToString={optionLabel}
                itemToValue={option => option.id}
                selectedItems={selected()}
                // The set the user leaves is the set the asset holds — the
                // assignment is WHOLESALE (OMS-REG-CCE-05.23).
                onChange={items =>
                  props.onChange({ locationIds: items.map(item => item.id) })
                }
              />
            </FormSection>
          </Show>
        </FormColumn>

        <FormColumn>
          <FormSection title={t('heading.functional-status')}>
            <LabelledValue variant="field" label={t('label.current-status')}>
              <Show when={status()} fallback={ABSENT}>
                {value => (
                  <StatusChip
                    label={t(statusLabelKey(value()))}
                    colour={statusColour(value())}
                  />
                )}
              </Show>
            </LabelledValue>
            <LabelledValue variant="field" label={t('label.last-updated')}>
              {props.asset.statusLog
                ? localisedDate(props.asset.statusLog.logDatetime)
                : ABSENT}
            </LabelledValue>
            <LabelledValue variant="field" label={t('label.reason')}>
              {props.asset.statusLog?.reason?.reason ?? ABSENT}
            </LabelledValue>
            <Checkbox
              label={t('label.needs-replacement')}
              testId="needs-replacement-checkbox"
              disabled={props.disabled}
              checked={props.form.needsReplacement}
              onChange={needsReplacement =>
                props.onChange({ needsReplacement })
              }
            />
          </FormSection>

          <FormSection title={t('label.additional-info')}>
            <TextArea
              label={t('label.notes')}
              data-testid="notes-input"
              rows={4}
              disabled={props.disabled}
              value={props.form.notes}
              onInput={e => props.onChange({ notes: e.currentTarget.value })}
            />
          </FormSection>

          <FormSection title={t('label.donor')}>
            <NameSearch
              label={t('label.donor')}
              storeId={props.storeId}
              role="donor"
              inputTestId="donor-input"
              disabled={props.disabled}
              selected={donor()}
              onSelect={picked => {
                setDonorPick(picked ?? undefined);
                props.onChange({ donorNameId: picked?.id ?? '' });
              }}
            />
          </FormSection>
        </FormColumn>
      </FormColumns>
    </ContentContainer>
  );
};

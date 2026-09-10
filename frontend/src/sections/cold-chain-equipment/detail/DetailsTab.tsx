import { createResource, Index, Show } from 'solid-js';
import type { Component } from 'solid-js';
import { graphqlFetch } from '@/api/graphql';
import { gated } from '@/api/gated';
import { t } from '@/intl';
import { ContentContainer } from '@/ui/layout/ContentContainer/ContentContainer';
import { FormSection } from '@/ui/layout/Form/FormSection';
import { FormRow } from '@/ui/layout/Form/FormRow';
import { TextField } from '@/ui/elements/inputs/TextField';
import { NumberField } from '@/ui/elements/inputs/NumberField';
import { DateField } from '@/ui/elements/inputs/DateField';
import { Checkbox } from '@/ui/elements/inputs/Checkbox';
import { Combobox } from '@/ui/elements/selectors/Combobox';
import { LabelledValue } from '@/ui/elements/typography/LabelledValue';
import { Text } from '@/ui/elements/typography/Text';
import { InfoTooltip } from '@/ui/elements/feedback/InfoTooltip';
import { AssetPropertiesList } from '../catalogue.generated';
import { ABSENT } from '../equipment';
import type { AssetDetailFragment } from '../equipment.generated';
import { parseProperties, type AssetFormState } from './assetEdit';
import {
  allowedValues,
  propertyRows,
  type PropertyRow,
} from './assetProperties';

// S2.2 — the Details tab (ui-surface S2.2): the machine's specification, one
// labelled row per applicable property.
//
// Composed as the app's other detail forms are (kdd/form-layout): a
// ContentContainer measure inside the fillBody page, one FormSection, and each
// control carrying its OWN label above it — the label-leading FieldRow is the
// dialog row, not the detail-form one.
//
// A property the CATALOGUE answers is the model's, not the store's: its value
// is what shows and the row is read-only, marked as coming from the catalogue
// (AC-R1/AC-R3). The two mapping-date rows are read-only too — they are derived
// from the temperature-mapping history, not typed in (AC-R6). Both render as
// LABELLED VALUES rather than disabled boxes (ui-standards/detail-views).

export interface DetailsTabProps {
  asset: AssetDetailFragment;
  form: AssetFormState;
  onChange: (patch: Partial<AssetFormState>) => void;
  disabled: boolean;
}

export const DetailsTab: Component<DetailsTabProps> = props => {
  /*
   * The property DEFINITIONS that apply to this asset — narrowed server-side by
   * its class, category and type.
   *
   * `equalAnyOrNull`, never `equalTo`: a property scoped to the CLASS alone
   * carries NULL for the category and type it does not narrow to, and an equal
   * filter matches no null — so three `equalTo` clauses return only the
   * properties scoped to all three at once, which is almost none. The
   * or-null form is what makes a class-wide property apply to every asset of
   * that class (contract › properties).
   *
   * Read non-suspending: this tab first fetches on an interaction (opening it),
   * so a pending read would remount the screen and reset the draft
   * (kdd/solid-reactivity-pitfalls § no remounts).
   */
  const [definitionData] = createResource(
    () =>
      [
        props.asset.assetClass?.id ?? '',
        props.asset.assetCategory?.id ?? '',
        props.asset.assetType?.id ?? '',
      ] as const,
    async ([classId, categoryId, typeId]) => {
      const result = await graphqlFetch(AssetPropertiesList, {
        filter: {
          assetClassId: { equalAnyOrNull: classId ? [classId] : [] },
          assetCategoryId: { equalAnyOrNull: categoryId ? [categoryId] : [] },
          assetTypeId: { equalAnyOrNull: typeId ? [typeId] : [] },
        },
      });
      return result.kind === 'success'
        ? result.data.assetProperties.nodes
        : undefined;
    }
  );

  const rows = (): PropertyRow[] =>
    propertyRows(
      gated(definitionData) ?? [],
      props.form.properties,
      parseProperties(props.asset.catalogProperties)
    );

  const setValue = (key: string, value: string | number | boolean | null) =>
    props.onChange({ properties: { ...props.form.properties, [key]: value } });

  // Two fields per row, as the reference detail forms lay their sections out.
  // A cold room carries eighteen properties; one per full-width row would run
  // the tab several screens long and leave the measure half empty.
  const pairs = () => {
    const all = rows();
    return Array.from({ length: Math.ceil(all.length / 2) }, (_, i) =>
      all.slice(i * 2, i * 2 + 2)
    );
  };

  return (
    // `padded`: the page is fillBody so its table tabs can own their scroll,
    // which strips the body's edge padding this form would otherwise inherit.
    <ContentContainer size="form" padded>
      <FormSection title={t('label.asset-properties')}>
        <Show
          when={rows().length > 0}
          fallback={<Text>{t('messages.no-properties')}</Text>}
        >
          {/*
            <Index>, NOT <For>, at both levels. `propertyRows` mints fresh row
            objects on every read and it reads the draft — so every keystroke
            in a property field produces a whole new set. <For> is keyed by
            object identity and would remount every field on each character,
            taking the focus out of the box being typed in
            (kdd/solid-reactivity-pitfalls § no remounts on interaction; the
            shared ProgressList carries the same note for the same reason).

            <Index> keys by POSITION, which is what is actually stable here:
            the property list's length and order come from the catalogue, and
            only the values change under them.
          */}
          <Index each={pairs()}>
            {pair => (
              <FormRow>
                <Index each={pair()}>
                  {row => (
                    <Show
                      when={row().editable}
                      fallback={
                        // The catalogue's value, or a derived mapping date — a
                        // labelled value, never a disabled control
                        // (AC-R1/AC-R6).
                        <LabelledValue
                          variant="field"
                          label={
                            <>
                              {row().definition.name}
                              <Show when={row().fromCatalogue}>
                                <InfoTooltip
                                  text={t('messages.catalogue-property')}
                                />
                              </Show>
                            </>
                          }
                        >
                          {row().value === null || row().value === ''
                            ? ABSENT
                            : String(row().value)}
                        </LabelledValue>
                      }
                    >
                      <PropertyField
                        row={row()}
                        disabled={props.disabled}
                        onChange={value =>
                          setValue(row().definition.key, value)
                        }
                      />
                    </Show>
                  )}
                </Index>
              </FormRow>
            )}
          </Index>
        </Show>
      </FormSection>
    </ContentContainer>
  );
};

/**
 * One editable specification field, by its declared value type. Explicit
 * composition, not a render-from-config mapper: five kinds, each spelled out
 * (CLAUDE.md § anti-defaults).
 */
const PropertyField: Component<{
  row: PropertyRow;
  disabled: boolean;
  onChange: (value: string | number | boolean | null) => void;
}> = props => {
  const label = () => props.row.definition.name;
  const choices = () => allowedValues(props.row.definition);

  return (
    <Show
      when={props.row.definition.valueType !== 'BOOLEAN'}
      fallback={
        <Checkbox
          label={label()}
          disabled={props.disabled}
          checked={props.row.value === true}
          onChange={checked => props.onChange(checked)}
        />
      }
    >
      <Show
        when={props.row.definition.valueType !== 'DATE'}
        fallback={
          <DateField
            label={label()}
            disabled={props.disabled}
            value={props.row.value ? String(props.row.value) : null}
            onChange={value => props.onChange(value)}
          />
        }
      >
        <Show
          when={
            props.row.definition.valueType !== 'INTEGER' &&
            props.row.definition.valueType !== 'FLOAT'
          }
          fallback={
            <NumberField
              label={label()}
              disabled={props.disabled}
              // An integer property takes whole numbers; a float takes up to
              // five places, as the shared property input does.
              decimalLimit={props.row.definition.valueType === 'FLOAT' ? 5 : 0}
              value={
                props.row.value === null || props.row.value === ''
                  ? undefined
                  : Number(props.row.value)
              }
              onChange={value => props.onChange(value ?? null)}
            />
          }
        >
          <Show
            when={choices()}
            fallback={
              <TextField
                label={label()}
                disabled={props.disabled}
                value={props.row.value === null ? '' : String(props.row.value)}
                onInput={e => props.onChange(e.currentTarget.value)}
              />
            }
          >
            {values => (
              <Combobox<string>
                label={label()}
                clearable
                disabled={props.disabled}
                items={values()}
                itemToString={value => value}
                value={
                  props.row.value === null ? undefined : String(props.row.value)
                }
                onChange={value => props.onChange(value)}
              />
            )}
          </Show>
        </Show>
      </Show>
    </Show>
  );
};

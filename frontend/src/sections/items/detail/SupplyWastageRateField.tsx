import { createEffect, createSignal, on, Show, type Component } from 'solid-js';
import { graphqlFetch } from '../../../api/graphql';
import { t } from '../../../intl';
import { NumberField } from '../../../ui/elements/inputs/NumberField';
import { FieldRow } from '../../../ui/elements/inputs/FieldRow';
import { InfoTooltip } from '../../../ui/elements/feedback/InfoTooltip';
import { Button } from '../../../ui/elements/buttons/Button';
import { HStack } from '../../../ui/layout/Stack/HStack';
import { SetSupplyWastageRate } from './ancillaryItemMutations.generated';

// The item's own wastage rate as an ancillary supply (rules.md § ancillary
// supplies › supply wastage): one rate for the item, applied wherever a link
// orders it. Editable on the central server only, like the links themselves;
// read-only elsewhere.

// Below 100: a rate of 100% or more has no meaningful divisor (the server
// refuses it), so the field caps just under it.
const MAX_RATE = 99.99;

export const SupplyWastageRateField: Component<{
  storeId: string;
  itemId: string;
  isCentral: boolean;
  /** The saved rate; undefined until the tab's query has loaded. */
  rate: number | undefined;
  onSaved: () => void;
}> = props => {
  const [draft, setDraft] = createSignal<number | undefined>();
  const [saving, setSaving] = createSignal(false);

  // Follow the saved rate when it (re)loads — never while typing, since only
  // the query's value drives this, not the field's own input.
  createEffect(
    on(
      () => props.rate,
      rate => setDraft(rate)
    )
  );

  const changed = () => (draft() ?? 0) !== (props.rate ?? 0);

  const save = async () => {
    setSaving(true);
    const result = await graphqlFetch(SetSupplyWastageRate, {
      storeId: props.storeId,
      input: { itemId: props.itemId, wastageRate: draft() ?? 0 },
    });
    setSaving(false);
    // Failure → the global modal already surfaced it; the draft stays for a
    // retry.
    if (result.kind === 'success') props.onSaved();
  };

  return (
    <Show
      when={props.isCentral}
      fallback={
        <FieldRow
          label={t('label.supply-wastage-rate')}
          labelWidth="auto"
          readOnly
          valueTestId="supply-wastage-rate-value"
        >
          {props.rate === undefined ? '' : `${props.rate}%`}
        </FieldRow>
      }
    >
      <HStack gap="sm" align="end">
        <NumberField
          label={t('label.supply-wastage-rate')}
          labelInfo={
            <InfoTooltip text={t('description.supply-wastage-rate')} />
          }
          width="compact"
          endAdornment="%"
          decimalLimit={2}
          max={MAX_RATE}
          value={draft()}
          disabled={saving() || props.rate === undefined}
          data-testid="supply-wastage-rate-input"
          onChange={setDraft}
        />
        <Button
          data-testid="supply-wastage-rate-save"
          disabled={!changed() || saving()}
          onClick={() => void save()}
        >
          {t('button.save')}
        </Button>
      </HStack>
    </Show>
  );
};

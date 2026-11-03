import { createSignal, Show, type Component } from 'solid-js';
import { graphqlFetch } from '../../../api/graphql';
import { formatNumber, t } from '../../../intl';
import { createDebouncedEdit } from '../../../domain/debouncedEdit/createDebouncedEdit';
import { NumberField } from '../../../ui/elements/inputs/NumberField';
import { FieldRow } from '../../../ui/elements/inputs/FieldRow';
import { InfoTooltip } from '../../../ui/elements/feedback/InfoTooltip';
import { Alert } from '../../../ui/elements/feedback/Alert';
import { Stack } from '../../../ui/layout/Stack/Stack';
import { ContentContainer } from '../../../ui/layout/ContentContainer/ContentContainer';
import { SetSupplyWastageRate } from './ancillaryItemMutations.generated';

// The item's own wastage rate as an ancillary supply (rules.md § ancillary
// supplies › supply wastage): one rate for the item, applied wherever a link
// orders it. Editable on the central server only, like the links themselves;
// read-only elsewhere. It's stored on the links ordering the item, so until
// one does there's nothing to set it on and the field is disabled. Saves as
// you type like the header fields (createDebouncedEdit: debounced, flushed on
// blur and when the tab goes away) — no Save button.

// Below 100: a rate of 100% or more has no meaningful divisor (the server
// refuses it), so the field caps just under it.
const MAX_RATE = 99.99;

type Props = {
  storeId: string;
  itemId: string;
  isCentral: boolean;
  /** Some link orders this item as its ancillary. */
  isAncillary: boolean;
  /** The saved rate; undefined until the tab's query has loaded. */
  rate: number | undefined;
};

export const SupplyWastageRateField: Component<Props> = props => (
  // Padded and start-aligned: it sits above a full-bleed table, so it takes
  // the page's edge padding itself and lines up with the table's first column.
  <ContentContainer size="form" padded align="start">
    <Show
      when={props.isCentral}
      fallback={
        <FieldRow
          label={t('label.supply-wastage-rate')}
          labelWidth="auto"
          readOnly
          valueTestId="supply-wastage-rate-value"
        >
          {props.rate === undefined ? '' : `${formatNumber(props.rate)}%`}
        </FieldRow>
      }
    >
      {/* The edit buffer seeds once, so it mounts only once the rate has
          loaded; a boolean `when` keeps it mounted through refetches. */}
      <Show
        when={props.rate !== undefined}
        fallback={<RateInput value={undefined} disabled />}
      >
        <RateEditor {...props} rate={props.rate ?? 0} />
      </Show>
    </Show>
  </ContentContainer>
);

const RateEditor: Component<Props & { rate: number }> = props => {
  const [rejected, setRejected] = createSignal(false);

  const save = async (wastageRate: number) => {
    const result = await graphqlFetch(SetSupplyWastageRate, {
      storeId: props.storeId,
      input: { itemId: props.itemId, wastageRate },
    });
    // Failure → the global modal already surfaced it.
    if (result.kind !== 'success') return;
    // The one typed error is the range the field already caps, so it says so.
    const saved = result.data.centralServer.ancillaryItem.setSupplyWastageRate;
    setRejected(saved.__typename === 'SetSupplyWastageRateError');
  };

  const edit = createDebouncedEdit<{ rate: number }>({
    id: () => props.itemId,
    initial: () => ({ rate: props.rate }),
    save: patch => {
      if (patch.rate !== undefined) void save(patch.rate);
    },
  });

  return (
    <Stack gap="sm" onFocusOut={() => edit.flush()}>
      <RateInput
        value={edit.state.rate}
        disabled={!props.isAncillary}
        helperText={
          props.isAncillary
            ? undefined
            : t('messages.supply-wastage-rate-not-ancillary')
        }
        onChange={value => {
          setRejected(false);
          edit.setField('rate', value ?? 0);
        }}
      />
      <Show when={rejected()}>
        <Alert severity="error" testId="supply-wastage-rate-save-error">
          {t('error.supply-wastage-rate-out-of-range')}
        </Alert>
      </Show>
    </Stack>
  );
};

const RateInput: Component<{
  value: number | undefined;
  disabled: boolean;
  helperText?: string;
  onChange?: (value: number | undefined) => void;
}> = props => (
  <NumberField
    label={t('label.supply-wastage-rate')}
    labelInfo={<InfoTooltip text={t('description.supply-wastage-rate')} />}
    width="compact"
    endAdornment="%"
    decimalLimit={2}
    max={MAX_RATE}
    emptyValue={0}
    value={props.value}
    disabled={props.disabled}
    helperText={props.helperText}
    data-testid="supply-wastage-rate-input"
    onChange={value => props.onChange?.(value)}
  />
);

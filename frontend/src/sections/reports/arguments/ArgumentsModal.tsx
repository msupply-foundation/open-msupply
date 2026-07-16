import { createEffect, createMemo, For, Match, on, Switch } from 'solid-js';
import { createStore, reconcile, unwrap } from 'solid-js/store';
import { t } from '../../../intl';
import { Dialog } from '../../../ui/elements/feedback/Dialog';
import { Button } from '../../../ui/elements/buttons/Button';
import { TextField } from '../../../ui/elements/inputs/TextField';
import { Checkbox } from '../../../ui/elements/inputs/Checkbox';
import { Select } from '../../../ui/elements/selectors/Select';
import { RadioGroup } from '../../../ui/elements/inputs/RadioGroup';
import { DateRangeInput } from '../../../ui/elements/inputs/DateRangeInput';
import { MasterListSelect } from '../../../domain/masterList/MasterListSelect';
import { LocationSelect } from '../../../domain/location/LocationSelect';
import { storeContext } from '../../../store/storeContext';
import type { Report } from '../api/generate';
import {
  parseArgumentSchema,
  seedDefaults,
  type ParsedField,
  type ReportArgs,
} from './schema';

// S3 — the argument-entry modal (spec/reports S3, AC-R1/R2/R3). The filter form
// is rendered FROM the report's argument schema: field set, order, labels, and
// control choice come from the server's schema, not per-report client code
// (spec "Arguments"). Because that is render-from-config by wire contract, the
// explicit-composition anti-default (kdd/explicit-composition) can't apply in
// its usual form — so this is the bounded interpreter recorded in
// kdd/report-argument-forms: ONE parse module (schema.ts) + ONE switch below,
// each branch an explicit library component. The schema vocabulary is closed
// and server-owned; a new control type is one new <Match> branch, and anything
// unknown degrades to a disabled, labelled placeholder rather than crashing.
//
// Props contract (kept exactly — S2 owns navigation): onSubmit returns the
// entered arguments; the consumer writes them into the URL query, which drives
// generation. Cancel closes without generating.
export interface ArgumentsModalProps {
  report: Report;
  open: boolean;
  initialValues?: Record<string, unknown>;
  onClose: () => void;
  onSubmit: (args: Record<string, unknown>) => void;
}

export const ArgumentsModal = (props: ArgumentsModalProps) => {
  // The parsed field list — recomputes only when the report's schema changes,
  // so the <For> below is stable across a form session (no row remounts on
  // interaction, kdd/solid-reactivity-pitfalls).
  const fields = createMemo<ParsedField[]>(() =>
    props.report.argumentSchema
      ? parseArgumentSchema(props.report.argumentSchema)
      : []
  );

  // Local form state as a store, updated field-by-field in place. Seeded fresh
  // each time the modal opens (an interaction never reseeds): from the URL
  // arguments when reopening pre-filled, otherwise from store preferences +
  // schema defaults (AC-R3). reconcile replaces the contents while keeping the
  // store's identity, so bindings that still apply don't tear down.
  const [values, setValues] = createStore<ReportArgs>({});
  createEffect(
    on(
      () => props.open,
      open => {
        if (!open) return;
        const prefs = storeContext()?.storePreferences ?? {};
        const seed = props.initialValues ?? seedDefaults(fields(), prefs);
        setValues(reconcile({ ...seed }));
      }
    )
  );

  // Controlled-value accessors — read the store inside JSX, so they stay
  // reactive and each store write re-runs only its own binding.
  const textValue = (key: string): string => {
    const value = values[key];
    return typeof value === 'string' ? value : '';
  };
  // Display-invert: for an inverted boolean the checkbox shows the negation of
  // the stored raw value (schema key `isActive` shown as "Include inactive"),
  // and writes the negation back — the stored argument stays the raw schema
  // key.
  const boolChecked = (
    field: Extract<ParsedField, { kind: 'boolean' }>
  ): boolean => {
    const raw = values[field.key] === true;
    return field.invert ? !raw : raw;
  };
  const setBool = (
    field: Extract<ParsedField, { kind: 'boolean' }>,
    checked: boolean
  ): void => setValues(field.key, field.invert ? !checked : checked);
  const selectValue = (key: string): string | undefined => {
    const value = values[key];
    return typeof value === 'string' ? value : undefined;
  };
  const rangeValue = (key: string): { start: string; end: string } => {
    const value = values[key];
    const range =
      value && typeof value === 'object'
        ? (value as { start?: unknown; end?: unknown })
        : {};
    return {
      start: typeof range.start === 'string' ? range.start : '',
      end: typeof range.end === 'string' ? range.end : '',
    };
  };

  // OK: emit the current values, stripping empties so a blank filter isn't sent
  // as an empty string (the server treats absent and "" differently for some
  // queries). unwrap() drops the store proxy first.
  const submit = (): void => {
    const raw = unwrap(values);
    const cleaned: ReportArgs = {};
    for (const [key, value] of Object.entries(raw)) {
      if (value === '' || value === undefined || value === null) continue;
      cleaned[key] = value;
    }
    props.onSubmit(cleaned);
  };

  return (
    <Dialog
      open={props.open}
      onClose={() => props.onClose()}
      title={t('report.filters-title')}
      description={t('report.filters-helper')}
      widthRem={30}
      actions={
        <>
          <Button variant="secondary" onClick={() => props.onClose()}>
            {t('common.cancel')}
          </Button>
          <Button onClick={submit}>{t('common.ok')}</Button>
        </>
      }
    >
      <div
        style={{
          display: 'flex',
          'flex-direction': 'column',
          gap: 'var(--space-4)',
        }}
      >
        <For each={fields()}>
          {field => (
            <Switch>
              <Match when={field.kind === 'text'}>
                <TextField
                  label={field.label}
                  width="full"
                  value={textValue(field.key)}
                  onInput={event =>
                    setValues(field.key, event.currentTarget.value)
                  }
                />
              </Match>
              <Match when={field.kind === 'boolean' ? field : undefined} keyed>
                {boolField => (
                  <Checkbox
                    label={boolField.label}
                    checked={boolChecked(boolField)}
                    onChange={checked => setBool(boolField, checked)}
                  />
                )}
              </Match>
              <Match when={field.kind === 'enum' ? field : undefined} keyed>
                {enumField => (
                  <Select
                    label={enumField.label}
                    options={enumField.options}
                    value={selectValue(enumField.key)}
                    onValueChange={value => setValues(enumField.key, value)}
                  />
                )}
              </Match>
              <Match when={field.kind === 'sortToggle'}>
                <RadioGroup
                  label={field.label}
                  orientation="horizontal"
                  options={[
                    { value: 'asc', label: t('report.sort.ascending') },
                    { value: 'desc', label: t('report.sort.descending') },
                  ]}
                  value={selectValue(field.key)}
                  onChange={value => setValues(field.key, value)}
                />
              </Match>
              <Match when={field.kind === 'dateRange'}>
                {/*
                 * DateRange arg shape: the real DateRange control's argument
                 * shape couldn't be probed (the reports using it are dispensary
                 * ones absent from the probe environment). The uiSchema scope
                 * gives ONE property key, so we store the pair as a nested
                 * object under it — { <key>: { start, end } } — and send undefined
                 * (stripped) when both ends are empty. Revisit if a probed
                 * DateRange report shows a two-key shape.
                 */}
                <DateRangeInput
                  label={field.label}
                  start={rangeValue(field.key).start}
                  end={rangeValue(field.key).end}
                  onChange={range =>
                    setValues(
                      field.key,
                      range.start || range.end
                        ? { start: range.start, end: range.end }
                        : undefined
                    )
                  }
                />
              </Match>
              <Match when={field.kind === 'masterList'}>
                <MasterListSelect
                  label={field.label}
                  value={selectValue(field.key)}
                  onChange={id => setValues(field.key, id ?? undefined)}
                />
              </Match>
              <Match when={field.kind === 'location'}>
                <LocationSelect
                  label={field.label}
                  value={selectValue(field.key)}
                  onChange={location =>
                    setValues(field.key, location?.id ?? undefined)
                  }
                />
              </Match>
              <Match when={field.kind === 'unsupported'}>
                {/* Degradation path: the schema demands a control we don't
                    render yet (a backlog picker role, spec S3). Show it disabled
                    with its label so the form still lists the filter. */}
                <TextField
                  label={field.label}
                  width="full"
                  disabled
                  value=""
                  helperText={t('report.unsupported-control')}
                />
              </Match>
            </Switch>
          )}
        </For>
      </div>
    </Dialog>
  );
};

import { For, Match, Show, Switch, type JSX } from 'solid-js';
import { measureWord, t } from '../../intl';
import { formatNumber } from '../../intl/formatNumber';
import { roundedText } from '../../intl/numberDisplay';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '../../ui/elements/accordion/Accordion';
import { FieldRow } from '../../ui/elements/inputs/FieldRow';
import { Select } from '../../ui/elements/selectors/Select';
import { FormSection } from '../../ui/layout/Form/FormSection';
import {
  FORECAST_METHODS,
  ancillaryRatio,
  courseTitle,
  forecastMethodLabel,
  populationSteps,
  principalItemLabel,
  targetStockCaption,
  unavailableReasonMessage,
  type AncillaryRatioPrincipal,
  type ForecastMethod,
  type ForecastMethodOption,
} from './forecast';
import type {
  ForecastLineFragment,
  SupplyIntervalAndBufferFragment,
} from './forecast.generated';
import styles from './ForecastBlock.module.css';

// The forecast block (spec/internal-orders S4 › the forecast): a line's method,
// the breakdown behind its monthly demand, and the step into stock — monthly
// demand × target months = target stock. The internal-order editor offers the
// method as a select; the requisitions editor shows the customer's forecast
// read-only (spec/requisitions › forecast context), the method as text.

export interface ForecastBlockProps {
  line: ForecastLineFragment;
  /**
   * The requisition's target months (max months of stock). Undefined while
   * not yet known (a read still loading) — the target stock then shows
   * without its monthly demand × target months caption, rather than a
   * placeholder "× 0 months".
   */
  targetMonths: number | undefined;
  /**
   * The store's supply interval and safety buffer those target months came
   * from, if they did — the target-stock caption then shows them as supply
   * interval + safety buffer (spec S4 › the forecast, OMS-REG-REPL-17.17).
   * Omitted → months alone.
   */
  targetIntervalAndBuffer?: SupplyIntervalAndBufferFragment;
  /**
   * A stock quantity (units) in the editor's active entry mode, with its
   * measure word — so monthly demand and target stock re-express like the
   * panels' figures (OMS-REG-REPL-04.74). Rounded to the configured decimal
   * places (marked when rounded), not up to whole units, so monthly demand ×
   * target months visibly makes target stock.
   */
  formatQuantity: (units: number) => string;
  /**
   * The method select's options. Omitted → the read-only form: the method as
   * text, no select.
   */
  options?: readonly ForecastMethodOption[];
  /**
   * The method the line has, before any draft change — it stays selectable
   * even once unavailable, so a draft can move away from it and back.
   * Defaults to the shown line's method.
   */
  ownMethod?: ForecastMethod;
  /**
   * Picking a method makes it the draft's; it is saved with the draft
   * (rules › choosing a method).
   */
  onMethodChange?: (method: ForecastMethod) => void;
  /** The select disabled — a read-only order, or a change in flight. */
  disabled?: boolean;
  testId?: string;
}

// A single arithmetic step: its formula (tinted), the line's figures
// substituted (muted), and the emphasised result.
const CalculationStep = (props: {
  title: string;
  formula: string;
  substitution: string;
  result: string;
}): JSX.Element => (
  <div class={styles.step}>
    <div class={styles.stepTitle}>{props.title}</div>
    <div class={styles.formula}>{props.formula}</div>
    <div class={styles.substitution}>{props.substitution}</div>
    <div class={styles.result}>{props.result}</div>
  </div>
);

// A read-only figure row: label, right-aligned value, optional muted caption.
const FigureRow = (props: {
  label: string;
  value: string;
  caption?: string;
  testId?: string;
}): JSX.Element => (
  <FieldRow label={props.label} readOnly>
    <span class={styles.figure} data-testid={props.testId}>
      {props.value}
      <Show when={props.caption}>
        {caption => <span class={styles.caption}>{caption()}</span>}
      </Show>
    </span>
  </FieldRow>
);

export const ForecastBlock = (props: ForecastBlockProps): JSX.Element => {
  const selectOptions = () =>
    FORECAST_METHODS.map(method => {
      const option = props.options?.find(o => o.method === method);
      // The line's own method stays selectable even once unavailable: a line
      // keeps the method it has (rules › captured at line creation) — the
      // stored one, not the draft's, so previewing away from it doesn't lock
      // the draft out of returning to it.
      const ownMethod = props.ownMethod ?? props.line.forecastMethod;
      const unavailable =
        method !== ownMethod &&
        method !== props.line.forecastMethod &&
        option?.isAvailable === false;
      return {
        value: method,
        label: forecastMethodLabel(method),
        disabled: unavailable,
        description:
          unavailable && option?.unavailableReason
            ? unavailableReasonMessage(option.unavailableReason)
            : undefined,
      };
    });

  // Monthly demand and target stock to the same configured places, so the
  // caption's arithmetic reads true (a whole-number demand rounded up would
  // not).
  const quantity = (units: number) => props.formatQuantity(units);
  const monthlyDemand = () => quantity(props.line.forecastMonthlyConsumption);

  // A principal's own monthly demand, in its own units: the entry mode's packs
  // and doses are the ancillary item's, not the principal's.
  const principalDemand = (principal: AncillaryRatioPrincipal) => {
    const figure = principal.principalMonthlyConsumption;
    return `${roundedText(figure)} ${measureWord('units', principal.item?.unitName ?? null, figure)}`;
  };

  return (
    <FormSection
      title={t('heading.forecast')}
      headingLevel="h3"
      heading="group"
      class={styles.block}
      data-testid={props.testId}
    >
      <Show
        when={props.options}
        fallback={
          <FigureRow
            label={t('label.forecast-method')}
            value={forecastMethodLabel(props.line.forecastMethod)}
            testId="forecast-method"
          />
        }
      >
        <FieldRow label={t('label.forecast-method')}>
          <Select
            label={t('label.forecast-method')}
            hideLabel
            testId="forecast-method-select"
            value={props.line.forecastMethod}
            options={selectOptions()}
            disabled={props.disabled}
            onValueChange={value => {
              if (value !== props.line.forecastMethod)
                props.onMethodChange?.(value as ForecastMethod);
            }}
          />
        </FieldRow>
      </Show>

      <Switch>
        <Match
          when={
            props.line.forecastBreakdown.__typename ===
              'PopulationForecastNode' && props.line.forecastBreakdown
          }
        >
          {population => (
            <>
              <Show when={population().populationServed}>
                {served => (
                  <FigureRow
                    label={t('label.population-served')}
                    value={formatNumber(served())}
                  />
                )}
              </Show>
              {/* Independent sections — each course opens on its own, all
                collapsed to start. */}
              <Accordion multiple variant="card">
                <For each={population().courses}>
                  {(course, index) => {
                    // Re-derived on read so the figures re-format if the
                    // locale changes while the editor is open.
                    const steps = () => populationSteps(course);
                    return (
                      <AccordionItem value={`course-${index()}`}>
                        <AccordionTrigger>
                          {courseTitle(course)}
                        </AccordionTrigger>
                        <AccordionContent class={styles.steps}>
                          <CalculationStep
                            title={t('label.annual-target-doses-calculation')}
                            formula={t(
                              'description.annual-target-doses-calculation'
                            )}
                            substitution={steps()[0].substitution}
                            result={steps()[0].result}
                          />
                          <CalculationStep
                            title={t('label.monthly-units-calculation')}
                            formula={t('description.monthly-units-calculation')}
                            substitution={steps()[1].substitution}
                            result={steps()[1].result}
                          />
                        </AccordionContent>
                      </AccordionItem>
                    );
                  }}
                </For>
              </Accordion>
            </>
          )}
        </Match>
        <Match
          when={
            props.line.forecastBreakdown.__typename ===
              'AncillaryRatioForecastNode' && props.line.forecastBreakdown
          }
        >
          {ancillary => (
            <For each={ancillary().principals}>
              {principal => (
                <FigureRow
                  label={principalItemLabel(principal)}
                  value={quantity(principal.monthlyConsumption)}
                  caption={`${principalDemand(principal)} × ${ancillaryRatio(principal)}`}
                  testId="forecast-principal"
                />
              )}
            </For>
          )}
        </Match>
      </Switch>

      <FigureRow
        label={t('label.monthly-demand')}
        value={monthlyDemand()}
        testId="forecast-monthly-demand"
      />
      {/* The step into stock, the same for every method. */}
      <FigureRow
        label={t('label.target-stock')}
        value={quantity(props.line.targetStock)}
        caption={
          props.targetMonths === undefined
            ? undefined
            : targetStockCaption(
                monthlyDemand(),
                props.targetMonths,
                props.targetIntervalAndBuffer
              )
        }
        testId="forecast-target-stock"
      />
    </FormSection>
  );
};

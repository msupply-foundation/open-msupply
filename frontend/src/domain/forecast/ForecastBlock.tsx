import { For, Match, Show, Switch, type JSX } from 'solid-js';
import { t } from '../../intl';
import { formatNumber } from '../../intl/formatNumber';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '../../ui/elements/accordion/Accordion';
import { FieldRow } from '../../ui/elements/inputs/FieldRow';
import { Select } from '../../ui/elements/selectors/Select';
import {
  FORECAST_METHODS,
  ancillaryRatio,
  courseTitle,
  forecastMethodLabel,
  populationSteps,
  principalItemLabel,
  unavailableReasonMessage,
  type ForecastMethod,
  type ForecastMethodOption,
} from './forecast';
import type { ForecastLineFragment } from './forecast.generated';
import styles from './ForecastBlock.module.css';

// The forecast block (spec/internal-orders S4 › the forecast): a line's method,
// the breakdown behind its monthly demand, and the step into stock — monthly
// demand × target months = target stock. The internal-order editor offers the
// method as a select; the requisitions editor shows the customer's forecast
// read-only (spec/requisitions › forecast context), the method as text.

export interface ForecastBlockProps {
  line: ForecastLineFragment;
  /** The requisition's target months (max months of stock). */
  targetMonths: number;
  /**
   * A stock quantity (units) in the editor's active entry mode, with its
   * measure word — so monthly demand and target stock re-express like the
   * panels' figures (AC-LN19). `roundUp` as for AMC.
   */
  formatQuantity: (units: number, roundUp?: boolean) => string;
  /**
   * The method select's options. Omitted → the read-only form: the method as
   * text, no select.
   */
  options?: readonly ForecastMethodOption[];
  /** Picking a method saves it (rules › choosing a method). */
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
      // keeps the method it has (rules › captured at line creation).
      const unavailable =
        method !== props.line.forecastMethod && option?.isAvailable === false;
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

  const monthlyDemand = () =>
    props.formatQuantity(props.line.forecastMonthlyConsumption, true);

  return (
    <section class={styles.block} data-testid={props.testId}>
      <h3 class={styles.heading}>{t('heading.forecast')}</h3>

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
              <Accordion multiple>
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
                  value={props.formatQuantity(principal.monthlyConsumption)}
                  caption={`${props.formatQuantity(principal.principalMonthlyConsumption)} × ${ancillaryRatio(principal)}`}
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
        value={props.formatQuantity(props.line.targetStock)}
        caption={`${monthlyDemand()} × ${formatNumber(props.targetMonths)} ${t('label.months')}`}
        testId="forecast-target-stock"
      />
    </section>
  );
};

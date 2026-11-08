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
import { FormSection } from '../../ui/layout/Form/FormSection';
import {
  FORECAST_METHODS,
  courseTitle,
  forecastMethodLabel,
  isOperator,
  populationSteps,
  principalItemLabel,
  principalSteps,
  targetStockCaption,
  unavailableReasonMessage,
  type ForecastMethod,
  type CalculationStep,
  type Term,
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
   * The line's item's unit name — the measure of a breakdown's monthly demand
   * and an ancillary ratio's own side, which stay in units whatever the entry
   * mode. Omitted → the generic "units".
   */
  unitName?: string | null;
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

// One term of a step: the value under the name of what it is. A reference to
// an earlier step's result keeps that step's name, bold like its heading, so
// the chain from one step to the next is visible.
const TermCell = (props: { term: Term }): JSX.Element => (
  <span class={styles.term} data-ref={props.term.ref ? '' : undefined}>
    <span class={styles.termLabel}>{props.term.label}</span>
    <span class={styles.termValue}>{props.term.value}</span>
  </span>
);

// A breakdown's steps (forecast.ts › CalculationStep). Each opens on its
// heading — the quantity it works out, and its result — with the working
// beneath: "=", then its terms and operators, wrapping as the width needs.
const CalculationSteps = (props: {
  steps: CalculationStep[];
  testId?: string;
}): JSX.Element => (
  // role="list": the reset list style otherwise drops the list semantics in
  // Safari / VoiceOver.
  <ol class={styles.calculation} role="list" data-testid={props.testId}>
    <For each={props.steps}>
      {step => (
        <li class={styles.step}>
          <div class={styles.stepHeading}>
            <span>{step.name}</span>
            <span class={styles.stepResult}>{step.result}</span>
          </div>
          <Show when={step.terms.length > 0}>
            <div class={styles.equation}>
              <span class={styles.operator}>=</span>
              <For each={step.terms}>
                {term =>
                  isOperator(term) ? (
                    <span class={styles.operator}>{term}</span>
                  ) : (
                    <TermCell term={term} />
                  )
                }
              </For>
            </div>
          </Show>
        </li>
      )}
    </For>
  </ol>
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

  const unitName = () => props.unitName ?? null;

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
                open to start: the steps are the forecast's working. */}
              <Accordion
                multiple
                variant="card"
                defaultValue={population().courses.map(
                  (_, index) => `course-${index}`
                )}
              >
                <For each={population().courses}>
                  {(course, index) => (
                    <AccordionItem value={`course-${index()}`}>
                      <AccordionTrigger>{courseTitle(course)}</AccordionTrigger>
                      <AccordionContent>
                        {/* Re-derived on read so the figures re-format if
                          the locale changes while the editor is open. */}
                        <CalculationSteps
                          steps={populationSteps(course, unitName())}
                          testId="forecast-course"
                        />
                      </AccordionContent>
                    </AccordionItem>
                  )}
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
            <Accordion
              multiple
              variant="card"
              defaultValue={ancillary().principals.map(
                (_, index) => `principal-${index}`
              )}
            >
              <For each={ancillary().principals}>
                {(principal, index) => (
                  <AccordionItem value={`principal-${index()}`}>
                    <AccordionTrigger>
                      {principalItemLabel(principal)}
                    </AccordionTrigger>
                    <AccordionContent>
                      <CalculationSteps
                        steps={principalSteps(principal, unitName())}
                        testId="forecast-principal"
                      />
                    </AccordionContent>
                  </AccordionItem>
                )}
              </For>
            </Accordion>
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

import { For, type JSX } from 'solid-js';
import { t } from '../../../../intl';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '../../../../ui/elements/accordion/Accordion';
import { forecastSteps, type VaccineCourse } from './internalOrderLineEdit';
import styles from './ForecastCalculationDisplay.module.css';

// The population-forecast calculation display (spec/internal-orders S4,
// AC-PF7): where the store shows population-based forecasting and the edited
// line carries a forecast, this stands in for the context charts — the
// per-course arithmetic the server captured
// (RequisitionLineNode.vaccineCourses), walked step by step. One collapsible
// section per course group; each walks the three forecast steps.

// A single arithmetic step: its formula (tinted), the line's stored figures
// substituted (muted), and the emphasised result — the three-piece shape the
// spec fixes for every step.
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

export const ForecastCalculationDisplay = (props: {
  courses: VaccineCourse[];
}): JSX.Element => (
  <div class={styles.container}>
    <h3 class={styles.heading}>{t('label.population-forecast-calculation')}</h3>
    {/* Independent sections — each course opens on its own, all collapsed to
      start (matching the reference). */}
    <Accordion multiple>
      <For each={props.courses}>
        {(course, index) => {
          // Re-derived on read so the figures re-format if the locale changes
          // while the editor is open (formatNumber/round read locale()).
          const steps = () => forecastSteps(course);
          return (
            <AccordionItem value={`course-${index()}`}>
              <AccordionTrigger>{course.courseTitle}</AccordionTrigger>
              <AccordionContent class={styles.steps}>
                <CalculationStep
                  title={t('label.annual-target-doses-calculation')}
                  formula={t('description.annual-target-doses-calculation')}
                  substitution={steps()[0].substitution}
                  result={steps()[0].result}
                />
                <CalculationStep
                  title={t('label.forecast-doses-calculation')}
                  formula={t('description.forecast-doses-calculation')}
                  substitution={steps()[1].substitution}
                  result={steps()[1].result}
                />
                <CalculationStep
                  title={t('label.forecast-units-calculation')}
                  formula={t('description.forecast-units-calculation')}
                  substitution={steps()[2].substitution}
                  result={steps()[2].result}
                />
              </AccordionContent>
            </AccordionItem>
          );
        }}
      </For>
    </Accordion>
  </div>
);

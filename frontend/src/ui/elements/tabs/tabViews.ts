import { createMemo, type Accessor } from 'solid-js';
import { stepTabName } from './stepTabName';
import type { TabDef } from './Tabs';

/** What TabList draws for one tab, worked out from the whole strip. */
export interface TabView {
  tab: TabDef;
  /** A step's 1-based position among the strip's step tabs. */
  number?: number;
  /**
   * The line joining a step to the step before it, when that one is a step
   * too: `reached` (solid) once the record has got to this step.
   */
  connector?: { reached: boolean };
  /** The trigger's locale-stable e2e hook (e2e/TESTIDS.md). */
  stepMark?: 'done' | 'current' | 'not-started';
  ariaCurrent?: 'step';
  ariaLabel?: string;
}

export const describeTabs = (tabs: TabDef[]): Map<string, TabView> => {
  const views = new Map<string, TabView>();
  let steps = 0;
  tabs.forEach((tab, index) => {
    const step = tab.step;
    if (!step) {
      views.set(tab.value, { tab });
      return;
    }
    steps += 1;
    views.set(tab.value, {
      tab,
      number: steps,
      connector: tabs[index - 1]?.step
        ? { reached: step.mark !== 'notStarted' }
        : undefined,
      stepMark: step.mark === 'notStarted' ? 'not-started' : step.mark,
      ariaCurrent: step.mark === 'current' ? 'step' : undefined,
      ariaLabel: stepTabName(tab.label, step.mark, step.attention),
    });
  });
  return views;
};

/**
 * The strip's tabs keyed by value, not by TabDef object. TabList iterates
 * `values` and looks each one's view up, so a consumer that rebuilds its tabs
 * as a record's marks change keeps the same triggers and a focused tab is
 * never thrown away (kdd/solid-reactivity-pitfalls, No remounts on
 * interaction). Strings compare by value, so <For> keeps each value's row and
 * only the view behind it changes.
 */
export const createTabViews = (tabs: Accessor<TabDef[]>) => {
  const values = createMemo(() => tabs().map(tab => tab.value));
  const views = createMemo(() => describeTabs(tabs()));
  return { values, view: (value: string) => views().get(value)! };
};

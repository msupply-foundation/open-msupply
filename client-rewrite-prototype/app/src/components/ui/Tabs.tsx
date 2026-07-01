import * as RadixTabs from "@radix-ui/react-tabs";
import { useLayoutEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import styles from "./Tabs.module.css";

export interface TabDef {
  value: string;
  label: string;
}

/*
 * Tabs — Radix Tabs (headless). We own all the markup + CSS; Radix supplies the
 * parts that are tedious to hand-roll correctly and that WCAG 2.2 grades:
 *
 *   - The full WAI-ARIA tabs pattern: role="tablist" / "tab" / "tabpanel",
 *     aria-selected on the active tab, and the tab↔panel aria-controls / id
 *     wiring generated automatically (easy to get subtly wrong by hand).
 *   - Roving tabindex + keyboard nav: ←/→ move between tabs, Home/End jump to
 *     first/last, and it's direction-aware so the arrows flip correctly in RTL.
 *   - Focus management: Tab moves from the selected tab straight into its
 *     panel.
 *   - Inactive panels are unmounted from the DOM (cheap; no hidden work).
 *
 * The primitive is tiny — no positioning / Floating UI — so the cost is
 * minimal; we're buying the a11y contract, not a look. The look is entirely our
 * CSS, including the sliding underline (below).
 */
export const Tabs = RadixTabs.Root;

/*
 * TabList renders a single underline indicator that SLIDES between labels.
 * Radix doesn't ship an animated indicator, so we measure the active tab's
 * geometry (the one legit px use — computed layout, not a design token) and
 * translate the bar. Re-measures on tab change and on resize (which also covers
 * the root-size change at the phone breakpoint).
 */
export const TabList = ({ tabs, value }: { tabs: TabDef[]; value: string }) => {
  const listRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; width: number } | null>(null);

  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const measure = () => {
      const active = list.querySelector<HTMLElement>('[data-state="active"]');
      if (active) setPos({ left: active.offsetLeft, width: active.offsetWidth });
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [value, tabs]);

  return (
    <RadixTabs.List ref={listRef} className={styles.list}>
      {tabs.map((tab) => (
        <RadixTabs.Trigger key={tab.value} value={tab.value} className={styles.trigger}>
          {tab.label}
        </RadixTabs.Trigger>
      ))}
      <span
        className={styles.indicator}
        aria-hidden
        style={pos ? { transform: `translateX(${pos.left}px)`, width: `${pos.width}px` } : { opacity: 0 }}
      />
    </RadixTabs.List>
  );
};

export const TabPanel = ({ value, children }: { value: string; children: ReactNode }) => (
  <RadixTabs.Content value={value} className={styles.panel}>
    {children}
  </RadixTabs.Content>
);

import {
  For,
  createEffect,
  createSignal,
  on,
  onCleanup,
  onMount,
  type JSX,
} from 'solid-js'
import * as KTabs from '@kobalte/core/tabs'
import styles from './Tabs.module.css'

export interface TabDef {
  value: string
  label: string
}

interface TabsProps {
  /** Controlled active tab value. */
  value?: string
  onValueChange?: (value: string) => void
  /** Uncontrolled alternative: the tab active on first render. */
  defaultValue?: string
  class?: string
  children: JSX.Element
}

/*
 * Tabs — Kobalte Tabs (headless). We own all the markup + CSS; Kobalte
 * supplies the parts that are tedious to hand-roll correctly and that
 * WCAG 2.2 grades (the same buy the prototype made with Radix Tabs):
 *
 *   - The full WAI-ARIA tabs pattern: role="tablist" / "tab" / "tabpanel",
 *     aria-selected on the active tab, and the tab↔panel aria-controls / id
 *     wiring generated automatically (easy to get subtly wrong by hand).
 *   - Roving tabindex + keyboard nav: ←/→ move between tabs, Home/End jump
 *     to first/last, direction-aware so the arrows flip in RTL. Activation
 *     is automatic (focus selects), the pattern's recommended default.
 *   - Focus management: Tab moves from the selected tab into its panel —
 *     and the panel is only made focusable when it contains no tabbable
 *     element of its own (an upgrade over Radix's always-tabbable panel).
 *   - Inactive panels are unmounted from the DOM (cheap; no hidden work).
 *
 * The primitive is tiny — no positioning / Floating UI — so the cost is
 * minimal; we're buying the a11y contract, not a look. The look is entirely
 * our CSS, including the sliding underline (below).
 */
export const Tabs = (props: TabsProps) => (
  <KTabs.Root
    value={props.value}
    defaultValue={props.defaultValue}
    onChange={props.onValueChange}
    class={props.class}
  >
    {props.children}
  </KTabs.Root>
)

/*
 * TabList renders a single underline indicator that SLIDES between labels.
 * Kobalte ships a Tabs.Indicator, but it only re-measures when the selection
 * changes or the selected tab's own box resizes — our strip is centred, so a
 * window resize shifts every tab's offset without changing any tab's size and
 * would strand the underline. So we keep the prototype's approach: measure the
 * active tab's geometry ourselves (the one legit px use — computed layout, not
 * a design token) and translate the bar, re-measuring on tab change and on
 * window resize (which also covers the root-size change at the phone
 * breakpoint).
 *
 * Must render inside a <Tabs> (it reads Kobalte's tabs context). Rendered as
 * the LAST child of a <Header>, it claims the header's bottom edge — see
 * Header.module.css.
 */
export const TabList = (props: { tabs: TabDef[] }) => {
  const context = KTabs.useTabsContext()
  let listEl: HTMLDivElement | undefined
  const [pos, setPos] = createSignal<{ left: number; width: number }>()

  // Query the DOM rather than trusting context.selectedTab(): if the tabs
  // array is swapped the context can briefly hold a detached element.
  const measure = () => {
    if (!listEl?.isConnected) return
    const active = listEl.querySelector<HTMLElement>("[role='tab'][data-selected]")
    if (active) setPos({ left: active.offsetLeft, width: active.offsetWidth })
  }

  onMount(() => {
    // Kobalte sets selectedTab in an effect of its own; measure after it.
    queueMicrotask(measure)
    // Labels reflow when the webfont lands (the prototype's underline sat
    // 1px off until the first interaction) — measure again then.
    document.fonts?.ready.then(measure)
    window.addEventListener('resize', measure)
    onCleanup(() => window.removeEventListener('resize', measure))
  })
  createEffect(on([context.selectedTab, () => props.tabs], measure, { defer: true }))

  return (
    <KTabs.List ref={listEl} class={styles.list} data-tab-bar="">
      <For each={props.tabs}>
        {(tab) => (
          <KTabs.Trigger value={tab.value} class={styles.trigger}>
            {tab.label}
          </KTabs.Trigger>
        )}
      </For>
      <span
        class={styles.indicator}
        aria-hidden="true"
        style={
          pos()
            ? { transform: `translateX(${pos()!.left}px)`, width: `${pos()!.width}px` }
            : { opacity: 0 }
        }
      />
    </KTabs.List>
  )
}

export const TabPanel = (props: { value: string; children: JSX.Element }) => {
  const context = KTabs.useTabsContext()
  return (
    // aria-labelledby is passed explicitly: Kobalte fills its trigger-id map
    // in an effect that runs after the initially selected panel renders, so
    // that panel (the one every visit starts on) would get no accessible
    // name (verified against @kobalte/core 0.13.12). Its id scheme is
    // exposed as generateTriggerId, and an explicit prop wins the merge.
    <KTabs.Content
      value={props.value}
      aria-labelledby={context.generateTriggerId(props.value)}
      class={styles.panel}
    >
      {props.children}
    </KTabs.Content>
  )
}

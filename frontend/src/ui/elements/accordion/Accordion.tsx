import { createContext, useContext, type Accessor, type JSX } from 'solid-js';
import * as KAccordion from '@kobalte/core/accordion';
import { useCollapsibleContext } from '@kobalte/core/collapsible';
import { ChevronDownIcon } from '../../icons';
import styles from './Accordion.module.css';

export interface AccordionProps {
  /** Controlled: semantic key(s) of the currently-open item(s) (see AccordionItem.value). */
  value?: string[];
  /** Uncontrolled: semantic key(s) open on first render. */
  defaultValue?: string[];
  onValueChange?: (value: string[]) => void;
  /** Allow more than one item open at once (a shared group of independent items). */
  multiple?: boolean;
  /** In single-open mode, allow closing the open item by clicking its trigger again. */
  collapsible?: boolean;
  class?: string;
  children: JSX.Element;
}

/*
 * Accordion — Kobalte Accordion (headless), the same buy-the-hard-part
 * reasoning as Tabs: the W3C APG accordion pattern (heading/button roles,
 * aria-expanded, per-item id wiring) is tedious to get right by hand and
 * WCAG 2.2 grades it. We own all markup/CSS; Kobalte supplies the ARIA +
 * keyboard contract. Verified (2026-07-21, @kobalte/core 0.13.12): Tab moves
 * between triggers in normal document order and Enter/Space toggles the
 * focused one, both correct. Up/Down/Home/End roving nav between triggers
 * does NOT move focus in this version — verified against a bare, unwrapped
 * `KAccordion.Root` with no customisation, so it's an upstream gap, not
 * something this wrapper can fix. Each trigger stays independently tabbable
 * (no roving tabindex removing others from the tab order), so basic keyboard
 * operability is unaffected — only the optional arrow-key shortcut is absent.
 *
 * Generic: `value`/`onValueChange`/`multiple`/`collapsible` pass straight
 * through to Kobalte's own Root, so the caller chooses the shape —
 *  - a shared single-open group: `collapsible`, one shared `value` array
 *    across items (opening one closes whichever was open).
 *  - an independent list: `multiple`, `value` = every currently-open item's
 *    key — each item toggles independently.
 */
export const Accordion = (props: AccordionProps) => (
  <KAccordion.Root
    value={props.value}
    defaultValue={props.defaultValue}
    onChange={props.onValueChange}
    multiple={props.multiple}
    collapsible={props.collapsible}
    class={props.class}
  >
    {props.children}
  </KAccordion.Root>
);

// Carries an item's `value` down to its own AccordionTrigger, for the
// testid (Kobalte exposes the item key on the trigger only as a DOM
// data-key attribute, not as a prop we can read at author time).
const ItemValueContext = createContext<string>();

export interface AccordionItemProps {
  /**
   * The item's semantic key (kebab-case identifier, never translated copy),
   * unique within its Accordion — its open-state identity and the source of
   * the `accordion-trigger-<value>` testid. Same split as `TabDef.value`.
   */
  value: string;
  disabled?: boolean;
  class?: string;
  children: JSX.Element;
}

export const AccordionItem = (props: AccordionItemProps) => (
  <ItemValueContext.Provider value={props.value}>
    <KAccordion.Item
      value={props.value}
      disabled={props.disabled}
      class={props.class ? `${styles.item} ${props.class}` : styles.item}
    >
      {props.children}
    </KAccordion.Item>
  </ItemValueContext.Provider>
);

export interface AccordionTriggerProps {
  /** Heading level wrapping the trigger, for document-outline correctness. Default 'h3'. */
  as?: 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  class?: string;
  children: JSX.Element;
}

export const AccordionTrigger = (props: AccordionTriggerProps) => {
  const value = useContext(ItemValueContext);
  // accordion-trigger-<value> per e2e/TESTIDS.md: value lowercased, spaces → '-'
  const testId = value
    ? `accordion-trigger-${value.toLowerCase().replace(/\s+/g, '-')}`
    : undefined;
  return (
    <KAccordion.Header as={props.as ?? 'h3'} class={styles.header}>
      <KAccordion.Trigger
        class={
          props.class ? `${styles.trigger} ${props.class}` : styles.trigger
        }
        data-testid={testId}
      >
        <span>{props.children}</span>
        <ChevronDownIcon class={styles.chevron} aria-hidden="true" />
      </KAccordion.Trigger>
    </KAccordion.Header>
  );
};

export interface AccordionContentProps {
  class?: string;
  children: JSX.Element;
}

// The inner div (not the animated outer KAccordion.Content) carries padding —
// the outer element's height animates via Kobalte's measured CSS var, so
// padding on it would clip awkwardly mid-animation.
export const AccordionContent = (props: AccordionContentProps) => (
  <KAccordion.Content class={styles.content}>
    <div
      class={
        props.class
          ? `${styles.contentInner} ${props.class}`
          : styles.contentInner
      }
    >
      {props.children}
    </div>
  </KAccordion.Content>
);

/*
 * Reads whether the enclosing AccordionItem is currently expanded — a thin
 * wrapper over Kobalte's own Collapsible context (every AccordionItem renders
 * a Collapsible internally, so this context is available to any descendant).
 * Lets a consumer's own trigger/content children swap between full and
 * preview content depending on open state, without this component inventing
 * its own per-item state tracking.
 */
export const useAccordionItemExpanded = (): Accessor<boolean> =>
  useCollapsibleContext().isOpen;

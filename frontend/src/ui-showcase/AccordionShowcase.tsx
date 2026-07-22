import { For, Show, type JSX } from 'solid-js';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
  useAccordionItemExpanded,
} from '../ui/elements/accordion/Accordion';
import styles from './AccordionShowcase.module.css';

const Card = (props: {
  title: string;
  lead: JSX.Element;
  children: JSX.Element;
}) => (
  <section class={styles.card}>
    <header class={styles.cardHeader}>{props.title}</header>
    <div class={styles.cardBody}>
      <p class={styles.lead}>{props.lead}</p>
      {props.children}
    </div>
  </section>
);

const SINGLE_OPEN_ITEMS = [
  {
    value: 'general',
    label: 'General',
    body: 'Language, theme, and other display preferences.',
  },
  {
    value: 'notifications',
    label: 'Notifications',
    body: 'Email and in-app alert preferences.',
  },
  {
    value: 'advanced',
    label: 'Advanced',
    body: 'Rarely-changed, higher-risk settings.',
  },
];

const INDEPENDENT_ITEMS = [
  { value: 'summary', label: 'Summary', body: 'Key facts about this record.' },
  { value: 'history', label: 'History', body: 'A log of past changes.' },
  { value: 'documents', label: 'Documents', body: 'Attached files.' },
];

const PreviewTriggerLabel = (props: { label: string; preview: string }) => {
  const expanded = useAccordionItemExpanded();
  return (
    <>
      {props.label}
      <Show when={!expanded()}>
        <span class={styles.preview}>{props.preview}</span>
      </Show>
    </>
  );
};

export const AccordionShowcase = () => {
  return (
    <div class={styles.stack}>
      <Card
        title="Single-open group"
        lead={
          <>
            One shared <code>collapsible</code> root — opening a section closes
            whichever was open. This is the shape a page of permission-gated
            settings sections needs. "Advanced" is disabled here (
            <code>AccordionItem</code>'s <code>disabled</code> prop) to
            demonstrate that state — greyed out, not focusable, not togglable.
          </>
        }
      >
        <Accordion collapsible defaultValue={['general']}>
          <For each={SINGLE_OPEN_ITEMS}>
            {item => (
              <AccordionItem
                value={item.value}
                disabled={item.value === 'advanced'}
              >
                <AccordionTrigger as="h2">{item.label}</AccordionTrigger>
                <AccordionContent>
                  <p class={styles.panelText}>{item.body}</p>
                </AccordionContent>
              </AccordionItem>
            )}
          </For>
        </Accordion>
      </Card>

      <Card
        title="Independent list"
        lead={
          <>
            One shared <code>multiple</code> root wrapping a list — each item
            toggles independently.
          </>
        }
      >
        <Accordion multiple defaultValue={[]}>
          <For each={INDEPENDENT_ITEMS}>
            {item => (
              <AccordionItem value={item.value}>
                <AccordionTrigger as="h2">{item.label}</AccordionTrigger>
                <AccordionContent>
                  <p class={styles.panelText}>{item.body}</p>
                </AccordionContent>
              </AccordionItem>
            )}
          </For>
        </Accordion>
      </Card>

      <Card
        title="Closed-state preview"
        lead={
          <>
            <code>useAccordionItemExpanded()</code> reads the enclosing item's
            open state, so a trigger's own label can show a compact preview
            while collapsed and hide it once expanded.
          </>
        }
      >
        <Accordion collapsible defaultValue={[]}>
          <AccordionItem value="selection">
            <AccordionTrigger as="h2">
              <PreviewTriggerLabel label="Item" preview="Paracetamol 500mg" />
            </AccordionTrigger>
            <AccordionContent>
              <p class={styles.panelText}>
                Full editor for the selected item would render here.
              </p>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="notes">
            <AccordionTrigger as="h2">
              <PreviewTriggerLabel
                label="Notes"
                preview="Patient prefers morning delivery…"
              />
            </AccordionTrigger>
            <AccordionContent>
              <p class={styles.panelText}>
                Full notes editor would render here.
              </p>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </Card>
    </div>
  );
};

import { For, Show } from 'solid-js';
import { ContentContainer } from '../ui/layout/ContentContainer/ContentContainer';
import { Stack } from '../ui/layout/Stack/Stack';
import { DashboardCard } from '../ui/elements/dashboard/DashboardCard';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
  useAccordionItemExpanded,
} from '../ui/elements/accordion/Accordion';
import { Lead, SectionTOC } from './common';
import type { PageMetadata } from './metadata';
import styles from './AccordionShowcase.module.css';

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

export const accordionMetadata: PageMetadata = {
  id: 'accordion',
  title: 'Accordion',
  searchTerms: ['collapse', 'expand', 'disclosure'],
  items: [
    {
      id: 'accordion-single',
      title: 'Single-open group',
      searchTerms: ['exclusive', 'one'],
    },
    {
      id: 'accordion-independent',
      title: 'Independent list',
      searchTerms: ['multiple', 'many'],
    },
    {
      id: 'accordion-closed',
      title: 'Closed-state preview',
      searchTerms: ['collapsed', 'default'],
    },
    {
      id: 'accordion-card',
      title: 'Card sections',
      searchTerms: ['panel', 'filled', 'contained', 'variant'],
    },
  ],
};

export const AccordionShowcase = () => {
  return (
    <ContentContainer size="form" align="start">
      <Stack gap="lg">
        <SectionTOC page={accordionMetadata} />
        <DashboardCard id="accordion-single" title="Single-open group">
          <Lead>
            One shared <code>collapsible</code> root — opening a section closes
            whichever was open. This is the shape a page of permission-gated
            settings sections needs. "Advanced" is disabled here (
            <code>AccordionItem</code>'s <code>disabled</code> prop) to
            demonstrate that state — greyed out, not focusable, not togglable.
          </Lead>
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
        </DashboardCard>

        <DashboardCard id="accordion-independent" title="Independent list">
          <Lead>
            One shared <code>multiple</code> root wrapping a list — each item
            toggles independently.
          </Lead>
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
        </DashboardCard>

        <DashboardCard id="accordion-closed" title="Closed-state preview">
          <Lead>
            <code>useAccordionItemExpanded()</code> reads the enclosing item's
            open state, so a trigger's own label can show a compact preview
            while collapsed and hide it once expanded.
          </Lead>
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
        </DashboardCard>

        <DashboardCard id="accordion-card" title="Card sections">
          <Lead>
            <code>variant="card"</code> renders each item as a filled rounded
            panel — for a disclosure that must read as its own region inside a
            form or dialog body (the prescription line editor's Batches
            section). The flat default stays inline-flush; the card owns its
            inset. Composes with the closed-state preview.
          </Lead>
          <Accordion collapsible variant="card" defaultValue={[]}>
            <AccordionItem value="batches-demo">
              <AccordionTrigger as="h2" end="Available: 42,961 Tab">
                <PreviewTriggerLabel
                  label="Batches"
                  preview="RS-A-030453 · 1,014 Tab"
                />
              </AccordionTrigger>
              <AccordionContent>
                <p class={styles.panelText}>
                  The batch table would render here.
                </p>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="directions-demo">
              <AccordionTrigger as="h2">Directions</AccordionTrigger>
              <AccordionContent>
                <p class={styles.panelText}>
                  Directions fields would render here.
                </p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </DashboardCard>
      </Stack>
    </ContentContainer>
  );
};

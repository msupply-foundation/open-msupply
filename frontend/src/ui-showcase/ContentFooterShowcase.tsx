import { createSignal, For, Show } from 'solid-js';
import { ContentContainer } from '../ui/layout/ContentContainer/ContentContainer';
import { Stack } from '../ui/layout/Stack/Stack';
import { DashboardCard } from '../ui/elements/dashboard/DashboardCard';
import { ContentFooter } from '../ui/layout/ContentFooter/ContentFooter';
import { ContentFooterActions } from '../ui/layout/ContentFooter/ContentFooterActions';
import {
  ContentFooterMessage,
  type FooterMessage,
} from '../ui/layout/ContentFooter/ContentFooterMessage';
import { Button } from '../ui/elements/buttons/Button';
import { ConfirmDialog } from '../ui/elements/feedback/ConfirmDialog';
import {
  StatusIndicator,
  type StatusStep,
} from '../ui/elements/feedback/StatusIndicator';
import {
  CancelButton,
  SaveButton,
} from '../ui/elements/buttons/StandardButtons';
import {
  ArrowRightIcon,
  CopyIcon,
  MinusCircleIcon,
  TrashIcon,
} from '../ui/icons';
import { Lead, PageBody, PageFrame } from './common';
import type { PageMetadata } from './metadata';
import styles from './ContentFooterShowcase.module.css';

const DEMO_ROWS = ['OS-001024', 'OS-001025', 'OS-001026'];

// The status progression shown at the footer's inline-start edge — the
// StatusIndicator replaces a separate "History" button, since its hover popover
// is the status history (mirrors the app's real detail footers).
const SHIPMENT_STEPS: StatusStep[] = [
  { label: 'New', date: '2026-03-01' },
  { label: 'Allocated', date: '2026-03-02' },
  { label: 'Picked', date: '2026-03-03' },
  { label: 'Shipped' },
];

// No TOC is rendered — the page is short (Carl); the metadata is still exported
// and registered so Search indexes these sections.
export const contentFooterMetadata: PageMetadata = {
  id: 'content-footer',
  title: 'Content footer',
  searchTerms: ['footer', 'action bar', 'bottom'],
  items: [
    {
      id: 'content-footer-detail-bar',
      title: 'Detail-page bar',
      searchTerms: ['save', 'cancel', 'status', 'history', 'actions'],
    },
    {
      id: 'content-footer-message',
      title: 'Message slot — a step that completed',
      searchTerms: ['success', 'flash', 'status', 'outcome', 'feedback'],
    },
    {
      id: 'content-footer-contextual',
      title: 'Contextual content',
      searchTerms: ['context', 'conditional', 'two'],
    },
  ],
};

// The message-slot demo's flow: each confirm moves one stage on and flashes
// the save confirmation. The last stage hides the button, as a real footer
// does.
const INBOUND_STEPS: StatusStep[] = [
  { label: 'New' },
  { label: 'Delivered' },
  { label: 'Received' },
  { label: 'Verified' },
];

export const ContentFooterShowcase = () => {
  const [confirmSave, setConfirmSave] = createSignal(false);
  const [stage, setStage] = createSignal(0);
  const [outcome, setOutcome] = createSignal<FooterMessage>();
  const advance = () => {
    setStage(stage() + 1);
    setOutcome({ type: 'success', text: 'Shipment saved 🥳' });
  };
  const [picked, setPicked] = createSignal<ReadonlySet<string>>(new Set());
  const toggle = (id: string) =>
    setPicked(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const clear = () => setPicked(new Set<string>());

  return (
    <ContentContainer size="form" align="start">
      <Stack gap="lg">
        <DashboardCard
          id="content-footer-detail-bar"
          title="Detail-page bar — Status / Cancel / Save"
        >
          <Lead>
            The pinned action bar from last week's demo (the current app's blue
            bar above the orange footer). <code>&lt;ContentFooter&gt;</code> is
            pure layout with zero state, the same contract as{' '}
            <code>&lt;Header&gt;</code>: loose children flow from the
            inline-start edge, and <code>&lt;ContentFooterActions&gt;</code>{' '}
            pins the button cluster inline-end. Here the inline-start slot holds
            a <code>&lt;StatusIndicator&gt;</code> (see the Progress section) —
            its hover popover is the status history, so it stands in for a
            separate History button, as the app's real detail footers do. The
            page owns every handler — here Save opens the standard{' '}
            <code>&lt;ConfirmDialog&gt;</code> (native{' '}
            <code>&lt;dialog&gt;</code> — see the Feedback section). Inside the
            app it pins between the scrolling body and the app footer via the
            Page frame's <code>contentFooter</code> slot — see the Outbound
            Shipments page in the Full page group.
          </Lead>
          <PageFrame>
            <PageBody />
            <ContentFooter>
              <StatusIndicator steps={SHIPMENT_STEPS} current={2} />
              <ContentFooterActions>
                <CancelButton />
                <SaveButton onClick={() => setConfirmSave(true)} />
                <ConfirmDialog
                  open={confirmSave()}
                  onClose={() => setConfirmSave(false)}
                  message="Save changes to this shipment?"
                  onConfirm={() => {}}
                />
              </ContentFooterActions>
            </ContentFooter>
          </PageFrame>
        </DashboardCard>

        <DashboardCard
          id="content-footer-message"
          title="Message slot — a step that completed"
        >
          <Lead>
            A status change often removes the control that made it: the dialog
            closes and the status button hides at the status it just set.{' '}
            <code>&lt;ContentFooterMessage&gt;</code> is where the footer says
            what happened instead — one compact chip, green for a success (the
            save confirmation, clearing itself) and red for a refusal (
            <code>persistent</code>, staying until the next attempt, and opening
            its whole text on hover, focus or tap), in the bar's one flexible
            slot beside the actions so nothing moves when it lands. As it lands,
            one green wave travels along the whole bar. It is a polite live
            region, so the outcome is announced as well as seen. The crumb that
            just arrived plays its one-shot bloom (reduced motion: the colour
            change only). Confirm through to Verified, then reset.
          </Lead>
          <PageFrame>
            <PageBody />
            <ContentFooter>
              <StatusIndicator steps={INBOUND_STEPS} current={stage()} />
              <ContentFooterMessage message={outcome()} />
              <ContentFooterActions>
                <Show
                  when={stage() < INBOUND_STEPS.length - 1}
                  fallback={
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setOutcome(undefined);
                        setStage(0);
                      }}
                    >
                      Reset
                    </Button>
                  }
                >
                  <Button
                    variant="secondary"
                    onClick={() =>
                      setOutcome({
                        type: 'error',
                        text: 'This shipment is on hold. Remove the hold to change its status.',
                        persistent: true,
                      })
                    }
                  >
                    Try while on hold
                  </Button>
                  <Button icon={<ArrowRightIcon />} onClick={advance}>
                    Confirm {INBOUND_STEPS[stage() + 1]?.label}
                  </Button>
                </Show>
              </ContentFooterActions>
            </ContentFooter>
          </PageFrame>
        </DashboardCard>

        <DashboardCard
          id="content-footer-contextual"
          title="Contextual content — one bar, two contexts"
        >
          <Lead>
            The bar's content is contextual <em>by composition</em>, not by a
            store: when a page has a selection it swaps the bar's children for
            "N selected" + selection actions, so two rows of blue buttons never
            stack (Carl's rule from the prototype week). Tick rows below to
            watch the same bar change modes — the swap is a plain{' '}
            <code>&lt;Show&gt;</code> in the page.
          </Lead>
          <PageFrame>
            <ul class={styles.demoRows}>
              <For each={DEMO_ROWS}>
                {id => (
                  <li>
                    <label class={styles.demoRow}>
                      <input
                        type="checkbox"
                        class={styles.demoCheckbox}
                        checked={picked().has(id)}
                        onChange={() => toggle(id)}
                      />
                      {id}
                    </label>
                  </li>
                )}
              </For>
            </ul>
            <ContentFooter>
              <Show
                when={picked().size > 0}
                fallback={
                  <>
                    <StatusIndicator steps={SHIPMENT_STEPS} current={2} />
                    <ContentFooterActions>
                      <CancelButton />
                      <SaveButton />
                    </ContentFooterActions>
                  </>
                }
              >
                <span class={styles.count}>{picked().size} selected</span>
                <ContentFooterActions>
                  <Button
                    variant="secondary"
                    icon={<TrashIcon />}
                    onClick={clear}
                  >
                    Delete
                  </Button>
                  <Button variant="secondary" icon={<CopyIcon />}>
                    Make a copy
                  </Button>
                  <Button
                    variant="secondary"
                    icon={<MinusCircleIcon />}
                    onClick={clear}
                  >
                    Clear selection
                  </Button>
                </ContentFooterActions>
              </Show>
            </ContentFooter>
          </PageFrame>
        </DashboardCard>
      </Stack>
    </ContentContainer>
  );
};

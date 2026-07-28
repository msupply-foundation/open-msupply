import { For } from 'solid-js';
import { ContentContainer } from '../ui/layout/ContentContainer/ContentContainer';
import { Stack } from '../ui/layout/Stack/Stack';
import { DashboardCard } from '../ui/elements/dashboard/DashboardCard';
import { Alert } from '../ui/elements/feedback/Alert';
import { Badge } from '../ui/elements/feedback/Badge';
import { StatusChip } from '../ui/elements/feedback/StatusChip';
import { Popover } from '../ui/elements/feedback/Popover';
import { Comment } from '../ui/elements/feedback/Comment';
import { InfoTooltip } from '../ui/elements/feedback/InfoTooltip';
import { Spinner } from '../ui/elements/feedback/Spinner';
import { TextField } from '../ui/elements/inputs/TextField';
import { CheckCircleIcon, HelpIcon, MessageSquareIcon } from '../ui/icons';
import { Lead, Note, Row, SectionTOC } from './common';
import type { PageMetadata } from './metadata';
import styles from './FeedbackShowcase.module.css';

/* Chip colours come from the --status-* contract tokens (with dark
   overrides) — never literals here, per the no-hard-coded-colours rule. */
const STATUS_CHIPS: { label: string; colour: string }[] = [
  { label: 'New', colour: 'var(--status-new)' },
  { label: 'Allocated', colour: 'var(--status-allocated)' },
  { label: 'Picked', colour: 'var(--status-picked)' },
  { label: 'Shipped', colour: 'var(--status-shipped)' },
  { label: 'Delivered', colour: 'var(--status-delivered)' },
  { label: 'Verified', colour: 'var(--status-verified)' },
];

export const feedbackMetadata: PageMetadata = {
  id: 'feedback',
  title: 'Feedback',
  searchTerms: ['status', 'message', 'notification'],
  items: [
    {
      id: 'feedback-chips-badges',
      title: 'Chips & badges',
      searchTerms: ['status chip', 'badge', 'count', 'pill'],
    },
    {
      id: 'feedback-alerts',
      title: 'Alerts',
      searchTerms: [
        'error',
        'warning',
        'info',
        'success',
        'banner',
        'compact',
        'inline',
        'chip',
      ],
    },
    {
      id: 'feedback-popovers',
      title: 'Popovers & tooltips',
      searchTerms: ['popover', 'tooltip', 'comment', 'hint', 'help'],
    },
    {
      id: 'feedback-spinner',
      title: 'Spinner',
      searchTerms: ['loading', 'wait', 'progress', 'busy', 'ring'],
    },
  ],
};

export const FeedbackShowcase = () => {
  return (
    <ContentContainer size="form" align="start">
      <Stack gap="lg">
        <SectionTOC page={feedbackMetadata} />
        <DashboardCard id="feedback-chips-badges" title="Status chips">
          <Lead>
            Hand-rolled, pure CSS — a chip has no interaction or a11y contract
            to buy. One <code>colour</code> prop (always a{' '}
            <code>var(--status-*)</code> token) drives both the dot and the{' '}
            <code>color-mix</code> pill tint; the label keeps the normal text
            colour, so contrast holds in both themes and colour never carries
            the meaning alone.
          </Lead>
          <Row gap="sm">
            <For each={STATUS_CHIPS}>
              {chip => <StatusChip label={chip.label} colour={chip.colour} />}
            </For>
          </Row>
        </DashboardCard>

        <DashboardCard title="Badge — count / status pill">
          <Lead>
            The small pill riding on another element (the sidebar's sync entry):
            a count, a capped <code>99+</code>, or an alert mark. Meaning is the
            label text (plus the host's accessible text) — the semantic{' '}
            <code>tone</code> only escalates it, never stands alone.
          </Lead>
          <Row gap="sm">
            <Badge label="3" title="3 records to push" />
            <Badge label="99+" title="250 records to push" />
            <Badge label="42" tone="warning" title="42 records to push" />
            <Badge label="!" tone="error" title="Sync error" />
          </Row>
        </DashboardCard>

        <DashboardCard
          id="feedback-alerts"
          title="Alerts — error / warning / info / success / neutral"
        >
          <Lead>
            Hand-rolled, one <code>&lt;div&gt;</code> + CSS — the current app's
            MUI Alert look (pale tinted panel, 10px radius, severity icon)
            without the library. Panel and text colours are{' '}
            <code>color-mix</code> derivations from the severity tokens over
            themed surfaces, so dark mode needs no extra rules; each severity
            keeps a distinct icon shape, so colour never stands alone.
          </Lead>
          <Stack gap="sm" class={styles.hugStart}>
            <Alert severity="error">
              Cannot delete: this shipment has already been shipped.
            </Alert>
            <Alert severity="warning">
              Quantity reduced to 12 packs — no more stock is available.
            </Alert>
            <Alert severity="info">
              This shipment was created from requisition RQ-1024.
            </Alert>
            <Alert severity="success">All lines allocated.</Alert>
            <Alert severity="neutral" icon={CheckCircleIcon}>
              Last successful sync 09:37 (completed in 1 second) — the untinted
              notice, glyph overridden by intent.
            </Alert>
          </Stack>

          <Lead>
            <strong>Compact footprint.</strong> The <code>compact</code> prop is
            the ui-standards <code>fb-banner--compact</code>: the same alert
            (severity, tint, icon) shrunk to an inline chip that tucks into a
            page-header meta strip — persistent, low-urgency context (read-only
            / auto-created record, locked document) that shouldn't cost a
            content row. It's a single line while it fits and wraps once it hits
            the container rather than overflowing. Same colour language, smaller
            footprint; never shrink an error the user must fix.
          </Lead>
          <Stack gap="sm" class={styles.hugStart}>
            <Alert severity="info">
              This shipment is updated automatically; its status follows the
              sending side.
            </Alert>
            <Alert severity="info" compact>
              This shipment is updated automatically; its status follows the
              sending side.
            </Alert>
          </Stack>
          <Row gap="sm">
            <Alert severity="warning" compact>
              Auto-created — status won't update
            </Alert>
            <Alert severity="neutral" compact icon={CheckCircleIcon}>
              Read-only
            </Alert>
            <Alert severity="success" compact>
              Verified
            </Alert>
          </Row>
        </DashboardCard>

        <DashboardCard
          id="feedback-popovers"
          title="Popover — content bubble on click/focus"
        >
          <Lead>
            Native Popover API (<code>popover="auto"</code>), no library — top
            layer (no portal, no clipping), light dismiss, Escape and{' '}
            <code>aria-expanded</code> come from the platform; only the
            placement is our own measured geometry, because CSS anchor
            positioning is too newly Baseline to rely on. For content bubbles
            like a row's comment — a menu still buys Kobalte DropdownMenu.
          </Lead>
          <div class={styles.popoverRow}>
            <Popover
              trigger={<MessageSquareIcon />}
              triggerLabel="Show comment"
              triggerClass={styles.commentTrigger}
            >
              Split delivery agreed with the customer — second carton follows on
              Thursday's flight to Buka.
            </Popover>
            <Popover
              trigger={
                <>
                  <HelpIcon /> What's a pack size?
                </>
              }
              placement="top-start"
            >
              The number of units in one pack of this item — quantities on a
              shipment line are counted in packs, not units. This one prefers{' '}
              <code>top-start</code> and flips below when there's no room above.
            </Popover>
          </div>
        </DashboardCard>

        <DashboardCard title="Comment — a note behind an icon">
          <Lead>
            The list table's comment column (and any note that hides behind an
            icon): a quiet <code>MessageSquareIcon</code> that reveals its text
            in a popover — a bold heading over the body — on hover / focus, and
            on click / tap too (so it opens on touch). A thin wrapper over{' '}
            <code>Popover</code>; renders nothing when there is no comment, so a
            cell can drop it in unconditionally.
          </Lead>
          <div class={styles.popoverRow}>
            <Comment comment="Split delivery agreed with the customer — second carton follows on Thursday's flight to Buka." />
            <span>
              ← hover or tap the icon. An empty comment renders nothing:{' '}
            </span>
            <Comment comment={null} />
          </div>
        </DashboardCard>

        <DashboardCard title="InfoTooltip — help text behind an icon">
          <Lead>
            The help-text sibling of <code>Comment</code>: a quiet{' '}
            <code>InfoIcon</code> that reveals a short gloss on hover / focus /
            tap. Pass it to an input's <code>labelInfo</code> slot to explain a
            field (below), or drop it inline beside any term.
          </Lead>
          <div class={styles.popoverRow}>
            <span>Standalone: </span>
            <InfoTooltip text="The number of local (home) currency units per one PO currency unit." />
          </div>
          <TextField
            label="Currency rate"
            labelInfo={
              <InfoTooltip text="The number of local (home) currency units per one PO currency unit — e.g. a rate of 1.6 means 1 USD = 1.6 NZD." />
            }
            value="1.6"
          />
        </DashboardCard>

        <DashboardCard
          id="feedback-spinner"
          title="Spinner — loading indicator"
        >
          <Lead>
            A spinning-ring loading indicator carrying{' '}
            <code>role="status"</code> and an accessible label (defaults to
            "Loading…"), so a screen reader announces the wait. Colour follows{' '}
            <code>currentColor</code> and the size is a rem prop (
            <code>sizeRem</code>, default 2).{' '}
            <code>prefers-reduced-motion</code> slows it rather than stopping —
            a stopped ring reads as broken.
          </Lead>
          <Row>
            <Spinner sizeRem={1} label="Loading, small" />
            <Spinner label="Loading" />
            <Spinner sizeRem={3} label="Loading, large" />
          </Row>
          <Note>
            <code>center</code> fills its container and centres the ring — the
            full-body wait used as a <code>&lt;Suspense&gt;</code> fallback and
            in the DataTable's initial load. Following <code>currentColor</code>
            , it takes the surrounding text colour:
          </Note>
          <div style={{ 'block-size': '8rem' }}>
            <Spinner center label="Loading report" />
          </div>
        </DashboardCard>
      </Stack>
    </ContentContainer>
  );
};

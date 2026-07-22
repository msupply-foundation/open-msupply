import { For } from 'solid-js';
import { ContentContainer } from '../ui/layout/ContentContainer/ContentContainer';
import { Stack } from '../ui/layout/Stack/Stack';
import { DashboardCard } from '../ui/elements/dashboard/DashboardCard';
import { Alert } from '../ui/elements/feedback/Alert';
import { Badge } from '../ui/elements/feedback/Badge';
import { StatusChip } from '../ui/elements/feedback/StatusChip';
import { Popover } from '../ui/elements/feedback/Popover';
import { Comment } from '../ui/elements/feedback/Comment';
import { CheckCircleIcon, HelpIcon, MessageSquareIcon } from '../ui/icons';
import { Lead, Row } from './common';
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

export const FeedbackShowcase = () => {
  return (
    <ContentContainer size="form" align="start">
      <Stack gap="lg">
        <DashboardCard title="Status chips">
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

        <DashboardCard title="Alerts — error / warning / info / success / neutral">
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
        </DashboardCard>

        <DashboardCard title="Popover — content bubble on click/focus">
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
      </Stack>
    </ContentContainer>
  );
};

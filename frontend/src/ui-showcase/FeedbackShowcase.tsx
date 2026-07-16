import { createSignal, For, type JSX } from 'solid-js';
import { Alert } from '../ui/elements/feedback/Alert';
import { Badge } from '../ui/elements/feedback/Badge';
import { StatusChip } from '../ui/elements/feedback/StatusChip';
import { ProgressList } from '../ui/sync/ProgressList';
import { Dialog } from '../ui/elements/feedback/Dialog';
import { ConfirmDialog } from '../ui/elements/feedback/ConfirmDialog';
import { Popover } from '../ui/elements/feedback/Popover';
import { Button } from '../ui/elements/buttons/Button';
import { TextField } from '../ui/elements/inputs/TextField';
import {
  CheckCircleIcon,
  ChevronsDownIcon,
  ChevronsUpIcon,
  ClockIcon,
  DownloadIcon,
  HelpIcon,
  MessageSquareIcon,
  PlusCircleIcon,
  SaveIcon,
  XCircleIcon,
} from '../ui/icons';
import styles from './FeedbackShowcase.module.css';

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
  const [confirmOpen, setConfirmOpen] = createSignal(false);
  const [outcome, setOutcome] = createSignal('');
  const [dialogOpen, setDialogOpen] = createSignal(false);

  return (
    <div class={styles.stack}>
      <Card
        title="Status chips"
        lead={
          <>
            Hand-rolled, pure CSS — a chip has no interaction or a11y contract
            to buy. One <code>colour</code> prop (always a{' '}
            <code>var(--status-*)</code> token) drives both the dot and the{' '}
            <code>color-mix</code> pill tint; the label keeps the normal text
            colour, so contrast holds in both themes and colour never carries
            the meaning alone.
          </>
        }
      >
        <div class={styles.chipRow}>
          <For each={STATUS_CHIPS}>
            {chip => <StatusChip label={chip.label} colour={chip.colour} />}
          </For>
        </div>
      </Card>

      <Card
        title="Progress list — determinate sync steps"
        lead={
          <>
            The sync surfaces' phase list (<code>ui/sync</code>), rendered as
            the current app's horizontal stepper: circled icon markers joined
            by connectors (a step without an icon shows its number), label +
            done/total beneath, the in-flight marker pulsing.{' '}
            <code>variant</code> picks the tone (primary = the sync modal,
            secondary = initialisation); <code>error</code> flags the
            in-flight step. Steps are position-keyed (<code>&lt;Index&gt;</code>)
            and update in place, so consumers can rebuild the step objects on
            every status tick.
          </>
        }
      >
        <ProgressList
          steps={[
            {
              label: 'Push',
              icon: ChevronsUpIcon,
              started: true,
              finished: true,
            },
            {
              label: 'Waiting for integration',
              icon: ClockIcon,
              started: true,
              finished: true,
            },
            {
              label: 'Pull',
              icon: ChevronsDownIcon,
              started: true,
              finished: false,
              done: 5,
              total: 10,
            },
            {
              label: 'Integrate',
              icon: DownloadIcon,
              started: false,
              finished: false,
            },
          ]}
        />
        {/* The genuine v5/v6 remote-site initialisation set (prepare has no
            icon, so it shows its number; initialisation never pushes). */}
        <ProgressList
          variant="secondary"
          error
          steps={[
            { label: 'Prepare', started: true, finished: true },
            {
              label: 'Pull central',
              icon: ChevronsDownIcon,
              started: true,
              finished: true,
              done: 33568,
              total: 33568,
            },
            {
              label: 'Pull remote',
              icon: ChevronsDownIcon,
              started: true,
              finished: false,
              done: 7260,
              total: 80754,
            },
            {
              label: 'Pull V6',
              icon: ChevronsDownIcon,
              started: false,
              finished: false,
            },
            {
              label: 'Integrate',
              icon: DownloadIcon,
              started: false,
              finished: false,
            },
          ]}
        />
      </Card>

      <Card
        title="Badge — count / status pill"
        lead={
          <>
            The small pill riding on another element (the sidebar's sync
            entry): a count, a capped <code>99+</code>, or an alert mark.
            Meaning is the label text (plus the host's accessible text) — the
            semantic <code>tone</code> only escalates it, never stands alone.
          </>
        }
      >
        <div class={styles.chipRow}>
          <Badge label="3" title="3 records to push" />
          <Badge label="99+" title="250 records to push" />
          <Badge label="42" tone="warning" title="42 records to push" />
          <Badge label="!" tone="error" title="Sync error" />
        </div>
      </Card>

      <Card
        title="Alerts — error / warning / info / success / neutral"
        lead={
          <>
            Hand-rolled, one <code>&lt;div&gt;</code> + CSS — the current app's
            MUI Alert look (pale tinted panel, 10px radius, severity icon)
            without the library. Panel and text colours are{' '}
            <code>color-mix</code> derivations from the severity tokens over
            themed surfaces, so dark mode needs no extra rules; each severity
            keeps a distinct icon shape, so colour never stands alone.
          </>
        }
      >
        <div class={styles.alertStack}>
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
        </div>
      </Card>

      <Card
        title="Confirm dialog — Save → are you sure?"
        lead={
          <>
            Native <code>&lt;dialog&gt;</code> + <code>showModal()</code>, no
            library — the platform gives the focus trap (top layer + inert
            page), focus restore, Escape and <code>::backdrop</code>; the RnD
            prototype bought Radix for exactly this contract, and the "hard to
            drive from React" objection doesn't exist in Solid. Scrim click and
            Escape both cancel. Watch focus return to the Save button on close.
          </>
        }
      >
        <Button
          variant="secondary"
          icon={<SaveIcon />}
          onClick={() => setConfirmOpen(true)}
        >
          Save
        </Button>
        <span class={styles.outcome} role="status">
          {outcome()}
        </span>
        <ConfirmDialog
          open={confirmOpen()}
          onClose={() => {
            setConfirmOpen(false);
            setOutcome(o =>
              o === '' || o.startsWith('Cancelled') ? 'Cancelled.' : o
            );
          }}
          message="Save changes to this shipment? This is the standard Cancel/OK preset — ConfirmDialog is a thin composition over Dialog."
          onConfirm={() => setOutcome('Saved ✓')}
        />
      </Card>

      <Card
        title="Dialog — custom content, footer and actions"
        lead={
          <>
            The base <code>&lt;Dialog&gt;</code> takes a required{' '}
            <code>title</code> (its accessible name), optional icon /
            description, free-form children, an optional bottom-pinned{' '}
            <code>footer</code> band and an <code>actions</code> row.{' '}
            <code>widthRem</code> sets a steady width and{' '}
            <code>minBodyHeightRem</code> reserves height so the box doesn't
            jump as content changes — the slack falls above the footer, so
            footer + actions stay on the bottom edge. The browser moves focus to
            the first control and Tab cycles inside while the page behind is
            inert. (Opening a Combobox / Select <em>inside</em> a dialog needs
            extra care — see the "in a dialog" card under Selectors.)
          </>
        }
      >
        <Button icon={<PlusCircleIcon />} onClick={() => setDialogOpen(true)}>
          New shipment
        </Button>
        <Dialog
          open={dialogOpen()}
          onClose={() => setDialogOpen(false)}
          icon={<PlusCircleIcon />}
          title="New shipment"
          description="Give the shipment a reference."
          widthRem={34}
          minBodyHeightRem={16}
          footer={
            <Alert severity="info">A new draft shipment will be created.</Alert>
          }
          actions={
            <>
              <Button
                variant="secondary"
                icon={<XCircleIcon />}
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                icon={<PlusCircleIcon />}
                onClick={() => setDialogOpen(false)}
              >
                Create
              </Button>
            </>
          }
        >
          <TextField label="Reference" placeholder="e.g. PO-1042" />
        </Dialog>
      </Card>

      <Card
        title="Popover — content bubble on click/focus"
        lead={
          <>
            Native Popover API (<code>popover="auto"</code>), no library — top
            layer (no portal, no clipping), light dismiss, Escape and{' '}
            <code>aria-expanded</code> come from the platform; only the
            placement is our own measured geometry, because CSS anchor
            positioning is too newly Baseline to rely on. For content bubbles
            like a row's comment — a menu still buys Kobalte DropdownMenu.
          </>
        }
      >
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
      </Card>
    </div>
  );
};

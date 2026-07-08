import { createSignal, For, type JSX } from 'solid-js'
import { StatusChip } from '../components/ui/StatusChip'
import { Dialog } from '../components/ui/Dialog'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { Popover } from '../components/ui/Popover'
import { Button } from '../components/ui/Button'
import { TextField } from '../components/ui/TextField'
import {
  HelpIcon,
  MessageSquareIcon,
  PlusCircleIcon,
  SaveIcon,
  XCircleIcon,
} from '../components/icons'
import styles from './FeedbackShowcase.module.css'

const Card = (props: {
  title: string
  lead: JSX.Element
  children: JSX.Element
}) => (
  <section class={styles.card}>
    <header class={styles.cardHeader}>{props.title}</header>
    <div class={styles.cardBody}>
      <p class={styles.lead}>{props.lead}</p>
      {props.children}
    </div>
  </section>
)

/* Chip colours come from the --status-* contract tokens (with dark
   overrides) — never literals here, per the no-hard-coded-colours rule. */
const STATUS_CHIPS: { label: string; colour: string }[] = [
  { label: 'New', colour: 'var(--status-new)' },
  { label: 'Allocated', colour: 'var(--status-allocated)' },
  { label: 'Picked', colour: 'var(--status-picked)' },
  { label: 'Shipped', colour: 'var(--status-shipped)' },
  { label: 'Delivered', colour: 'var(--status-delivered)' },
  { label: 'Verified', colour: 'var(--status-verified)' },
]

export const FeedbackShowcase = () => {
  const [confirmOpen, setConfirmOpen] = createSignal(false)
  const [outcome, setOutcome] = createSignal('')
  const [dialogOpen, setDialogOpen] = createSignal(false)

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
            {(chip) => <StatusChip label={chip.label} colour={chip.colour} />}
          </For>
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
        <Button variant="secondary" icon={<SaveIcon />} onClick={() => setConfirmOpen(true)}>
          Save
        </Button>
        <span class={styles.outcome} role="status">
          {outcome()}
        </span>
        <ConfirmDialog
          open={confirmOpen()}
          onClose={() => {
            setConfirmOpen(false)
            setOutcome((o) => (o === '' || o.startsWith('Cancelled') ? 'Cancelled.' : o))
          }}
          message="Save changes to this shipment? This is the standard Cancel/OK preset — ConfirmDialog is a thin composition over Dialog."
          onConfirm={() => setOutcome('Saved ✓')}
        />
      </Card>

      <Card
        title="Dialog — custom content and actions"
        lead={
          <>
            The base <code>&lt;Dialog&gt;</code> takes a required{' '}
            <code>title</code> (its accessible name), optional icon /
            description, free-form children and an <code>actions</code> row.
            The browser moves focus to the first focusable control — here the
            input — and Tab cycles inside while the page behind is inert.
          </>
        }
      >
        <Button icon={<PlusCircleIcon />} onClick={() => setDialogOpen(true)}>
          New shipment
        </Button>
        <Dialog
          open={dialogOpen()}
          onClose={() => setDialogOpen(false)}
          title="New shipment"
          description="Pick the customer this shipment is for."
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
                variant="secondary"
                icon={<PlusCircleIcon />}
                onClick={() => setDialogOpen(false)}
              >
                Create
              </Button>
            </>
          }
        >
          <TextField label="Customer" placeholder="Search by name or code…" />
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
  )
}

import { createSignal, Show, type JSX } from 'solid-js'
import { Button } from '../ui/elements/buttons/Button'
import { IconButton } from '../ui/elements/buttons/IconButton'
import { SplitButton } from '../ui/elements/buttons/SplitButton'
import {
  PlusCircleIcon,
  DownloadIcon,
  SaveIcon,
  TrashIcon,
  CopyIcon,
  SettingsIcon,
  MaximiseIcon,
} from '../ui/icons'
import styles from './ButtonsShowcase.module.css'

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

const EXPORT_OPTIONS = [
  { value: 'csv', label: 'Export CSV' },
  { value: 'excel', label: 'Export Excel' },
]

export const ButtonsShowcase = () => {
  const [lastExport, setLastExport] = createSignal<string | null>(null)

  return (
    <div class={styles.stack}>
      <Card
        title="Primary — the brand tone"
        lead={
          <>
            The default action button (<code>variant="primary"</code>): plain{' '}
            <code>&lt;button&gt;</code> + CSS, no component library. White pill,
            no border, a shadow does the lifting; the icon carries the brand
            tone (orange in the current theme) and the whole pill
            <strong> fills with it on hover</strong> (label + icon go white).
            Press one to see the click <strong>ripple</strong> — the single spot
            we use JS for interaction (it needs the pointer coordinates). Tab to
            one for the focus ring.
          </>
        }
      >
        <div class={styles.row}>
          <Button icon={<PlusCircleIcon />}>New shipment</Button>
          <Button>Save changes</Button>
          <Button icon={<PlusCircleIcon />} disabled>
            Disabled
          </Button>
        </div>
      </Card>

      <Card
        title="Secondary — the action tone"
        lead={
          <>
            The same button, <code>variant="secondary"</code>: the action tone
            (blue in the current theme) for the app's edit/footer actions
            (Save, Delete, Cancel…). Fills with its tone on hover; the focus
            ring follows it too. Variants are named semantically — never after
            a colour — the palette lives only in the tokens.
          </>
        }
      >
        <div class={styles.row}>
          <Button variant="secondary" icon={<SaveIcon />}>
            Save
          </Button>
          <Button variant="secondary" icon={<TrashIcon />}>
            Delete
          </Button>
          <Button variant="secondary">Cancel</Button>
        </div>
      </Card>

      <Card
        title="Icon button — the icon IS the button"
        lead={
          <>
            A compact icon-only control (<code>&lt;IconButton&gt;</code>) for table toolbar
            controls, table row actions and panel actions — where a full labelled pill is too
            big. Plain <code>&lt;button&gt;</code> + CSS; since there's no visible text a{' '}
            <code>label</code> is required (drives aria-label + hover title).{' '}
            <code>bordered</code> gives an outlined box (reads as a button in a row);{' '}
            <code>variant="danger"</code> tones a destructive action; <code>size</code> is{' '}
            <code>small</code> for dense rows. Tab for the focus ring.
          </>
        }
      >
        <div class={styles.row}>
          {/* Bare (toolbar-style) */}
          <IconButton icon={<SettingsIcon />} label="Column settings" />
          <IconButton icon={<MaximiseIcon />} label="Full screen" />
          {/* Bordered row actions */}
          <IconButton bordered size="small" icon={<CopyIcon />} label="Duplicate" />
          <IconButton bordered size="small" variant="danger" icon={<TrashIcon />} label="Delete" />
          {/* Bordered medium + disabled */}
          <IconButton bordered icon={<SaveIcon />} label="Save" />
          <IconButton bordered icon={<TrashIcon />} label="Delete" variant="danger" disabled />
        </div>
      </Card>

      <Card
        title="Split button"
        lead={
          <>
            A primary action glued to a dropdown caret — no "split button"
            primitive exists, so we compose a plain <code>&lt;button&gt;</code>
            (runs the selected action) with a Kobalte <code>DropdownMenu</code>{' '}
            (the caret's menu buys the focus/keyboard/ARIA contract). Picking a
            format selects it <em>and</em> runs it, like the app's export
            selector. Each half ripples and fills independently.
          </>
        }
      >
        <div class={styles.row}>
          <SplitButton
            icon={<DownloadIcon />}
            options={EXPORT_OPTIONS}
            menuLabel="Export options"
            onAction={value => setLastExport(value)}
          />
        </div>
        <p class={styles.note}>
          <Show when={lastExport()} fallback="Click the button or pick a format…">
            {value => (
              <>
                Last export ran as <strong>{value().toUpperCase()}</strong>.
              </>
            )}
          </Show>
        </p>
      </Card>
    </div>
  )
}

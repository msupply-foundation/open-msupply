import { createSignal, Show, type JSX } from 'solid-js'
import { Button } from '../components/ui/Button'
import { SplitButton } from '../components/ui/SplitButton'
import {
  PlusCircleIcon,
  DownloadIcon,
  SaveIcon,
  TrashIcon,
} from '../components/icons'
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
        title="Primary — brand orange"
        lead={
          <>
            The default action button: plain <code>&lt;button&gt;</code> + CSS,
            no component library. White pill, no border, a shadow does the
            lifting; the icon carries the brand orange and the whole pill
            <strong> fills orange on hover</strong> (label + icon go white).
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
        title="Secondary — action blue"
        lead={
          <>
            The same button, <code>color="blue"</code>: action blue instead of
            brand orange, for the app's edit/footer actions (Save, Delete,
            Cancel…). Fills blue on hover; the focus ring follows the tone too.
          </>
        }
      >
        <div class={styles.row}>
          <Button color="blue" icon={<SaveIcon />}>
            Save
          </Button>
          <Button color="blue" icon={<TrashIcon />}>
            Delete
          </Button>
          <Button color="blue">Cancel</Button>
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

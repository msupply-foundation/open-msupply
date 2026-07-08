import { createSignal, For, Show, type JSX } from 'solid-js'
import { ContentFooter } from '../components/layout/ContentFooter/ContentFooter'
import { ContentFooterActions } from '../components/layout/ContentFooter/ContentFooterActions'
import { Button } from '../components/ui/Button'
import {
  ClockIcon,
  CopyIcon,
  MinusCircleIcon,
  SaveIcon,
  TrashIcon,
  XCircleIcon,
} from '../components/icons'
import styles from './ContentFooterShowcase.module.css'

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

const DEMO_ROWS = ['OS-001024', 'OS-001025', 'OS-001026']

export const ContentFooterShowcase = () => {
  const [picked, setPicked] = createSignal<ReadonlySet<string>>(new Set())
  const toggle = (id: string) =>
    setPicked((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  const clear = () => setPicked(new Set<string>())

  return (
    <div class={styles.stack}>
      <Card
        title="Detail-page bar — History / Cancel / Save"
        lead={
          <>
            The pinned action bar from last week's demo (the current app's blue
            bar above the orange footer). <code>&lt;ContentFooter&gt;</code> is
            pure layout with zero state, the same contract as{' '}
            <code>&lt;Header&gt;</code>: loose children flow from the
            inline-start edge, and <code>&lt;ContentFooterActions&gt;</code>{' '}
            pins the button cluster inline-end. The page owns every handler
            (Save's confirm dialog arrives with the Feedback components).
            Inside the app it pins between the scrolling body and the app
            footer via the Page frame's <code>contentFooter</code> slot — see
            the Outbound Shipments page in the Full page group.
          </>
        }
      >
        <div class={styles.pageFrame}>
          <div class={styles.pageBody} aria-hidden="true" />
          <ContentFooter>
            <Button variant="secondary" icon={<ClockIcon />}>
              History
            </Button>
            <ContentFooterActions>
              <Button variant="secondary" icon={<XCircleIcon />}>
                Cancel
              </Button>
              <Button variant="secondary" icon={<SaveIcon />}>
                Save
              </Button>
            </ContentFooterActions>
          </ContentFooter>
        </div>
      </Card>

      <Card
        title="Contextual content — one bar, two contexts"
        lead={
          <>
            The bar's content is contextual <em>by composition</em>, not by a
            store: when a page has a selection it swaps the bar's children for
            "N selected" + selection actions, so two rows of blue buttons never
            stack (Carl's rule from the prototype week). Tick rows below to
            watch the same bar change modes — the swap is a plain{' '}
            <code>&lt;Show&gt;</code> in the page.
          </>
        }
      >
        <div class={styles.pageFrame}>
          <ul class={styles.demoRows}>
            <For each={DEMO_ROWS}>
              {(id) => (
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
                  <Button variant="secondary" icon={<ClockIcon />}>
                    History
                  </Button>
                  <ContentFooterActions>
                    <Button variant="secondary" icon={<XCircleIcon />}>
                      Cancel
                    </Button>
                    <Button variant="secondary" icon={<SaveIcon />}>
                      Save
                    </Button>
                  </ContentFooterActions>
                </>
              }
            >
              <span class={styles.count}>{picked().size} selected</span>
              <ContentFooterActions>
                <Button variant="secondary" icon={<TrashIcon />} onClick={clear}>
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
        </div>
      </Card>
    </div>
  )
}

import { createSignal, Show, type JSX } from 'solid-js';
import { Button } from '../ui/elements/buttons/Button';
import { CheckboxButton } from '../ui/elements/buttons/CheckboxButton';
import { IconButton } from '../ui/elements/buttons/IconButton';
import { SplitButton } from '../ui/elements/buttons/SplitButton';
import {
  PlusCircleIcon,
  DownloadIcon,
  SaveIcon,
  TrashIcon,
  CopyIcon,
  SettingsIcon,
  MaximiseIcon,
} from '../ui/icons';
import styles from './ButtonsShowcase.module.css';

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

const EXPORT_OPTIONS = [
  { value: 'csv', label: 'Export CSV' },
  { value: 'excel', label: 'Export Excel' },
];

const STATUS_OPTIONS = [
  { value: 'allocated', label: 'Confirm Allocated' },
  { value: 'picked', label: 'Confirm Picked' },
  { value: 'shipped', label: 'Confirm Shipped' },
];

export const ButtonsShowcase = () => {
  const [lastExport, setLastExport] = createSignal<string | null>(null);
  const [pendingStatus, setPendingStatus] = createSignal('allocated');
  const [confirmedStatus, setConfirmedStatus] = createSignal<string | null>(
    null
  );
  const [onHold, setOnHold] = createSignal(false);

  return (
    <div class={styles.stack}>
      <Card
        title="Primary — the main action"
        lead={
          <>
            The default action button (<code>variant="primary"</code>): plain{' '}
            <code>&lt;button&gt;</code> + CSS, no component library. Flat, a{' '}
            <strong>solid action-blue fill</strong> (ui-standards) — the single
            most important action on a page or dialog. Most views have{' '}
            <strong>one</strong>. Hover darkens and lifts it slightly. Press one
            to see the click <strong>ripple</strong> — the single spot we use JS
            for interaction (it needs the pointer coordinates). Tab to one for
            the focus ring. Variants are named semantically — never after a
            colour — the palette lives only in the tokens.
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
        title="Secondary — supporting actions"
        lead={
          <>
            <code>variant="secondary"</code>: an <strong>outlined</strong>{' '}
            button for actions that sit alongside a primary — Print, Export,
            Cancel, Edit. A hairline edge at rest; hover recolours the edge and
            label to the action tone. Use when there's a primary present;
            promote it to primary if it's the only action.
          </>
        }
      >
        <div class={styles.row}>
          <Button variant="secondary" icon={<SaveIcon />}>
            Print
          </Button>
          <Button variant="secondary" icon={<DownloadIcon />}>
            Export
          </Button>
          <Button variant="secondary">Cancel</Button>
          <Button variant="secondary" disabled>
            Disabled
          </Button>
        </div>
      </Card>

      <Card
        title="Ghost — low-priority & inline"
        lead={
          <>
            <code>variant="ghost"</code>: text only, carrying the brand tone,
            with a faint tint on hover. Its home is inline table actions,
            overflow menus, and dialogs where space is tight — anywhere a
            bordered button would be too heavy. Avoid it as the only action on a
            view (users may not read it as interactive).
          </>
        }
      >
        <div class={styles.row}>
          <Button variant="ghost">View details</Button>
          <Button variant="ghost" icon={<CopyIcon />}>
            Duplicate
          </Button>
          <Button variant="ghost" size="small">
            Edit
          </Button>
          <Button variant="ghost" disabled>
            Disabled
          </Button>
        </div>
      </Card>

      <Card
        title="Danger — the high-caution action"
        lead={
          <>
            <code>variant="danger"</code>: a filled{' '}
            <strong>brand-orange</strong> tone for actions to be careful with —
            Delete, Remove, Void. It's a "stop and think" accent, <em>not</em> a
            hard error-red (it reuses the brand tone, matching the standard's
            own CSS). Never adjacent to a primary without a spacer. Ghost and
            danger share the orange but read differently by weight — text vs
            fill.
          </>
        }
      >
        <div class={styles.row}>
          <Button variant="danger" icon={<TrashIcon />}>
            Delete shipment
          </Button>
          <Button variant="danger" disabled>
            Disabled
          </Button>
        </div>
      </Card>

      <Card
        title="Sizes"
        lead={
          <>
            Two sizes (ui-standards #btn-sizes): <code>medium</code> (default,
            36px) for page and toolbar actions, <code>size="small"</code> (28px)
            for dense tables and compact panels. At tablet widths (≤1023px)
            medium grows to the 48px touch target automatically — resize the
            window to see it; small is the deliberate exception.
          </>
        }
      >
        <div class={styles.row}>
          <Button icon={<SaveIcon />}>Medium</Button>
          <Button size="small" icon={<SaveIcon />}>
            Small
          </Button>
        </div>
      </Card>

      <Card
        title="States"
        lead={
          <>
            The interaction states (ui-standards #btn-states).{' '}
            <strong>Hover</strong> any button to see it darken/lift;{' '}
            <strong>tab</strong> to one for the real focus ring. The{' '}
            <em>Focus</em> swatch below is shown statically for reference.{' '}
            <code>loading</code> swaps the icon for a spinner and blocks
            re-firing while staying at full opacity (busy, not disabled);{' '}
            <code>disabled</code> dims to 38% but stays visible.
          </>
        }
      >
        <div class={styles.row}>
          <Button>Default</Button>
          <Button class={styles.focusDemo}>Focus</Button>
          <Button loading>Saving…</Button>
          <Button disabled>Disabled</Button>
        </div>
      </Card>

      <Card
        title="Icon button — the icon IS the button"
        lead={
          <>
            A compact icon-only control (<code>&lt;IconButton&gt;</code>) for
            table toolbar controls, table row actions and panel actions — where
            a full labelled pill is too big. Plain <code>&lt;button&gt;</code> +
            CSS; since there's no visible text a <code>label</code> is required
            (drives aria-label + hover title). <code>bordered</code> gives an
            outlined box (reads as a button in a row);{' '}
            <code>variant="danger"</code> tones a destructive action;{' '}
            <code>size</code> is <code>small</code> for dense rows. Tab for the
            focus ring.
          </>
        }
      >
        <div class={styles.row}>
          {/* Bare (toolbar-style) */}
          <IconButton icon={<SettingsIcon />} label="Column settings" />
          <IconButton icon={<MaximiseIcon />} label="Full screen" />
          {/* Bordered row actions */}
          <IconButton
            bordered
            size="small"
            icon={<CopyIcon />}
            label="Duplicate"
          />
          <IconButton
            bordered
            size="small"
            variant="danger"
            icon={<TrashIcon />}
            label="Delete"
          />
          {/* Bordered medium + disabled */}
          <IconButton bordered icon={<SaveIcon />} label="Save" />
          <IconButton
            bordered
            icon={<TrashIcon />}
            label="Delete"
            variant="danger"
            disabled
          />
        </div>
      </Card>

      <Card
        title="Split button"
        lead={
          <>
            A primary action glued to a dropdown caret — no "split button"
            primitive exists, so we compose a plain <code>&lt;button&gt;</code>
            (runs the selected action) with a Kobalte <code>
              DropdownMenu
            </code>{' '}
            (the caret's menu buys the focus/keyboard/ARIA contract). Picking a
            format selects it <em>and</em> runs it, like the app's export
            selector. Each half ripples and lights up independently. Same flat
            language as <code>&lt;Button&gt;</code>; this one is{' '}
            <code>variant="secondary"</code> (outlined), the toolbar-export tone
            from the standard.
          </>
        }
      >
        <div class={styles.row}>
          <SplitButton
            variant="secondary"
            icon={<DownloadIcon />}
            options={EXPORT_OPTIONS}
            menuLabel="Export options"
            onAction={value => setLastExport(value)}
          />
        </div>
        <p class={styles.note}>
          <Show
            when={lastExport()}
            fallback="Click the button or pick a format…"
          >
            {value => (
              <>
                Last export ran as <strong>{value().toUpperCase()}</strong>.
              </>
            )}
          </Show>
        </p>
      </Card>

      <Card
        title="Split button — select-then-confirm (menuSelectsOnly)"
        lead={
          <>
            The other split-button contract (the app's status-change button): a
            menu pick only <em>re-targets</em> the main action — the label
            updates, nothing runs until the main half is clicked. Pass{' '}
            <code>menuSelectsOnly</code> +<code>onValueChange</code>; the
            default (pick = run) stays for export-style menus. Shown in the
            default <code>primary</code> tone (filled blue), for contrast with
            the outlined export split above.
          </>
        }
      >
        <div class={styles.row}>
          <SplitButton
            icon={<SaveIcon />}
            options={STATUS_OPTIONS}
            value={pendingStatus()}
            menuSelectsOnly
            onValueChange={setPendingStatus}
            menuLabel="Change status"
            onAction={value => setConfirmedStatus(value)}
          />
        </div>
        <p class={styles.note}>
          <Show
            when={confirmedStatus()}
            fallback="Pick a status from the caret — it only re-targets; the main button confirms."
          >
            {value => (
              <>
                Confirmed <strong>{value().toUpperCase()}</strong>.
              </>
            )}
          </Show>
        </p>
      </Card>

      <Card
        title="Checkbox button — a pill that IS a checkbox"
        lead={
          <>
            A <code>&lt;label&gt;</code> pill wrapping a visually-hidden{' '}
            <strong>
              native <code>&lt;input type="checkbox"&gt;</code>
            </strong>{' '}
            — semantics, Space toggling, and the e2e contract's{' '}
            <code>input[type=checkbox]</code> hook come free; the focus ring is
            drawn on the pill via <code>:has()</code>. The caller owns{' '}
            <code>checked</code>. Disabled renders dimmed, never hidden.
          </>
        }
      >
        <div class={styles.row}>
          <CheckboxButton checked={onHold()} onChange={setOnHold}>
            Hold
          </CheckboxButton>
          <CheckboxButton checked disabled onChange={() => {}}>
            Hold (disabled)
          </CheckboxButton>
        </div>
        <p class={styles.note}>
          The shipment is {onHold() ? 'on hold' : 'not on hold'}.
        </p>
      </Card>
    </div>
  );
};

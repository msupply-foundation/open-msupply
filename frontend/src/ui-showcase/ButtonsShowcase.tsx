import { createSignal, Show } from 'solid-js';
import { CardGrid } from '../ui/layout/CardGrid/CardGrid';
import { Stack } from '../ui/layout/Stack/Stack';
import { DashboardCard } from '../ui/elements/dashboard/DashboardCard';
import { Button } from '../ui/elements/buttons/Button';
import { CheckboxButton } from '../ui/elements/buttons/CheckboxButton';
import { IconButton } from '../ui/elements/buttons/IconButton';
import { SplitButton } from '../ui/elements/buttons/SplitButton';
import {
  OkButton,
  CancelButton,
  SaveButton,
  DialogSaveButton,
  SaveAndNextButton,
} from '../ui/elements/buttons/StandardButtons';
import { CopyToClipboardButton } from '../ui/elements/buttons/CopyToClipboardButton';
import {
  PlusCircleIcon,
  DownloadIcon,
  SaveIcon,
  TrashIcon,
  CopyIcon,
  SettingsIcon,
  MaximiseIcon,
} from '../ui/icons';
import { Lead, Note, Row, SectionTOC } from './common';
import type { PageMetadata } from './metadata';
import styles from './ButtonsShowcase.module.css';

const EXPORT_OPTIONS = [
  { value: 'csv', label: 'Export CSV' },
  { value: 'excel', label: 'Export Excel' },
];

const STATUS_OPTIONS = [
  { value: 'allocated', label: 'Confirm Allocated' },
  { value: 'picked', label: 'Confirm Picked' },
  { value: 'shipped', label: 'Confirm Shipped' },
];

export const buttonsMetadata: PageMetadata = {
  id: 'buttons',
  title: 'Buttons',
  searchTerms: ['action', 'click', 'cta'],
  items: [
    {
      id: 'buttons-standard',
      title: 'Standard buttons',
      searchTerms: ['ok', 'save', 'cancel', 'preset', 'pre-composed'],
    },
    {
      id: 'buttons-copy',
      title: 'Copy to clipboard',
      searchTerms: ['copy', 'clipboard', 'json', 'record action'],
    },
    {
      id: 'buttons-variants',
      title: 'Variants',
      searchTerms: ['primary', 'secondary', 'ghost', 'danger', 'tone'],
    },
    {
      id: 'buttons-sizes-states',
      title: 'Sizes, states & collapsing',
      searchTerms: ['size', 'small', 'disabled', 'loading', 'collapsible'],
    },
    {
      id: 'buttons-icon',
      title: 'Icon button',
      searchTerms: ['icon', 'glyph', 'icon-only'],
    },
    {
      id: 'buttons-split',
      title: 'Split buttons',
      searchTerms: ['split', 'menu', 'dropdown', 'caret'],
    },
    {
      id: 'buttons-split-feedback',
      title: 'Split button — busy & outcome',
      searchTerms: [
        'loading',
        'spinner',
        'busy',
        'success',
        'failed',
        'action feedback',
      ],
    },
    {
      id: 'buttons-checkbox',
      title: 'Checkbox button',
      searchTerms: ['checkbox', 'toggle', 'pill'],
    },
  ],
};

export const ButtonsShowcase = () => {
  const [lastExport, setLastExport] = createSignal<string | null>(null);
  const [pendingStatus, setPendingStatus] = createSignal('allocated');
  const [confirmedStatus, setConfirmedStatus] = createSignal<string | null>(
    null
  );
  const [onHold, setOnHold] = createSignal(false);
  const [lastStandard, setLastStandard] = createSignal<string | null>(null);

  // Demo of the busy → outcome cycle: CSV "succeeds", Excel "fails", each
  // after a beat so the spinner is visible.
  const [demoBusy, setDemoBusy] = createSignal(false);
  const [demoOutcome, setDemoOutcome] = createSignal<'done' | 'failed'>();
  const runDemoExport = (format: string) => {
    if (demoBusy()) return;
    setDemoBusy(true);
    setTimeout(() => {
      setDemoBusy(false);
      setDemoOutcome(format === 'excel' ? 'failed' : 'done');
      setTimeout(() => setDemoOutcome(undefined), 2000);
    }, 1200);
  };

  return (
    <Stack gap="lg">
      <SectionTOC page={buttonsMetadata} />
      <CardGrid minColumnWidth="32rem" maxColumnWidth="40rem">
        <DashboardCard
          id="buttons-standard"
          title="Standard buttons — pre-composed for common actions"
        >
          <Lead>
            The handful of actions that recur in nearly every dialog and form,
            wrapped once so you don't re-decide the tone or label each time:{' '}
            <code>&lt;OkButton&gt;</code>, <code>&lt;CancelButton&gt;</code>,{' '}
            <code>&lt;SaveButton&gt;</code>,{' '}
            <code>&lt;DialogSaveButton&gt;</code>, and{' '}
            <code>&lt;SaveAndNextButton&gt;</code>. Each fixes its own{' '}
            <strong>variant + label</strong> (labels come from the shared intl
            catalog, so they translate); everything else a <code>Button</code>{' '}
            takes — <code>onClick</code>, <code>disabled</code>,{' '}
            <code>loading</code>, <code>size</code> — passes through. Reach for
            these first; drop to the raw variants below only when you need a
            different label or tone. <code>Save</code> carries the icon and{' '}
            <strong>collapses to icon-only on phones</strong> — resize below
            768px to see it; <code>DialogSaveButton</code>/
            <code>SaveAndNextButton</code> are the icon-less dialog-footer forms
            (ui-standards › controls § dialogs).
          </Lead>
          <Row>
            <OkButton onClick={() => setLastStandard('OK')} />
            <CancelButton onClick={() => setLastStandard('Cancel')} />
            <SaveButton onClick={() => setLastStandard('Save')} />
            <DialogSaveButton
              onClick={() => setLastStandard('Save (dialog footer)')}
            />
            <SaveAndNextButton onClick={() => setLastStandard('Save & next')} />
          </Row>
          <Note>
            <Show
              when={lastStandard()}
              fallback="Click one of the standard buttons…"
            >
              {value => (
                <>
                  You clicked <strong>{value()}</strong>.
                </>
              )}
            </Show>
          </Note>
        </DashboardCard>

        <DashboardCard
          id="buttons-copy"
          title="Copy to clipboard — the record action"
        >
          <Lead>
            The one implementation of ui-standards › controls § copy to
            clipboard, used by every detail side panel that offers the action.
            You pass <code>load</code> — a supplier of the{' '}
            <strong>whole record</strong> (a node the screen already holds, or
            its own unpaginated fetch where the row table is server-paged) — and
            the button owns the rest: indented JSON, the clipboard write, and
            the outcome reported <strong>in place</strong> (the label and icon
            swap to <em>Copied</em> or <em>Copy failed</em> for a moment,
            announced via <code>aria-live</code>) — never a toast. Copy is a{' '}
            <strong>read</strong>, so it takes no status or permission gate.
          </Lead>
          <Row>
            <CopyToClipboardButton
              load={() => ({
                invoiceNumber: 12,
                status: 'NEW',
                lines: [{ itemName: 'Amoxicillin 500mg', numberOfPacks: 4 }],
              })}
            />
            {/* A supplier that refuses, to show the failure report in place. */}
            <CopyToClipboardButton
              load={() => Promise.reject(new Error('demo failure'))}
            />
          </Row>
          <Note>
            The second button's supplier throws — the copy reports{' '}
            <em>Copy failed</em> in the same slot rather than silently doing
            nothing.
          </Note>
        </DashboardCard>

        <DashboardCard id="buttons-variants" title="Primary — the main action">
          <Lead>
            The default action button (<code>variant="primary"</code>): plain{' '}
            <code>&lt;button&gt;</code> + CSS, no component library. Flat, a{' '}
            <strong>solid action-blue fill</strong> (ui-standards) — the single
            most important action on a page or dialog. Most views have{' '}
            <strong>one</strong>. Hover darkens and lifts it slightly. Press one
            to see the click <strong>ripple</strong> — the single spot we use JS
            for interaction (it needs the pointer coordinates). Tab to one for
            the focus ring. Variants are named semantically — never after a
            colour — the palette lives only in the tokens.
          </Lead>
          <Row>
            <Button icon={<PlusCircleIcon />}>New shipment</Button>
            <Button>Save changes</Button>
            <Button icon={<PlusCircleIcon />} disabled>
              Disabled
            </Button>
          </Row>
        </DashboardCard>

        <DashboardCard title="Secondary — supporting actions">
          <Lead>
            <code>variant="secondary"</code>: an <strong>outlined</strong>{' '}
            button for actions that sit alongside a primary — Print, Export,
            Cancel, Edit. A hairline edge at rest; hover recolours the edge and
            label to the action tone. Use when there's a primary present;
            promote it to primary if it's the only action.
          </Lead>
          <Row>
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
          </Row>
        </DashboardCard>

        <DashboardCard title="Ghost — low-priority & inline">
          <Lead>
            <code>variant="ghost"</code>: text only, in the{' '}
            <strong>action-blue</strong> tone (ui-standards — ghost shares
            primary's blue), with a faint tint on hover. Its home is inline
            table actions, overflow menus, and dialogs where space is tight —
            anywhere a bordered button would be too heavy. Avoid it as the only
            action on a view (users may not read it as interactive).
          </Lead>
          <Row>
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
          </Row>
          <Note>
            The <strong>Edit</strong> button here is the{' '}
            <code>size="small"</code> variant (the dense/inline size) — the
            others are the default medium.
          </Note>
        </DashboardCard>

        <DashboardCard title="Danger — the high-caution action">
          <Lead>
            <code>variant="danger"</code>: a filled{' '}
            <strong>brand-orange</strong> tone for actions to be careful with —
            Delete, Remove, Void. It's a "stop and think" accent, <em>not</em> a
            hard error-red (it reuses the brand tone, matching the standard's
            own CSS). Never adjacent to a primary without a spacer. It's the{' '}
            <strong>one orange-toned variant</strong> — so the only one whose
            focus ring is orange rather than the app-wide blue.
          </Lead>
          <Row>
            <Button variant="danger" icon={<TrashIcon />}>
              Delete shipment
            </Button>
            <Button variant="danger" disabled>
              Disabled
            </Button>
          </Row>
        </DashboardCard>

        <DashboardCard id="buttons-sizes-states" title="Sizes">
          <Lead>
            Two sizes (ui-standards #btn-sizes): <code>medium</code> (default,
            36px) for page and toolbar actions, <code>size="small"</code> (28px)
            for dense tables and compact panels. At tablet widths (≤1023px)
            medium grows to the 48px touch target automatically — resize the
            window to see it; small is the deliberate exception.
          </Lead>
          <Row>
            <Button icon={<SaveIcon />}>Medium</Button>
            <Button size="small" icon={<SaveIcon />}>
              Small
            </Button>
          </Row>
        </DashboardCard>

        <DashboardCard title="States">
          <Lead>
            The interaction states (ui-standards #btn-states).{' '}
            <strong>Hover</strong> any button to see it darken/lift;{' '}
            <strong>tab</strong> to one for the real focus ring. The{' '}
            <em>Focus</em> swatch below is shown statically for reference.{' '}
            <code>loading</code> swaps the icon for a spinner and blocks
            re-firing while staying at full opacity (busy, not disabled);{' '}
            <code>disabled</code> dims to 38% but stays visible.
          </Lead>
          <Row>
            <Button>Default</Button>
            <Button class={styles.focusDemo}>Focus</Button>
            <Button loading>Saving…</Button>
            <Button disabled>Disabled</Button>
          </Row>
        </DashboardCard>

        <DashboardCard title="Collapsible — icon-only on phones">
          <Lead>
            Opt-in with <code>collapsible</code> (ui-standards #btn-icons): at
            phone widths (≤767px) the button sheds its label down to just the
            icon, to save toolbar space.{' '}
            <strong>Resize the window below 768px</strong> to see the first two
            collapse; the third (no <code>collapsible</code>) keeps its label.
            Only use it on buttons with an <code>icon</code>; the label stays as
            the accessible name. Default is off app-wide — one constant flips it
            later.
          </Lead>
          <Row>
            <Button collapsible icon={<PlusCircleIcon />}>
              New shipment
            </Button>
            <Button collapsible variant="secondary" icon={<DownloadIcon />}>
              Export
            </Button>
            <Button icon={<SaveIcon />}>Save changes</Button>
          </Row>
        </DashboardCard>

        <DashboardCard
          id="buttons-icon"
          title="Icon button — the icon IS the button"
        >
          <Lead>
            A compact icon-only control (<code>&lt;IconButton&gt;</code>) for
            table toolbar controls, table row actions and panel actions — where
            a full labelled pill is too big. Plain <code>&lt;button&gt;</code> +
            CSS; since there's no visible text a <code>label</code> is required
            (drives aria-label + hover title). <code>bordered</code> gives an
            outlined box (reads as a button in a row);{' '}
            <code>variant="danger"</code> tones a destructive action;{' '}
            <code>size</code> is <code>small</code> for dense rows. Tab for the
            focus ring.
          </Lead>
          <Row>
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
          </Row>
        </DashboardCard>

        <DashboardCard id="buttons-split" title="Split button">
          <Lead>
            A primary action glued to a dropdown caret — no "split button"
            primitive exists, so we compose a plain <code>&lt;button&gt;</code>
            (runs the selected action) with a Kobalte <code>
              DropdownMenu
            </code>{' '}
            (the caret's menu buys the focus/keyboard/ARIA contract). Picking a
            format selects it <em>and</em> runs it, like the app's export
            selector. Each half ripples and lights up independently. Same flat
            language as <code>&lt;Button&gt;</code>, shown here in both{' '}
            <code>primary</code> (filled) and <code>secondary</code> (outlined)
            — the variant is independent of the pick-behaviour.
          </Lead>
          <Row>
            <SplitButton
              icon={<DownloadIcon />}
              options={EXPORT_OPTIONS}
              menuLabel="Export options"
              onAction={value => setLastExport(value)}
            />
            <SplitButton
              variant="secondary"
              icon={<DownloadIcon />}
              options={EXPORT_OPTIONS}
              menuLabel="Export options"
              onAction={value => setLastExport(value)}
            />
          </Row>
          <Note>
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
          </Note>
        </DashboardCard>

        <DashboardCard title="Split button — select-then-confirm (menuSelectsOnly)">
          <Lead>
            The other split-button contract (the app's status-change button): a
            menu pick only <em>re-targets</em> the main action — the label
            updates, nothing runs until the main half is clicked. Pass{' '}
            <code>menuSelectsOnly</code> +<code>onValueChange</code>; the
            default (pick = run) stays for export-style menus. Again in both{' '}
            <code>primary</code> and <code>secondary</code> — the tone is
            independent of the behaviour.
          </Lead>
          <Row>
            <SplitButton
              icon={<SaveIcon />}
              options={STATUS_OPTIONS}
              value={pendingStatus()}
              menuSelectsOnly
              onValueChange={setPendingStatus}
              menuLabel="Change status"
              onAction={value => setConfirmedStatus(value)}
            />
            <SplitButton
              variant="secondary"
              icon={<SaveIcon />}
              options={STATUS_OPTIONS}
              value={pendingStatus()}
              menuSelectsOnly
              onValueChange={setPendingStatus}
              menuLabel="Change status"
              onAction={value => setConfirmedStatus(value)}
            />
          </Row>
          <Note>
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
          </Note>
        </DashboardCard>

        <DashboardCard
          id="buttons-split-feedback"
          title="Split button — busy & outcome (loading / mainLabel)"
        >
          <Lead>
            An async split action reports IN PLACE, never as a toast (
            <code>spec/ui-standards/controls.md</code> § action feedback).{' '}
            <code>loading</code> swaps the main half's icon for a spinner and
            makes <em>both</em> halves inert, so the action can't re-fire from
            either; <code>mainLabel</code> then briefly overrides the main
            half's label with the outcome — the menu entries keep their own
            labels throughout. The main half is <code>aria-live="polite"</code>,
            so the swap is announced. Try both: CSV succeeds, Excel fails.{' '}
            <code>domain/reportFiles/ListExportAction</code> is the real
            consumer — it pairs the failure flash with a dialog carrying the
            message, so a failed export is diagnosable rather than a dead click.
          </Lead>
          <Row>
            <SplitButton
              icon={
                demoOutcome() === 'done' ? (
                  <SaveIcon />
                ) : demoOutcome() === 'failed' ? (
                  <TrashIcon />
                ) : (
                  <DownloadIcon />
                )
              }
              options={EXPORT_OPTIONS}
              menuLabel="Export options"
              loading={demoBusy()}
              mainLabel={
                demoOutcome() === 'done'
                  ? 'Exported'
                  : demoOutcome() === 'failed'
                    ? 'Export failed'
                    : undefined
              }
              onAction={runDemoExport}
            />
            <SplitButton
              variant="secondary"
              icon={<DownloadIcon />}
              options={EXPORT_OPTIONS}
              menuLabel="Export options"
              loading={demoBusy()}
              mainLabel={
                demoOutcome() === 'done'
                  ? 'Exported'
                  : demoOutcome() === 'failed'
                    ? 'Export failed'
                    : undefined
              }
              onAction={runDemoExport}
            />
          </Row>
          <Note>
            <Show
              when={demoBusy()}
              fallback="Click the main half (succeeds) or pick Excel from the caret (fails)."
            >
              Working… both halves are inert until it settles.
            </Show>
          </Note>
        </DashboardCard>

        <DashboardCard
          id="buttons-checkbox"
          title="Checkbox button — a pill that IS a checkbox"
        >
          <Lead>
            A <code>&lt;label&gt;</code> pill wrapping a visually-hidden{' '}
            <strong>
              native <code>&lt;input type="checkbox"&gt;</code>
            </strong>{' '}
            — semantics, Space toggling, and the e2e contract's{' '}
            <code>input[type=checkbox]</code> hook come free; the focus ring is
            drawn on the pill via <code>:has()</code>. The caller owns{' '}
            <code>checked</code>. Disabled renders dimmed, never hidden.
          </Lead>
          <Row>
            <CheckboxButton checked={onHold()} onChange={setOnHold}>
              Hold
            </CheckboxButton>
            <CheckboxButton checked disabled onChange={() => {}}>
              Hold (disabled)
            </CheckboxButton>
          </Row>
          <Note>The shipment is {onHold() ? 'on hold' : 'not on hold'}.</Note>
        </DashboardCard>
      </CardGrid>
    </Stack>
  );
};

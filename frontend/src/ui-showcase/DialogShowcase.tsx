import { createSignal, For, Show } from 'solid-js';
import { ContentContainer } from '../ui/layout/ContentContainer/ContentContainer';
import { Stack } from '../ui/layout/Stack/Stack';
import { DashboardCard } from '../ui/elements/dashboard/DashboardCard';
import { Alert } from '../ui/elements/feedback/Alert';
import { Dialog } from '../ui/elements/feedback/Dialog';
import { ConfirmDialog } from '../ui/elements/feedback/ConfirmDialog';
import {
  ErrorDialog,
  type ErrorDialogCondition,
} from '../ui/elements/feedback/ErrorDialog';
import { Button } from '../ui/elements/buttons/Button';
import { FormColumns } from '../ui/layout/Form/FormColumns';
import { FormColumn } from '../ui/layout/Form/FormColumn';
import { FormSection } from '../ui/layout/Form/FormSection';
import { TextField } from '../ui/elements/inputs/TextField';
import {
  StoreSelector,
  type StoreOption,
} from '../ui/elements/selectors/StoreSelector';
import {
  CancelButton,
  SaveButton,
  DialogSaveButton,
} from '../ui/elements/buttons/StandardButtons';
import { PlusCircleIcon } from '../ui/icons';
import { Lead, Note, Row, SectionTOC } from './common';
import type { PageMetadata } from './metadata';
import styles from './DialogShowcase.module.css';

/* A stand-in line list for the large "workbench" dialog — enough rows that the
   body overflows and scrolls internally while the header/footer/actions stay
   pinned (the real line-edit modal hosts a DataTable here). */
const WORKBENCH_ROWS = Array.from({ length: 24 }, (_, i) => ({
  code: `ITM-${1001 + i}`,
  name: `Amoxicillin ${250 + i * 25}mg capsules`,
  packs: (i * 7) % 40,
}));

// The two R&D-dataset stores (see the docker sqlite image) plus a few more, so
// the demo reads like the real thing and the list scrolls.
const STORES: StoreOption[] = [
  {
    id: 'AFCA0C9F0743AB43B779FB9EA2E64EAF',
    code: 'Liquica-store',
    name: 'SMS Liquica Store',
  },
  {
    id: '5B28901C52396E4BB098B9862CCF5DF9',
    code: 'chc_ermera',
    name: 'CHC Ermera',
  },
  { id: 'demo-3', code: 'dili-central', name: 'Dili Central Warehouse' },
  { id: 'demo-4', code: 'baucau-hp', name: 'Baucau Health Post' },
  { id: 'demo-5', code: 'maliana-rh', name: 'Maliana Referral Hospital' },
  // Accented names, and enough rows to cross the 7-store search threshold —
  // together they exercise the accent-insensitive match (typing `depot` finds
  // `Dépôt Régional`, OMS-REG-LGN-02.33), which is exactly what a list of
  // unaccented demo names could never show.
  { id: 'demo-6', code: 'depot-reg', name: 'Dépôt Régional' },
  { id: 'demo-7', code: 'cs-menara', name: 'Centre de Santé el Menara' },
  { id: 'demo-8', code: 'zenith-1', name: 'Myanmar Zenith Store 1' },
];

export const dialogMetadata: PageMetadata = {
  id: 'dialog',
  title: 'Dialog / Modal',
  searchTerms: ['modal', 'popup', 'overlay'],
  items: [
    {
      id: 'dialog-confirm',
      title: 'Confirm dialog',
      searchTerms: ['are you sure', 'yes', 'no', 'confirmation'],
    },
    {
      id: 'dialog-custom',
      title: 'Custom dialog',
      searchTerms: ['content', 'footer', 'actions'],
    },
    {
      id: 'dialog-widths',
      title: 'Width presets',
      searchTerms: ['measure', 'form width', 'prose', 'wide', 'width'],
    },
    {
      id: 'dialog-large',
      title: 'Large workbench dialog',
      searchTerms: ['wide', 'edit lines', 'size large'],
    },
    {
      id: 'dialog-sizes',
      title: 'All sizes × screen width',
      searchTerms: [
        'responsive',
        'full screen',
        'fullscreen',
        'tablet',
        'size full',
        'sheet',
        'breakpoint',
        'matrix',
      ],
    },
    {
      id: 'dialog-store-selector',
      title: 'Store selector',
      searchTerms: ['store', 'blocking', 'choose'],
    },
    {
      id: 'dialog-errors',
      title: 'Error dialogs',
      searchTerms: [
        'error',
        'offline',
        'timeout',
        'server error',
        'show details',
        'retry',
        'unexpected',
        'oops',
      ],
    },
  ],
};

export const DialogShowcase = () => {
  const [confirmOpen, setConfirmOpen] = createSignal(false);
  const [dangerOpen, setDangerOpen] = createSignal(false);
  const [outcome, setOutcome] = createSignal('');
  const [dialogOpen, setDialogOpen] = createSignal(false);
  // Which width preset the demo dialog is open at (undefined = closed).
  const [widthDemo, setWidthDemo] = createSignal<'prose' | 'form' | 'wide'>();
  const [workbenchOpen, setWorkbenchOpen] = createSignal(false);
  const [lines, setLines] = createSignal(WORKBENCH_ROWS);
  const addLine = () =>
    setLines(rows => [
      { code: `ITM-${1001 + rows.length}`, name: 'New line', packs: 0 },
      ...rows,
    ]);
  const [storeOpen, setStoreOpen] = createSignal(false);
  const [chosen, setChosen] = createSignal('');
  // Which error-dialog demo is open (undefined = closed); 'edit' is the
  // during-an-edit modifier on the unreachable condition.
  const [errorDemo, setErrorDemo] = createSignal<
    ErrorDialogCondition | 'edit'
  >();
  const [errorOutcome, setErrorOutcome] = createSignal('');
  const closeErrorDemo = (outcome: string) => {
    setErrorOutcome(outcome);
    setErrorDemo(undefined);
  };
  // The demo's condition: 'edit' shows the modifier on the unreachable
  // condition (the standard's own pairing); 'unknown' while closed is inert.
  const errorCondition = (): ErrorDialogCondition => {
    const demo = errorDemo();
    return demo === 'edit' ? 'unreachable' : (demo ?? 'unknown');
  };
  // Which sizing option the all-sizes matrix card has open (undefined = closed).
  const [sizeDemo, setSizeDemo] = createSignal<
    'default' | 'rem' | 'prose' | 'form' | 'wide' | 'large' | 'full'
  >();
  const demoMeasure = () => {
    const d = sizeDemo();
    return d === 'prose' || d === 'form' || d === 'wide' ? d : undefined;
  };
  const demoSize = () => {
    const d = sizeDemo();
    return d === 'large' || d === 'full' ? d : undefined;
  };

  return (
    <ContentContainer size="form" align="start">
      <Stack gap="lg">
        <SectionTOC page={dialogMetadata} />
        <DashboardCard
          id="dialog-confirm"
          title="Confirm dialog — Save → are you sure?"
        >
          <Lead>
            Native <code>&lt;dialog&gt;</code> + <code>showModal()</code>, no
            library — the platform gives the focus trap (top layer + inert
            page), focus restore, Escape and <code>::backdrop</code>; the RnD
            prototype bought Radix for exactly this contract, and the "hard to
            drive from React" objection doesn't exist in Solid. Scrim click and
            Escape both cancel. Watch focus return to the Save button on close.
            The confirm is <code>primary</code> by default; a destructive
            confirm passes <code>confirmVariant="danger"</code> — try Delete.
          </Lead>
          <Row>
            <SaveButton onClick={() => setConfirmOpen(true)} />
            <Button variant="secondary" onClick={() => setDangerOpen(true)}>
              Delete…
            </Button>
            <span class={styles.outcome} role="status">
              {outcome()}
            </span>
          </Row>
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
          <ConfirmDialog
            open={dangerOpen()}
            onClose={() => {
              setDangerOpen(false);
              setOutcome(o =>
                o === '' || o.startsWith('Cancelled') ? 'Cancelled.' : o
              );
            }}
            title="Delete shipment?"
            message="This permanently deletes the shipment and its lines — a destructive confirm, so the OK button is danger-toned."
            confirmLabel="Delete"
            confirmVariant="danger"
            onConfirm={() => setOutcome('Deleted ✓')}
          />
        </DashboardCard>

        <DashboardCard
          id="dialog-custom"
          title="Dialog — custom content, footer and actions"
        >
          <Lead>
            The base <code>&lt;Dialog&gt;</code> takes a required{' '}
            <code>title</code> (its accessible name), optional icon /
            description, free-form children, an optional bottom-pinned{' '}
            <code>footer</code> band and an <code>actions</code> row.{' '}
            <code>widthRem</code> sets a steady width and{' '}
            <code>minBodyHeightRem</code> reserves height so the box doesn't
            jump as content changes — the slack falls above the footer, so
            footer + actions stay on the bottom edge. The browser moves focus to
            the first control and Tab cycles inside while the page behind is
            inert.
          </Lead>
          <Lead>
            The <strong>chrome is not a choice</strong> (#837): every dialog
            draws a full-bleed rule under the heading and another above the
            actions, with the buttons grouped at the <strong>inline-end</strong>{' '}
            — dismiss first, emphasised confirm last. Nothing is passed to get
            it, and there is no prop to opt out; what the error modal introduced
            is now simply what a <code>Dialog</code> is. Two edges worth
            knowing: a <code>footer</code> band sits <em>above</em> the actions
            rule (it is the content's last word, not part of the button row),
            and <code>titleHidden</code> drops the heading rule with the heading
            while <code>chromeless</code> drops both — a hairline needs a
            surface to divide. (Opening a Combobox / Select <em>inside</em> a
            dialog needs extra care — see the "in a dialog" card under
            Selectors.)
          </Lead>
          <Row>
            <Button
              icon={<PlusCircleIcon />}
              onClick={() => setDialogOpen(true)}
            >
              New shipment
            </Button>
          </Row>
          <Dialog
            open={dialogOpen()}
            onClose={() => setDialogOpen(false)}
            icon={<PlusCircleIcon />}
            title="New shipment"
            description="Give the shipment a reference."
            widthRem={34}
            minBodyHeightRem={16}
            footer={
              <Alert severity="info">
                A new draft shipment will be created.
              </Alert>
            }
            actions={
              <>
                <CancelButton onClick={() => setDialogOpen(false)} />
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
        </DashboardCard>

        <DashboardCard id="dialog-widths" title="Width presets — the measures">
          <Lead>
            <code>width</code> takes one of the three shared content{' '}
            <strong>measures</strong> — the same vocabulary{' '}
            <code>ContentContainer</code>'s <code>size</code> uses, so a form in
            a dialog is as wide as that form in a page: <code>prose</code>{' '}
            (single-column text or a short form), <code>form</code> (a
            comfortable two-column form) and <code>wide</code> (a dense form or
            a result table). Open the three and watch only the frame change —
            the two-column body below is the same markup each time. Prefer a
            measure over <code>widthRem</code>, which is for a genuinely bespoke
            width: a measure keeps a multi-step flow one steady box instead of a
            dialog that jumps wider on the step with a table in it. And note
            what a measure canNOT be replaced by — capping the <em>content</em>{' '}
            with a <code>ContentContainer</code> inside leaves the frame, its
            title row and its actions row at the old width with the body
            floating in the middle. A measure also opts the dialog into the
            shared <strong>full-screen</strong> treatment below the
            narrow-viewport line — narrow the window past tablet portrait and
            reopen one: a page-sized surface becomes a sheet rather than an
            edge-to-edge card clinging to a 1rem margin.
          </Lead>
          <Row>
            <For each={['prose', 'form', 'wide'] as const}>
              {measure => (
                <Button
                  variant="secondary"
                  onClick={() => setWidthDemo(measure)}
                >
                  width="{measure}"
                </Button>
              )}
            </For>
          </Row>
          <Dialog
            open={widthDemo() !== undefined}
            onClose={() => setWidthDemo(undefined)}
            title={`Patient details — width="${widthDemo() ?? ''}"`}
            width={widthDemo()}
            actions={
              <>
                <CancelButton onClick={() => setWidthDemo(undefined)} />
                <DialogSaveButton onClick={() => setWidthDemo(undefined)} />
              </>
            }
          >
            <FormColumns>
              <FormColumn>
                <FormSection title="Patient details">
                  <TextField label="First name" />
                  <TextField label="Last name" />
                </FormSection>
              </FormColumn>
              <FormColumn>
                <FormSection title="Contact">
                  <TextField label="Address" />
                  <TextField label="Phone" />
                </FormSection>
              </FormColumn>
            </FormColumns>
          </Dialog>
        </DashboardCard>

        <DashboardCard
          id="dialog-large"
          title={'Large "workbench" dialog — size="large"'}
        >
          <Lead>
            <code>size="large"</code> is a centred card at its working width —
            56rem by default, or <code>widthRem</code> for a bigger card — whose
            height is elastic between ~60vh and ~80vh, for content-heavy modals
            like the stock line editor. Its sibling <code>size="full"</code> is
            the same box with no width cap, filling the viewport in both axes (
            <code>100vw - 4rem</code> / <code>100vh - 4rem</code>), for content
            no card fits: the shipment and stocktake line editors run to ~20
            columns, and the internal-order and requisition editors hold regions
            (a charts row, a three-column figure grid) that cap themselves wider
            than a card's body. All six line editors take it — the prescription
            one would fit a card, but a user stepping between them should meet
            one surface shape, not two. Narrowing those hides content without
            removing any empty space — the empty space #771 was filed against is
            vertical, and the ~60vh floor both sizes share is what answers it.
            Short content makes a short modal; past the height cap the body
            becomes a bounded flex column, so a single tall child (a DataTable
            in the app) fills the space and <em>scrolls internally</em> while
            the header, <code>footer</code> and <code>actions</code> stay pinned
            to the edges. Below the narrow-viewport line (tablet portrait and
            phones) it goes <strong>full-screen</strong>, edge to edge with no
            radius — as does any dialog sized by a <code>width</code> measure. A
            default or <code>widthRem</code> dialog stays a centred card at
            every width.
          </Lead>
          <Row>
            <Button
              icon={<PlusCircleIcon />}
              onClick={() => setWorkbenchOpen(true)}
            >
              Edit lines
            </Button>
          </Row>
          <Dialog
            open={workbenchOpen()}
            onClose={() => setWorkbenchOpen(false)}
            size="large"
            icon={<PlusCircleIcon />}
            title="Edit lines — stock take"
            headerActions={
              <Button
                variant="secondary"
                icon={<PlusCircleIcon />}
                onClick={addLine}
              >
                Add line
              </Button>
            }
            footer={
              <Alert severity="info">
                {lines().length} lines — the list scrolls; the header, this
                banner and the actions stay put.
              </Alert>
            }
            actions={
              <>
                <CancelButton onClick={() => setWorkbenchOpen(false)} />
                <DialogSaveButton onClick={() => setWorkbenchOpen(false)} />
              </>
            }
          >
            <div class={styles.workbench}>
              <For each={lines()}>
                {line => (
                  <div class={styles.workbenchRow}>
                    <span class={styles.workbenchCode}>{line.code}</span>
                    <span class={styles.workbenchName}>{line.name}</span>
                    <span class={styles.workbenchPacks}>
                      {line.packs} packs
                    </span>
                  </div>
                )}
              </For>
            </div>
          </Dialog>
        </DashboardCard>

        <DashboardCard
          id="dialog-sizes"
          title="All sizes × screen width — the responsive matrix"
        >
          <Lead>
            Every sizing option in one place, for checking the responsive rule
            (spec ui-standards › components › Modal dialog). A dialog's size
            picks its frame <strong>above</strong> the narrow-viewport line
            (breakpoints.ts › navOverlay, 1024px): <code>default</code> and{' '}
            <code>widthRem</code> are centred cards at their number, a{' '}
            <code>width</code> measure is a card at the shared measure,{' '}
            <code>size="large"</code> is a 56rem working card, and{' '}
            <code>size="full"</code> is a sheet filling the viewport bar a 2rem
            gutter. <strong>Below</strong> the line, the page-sized options —
            the three measures and both workbench sizes — expand to true full
            screen: 100vw × 100vh, no margin, no radius (#918);{' '}
            <code>default</code> and <code>widthRem</code> stay centred cards,
            since a confirmation was never wide enough to feel cramped. Resize
            the window across 1024px <em>with a dialog open</em> and watch it
            flip live.
          </Lead>
          <Row>
            <Button variant="secondary" onClick={() => setSizeDemo('default')}>
              default
            </Button>
            <Button variant="secondary" onClick={() => setSizeDemo('rem')}>
              widthRem={'{34}'}
            </Button>
            <For each={['prose', 'form', 'wide'] as const}>
              {measure => (
                <Button
                  variant="secondary"
                  onClick={() => setSizeDemo(measure)}
                >
                  width="{measure}"
                </Button>
              )}
            </For>
            <For each={['large', 'full'] as const}>
              {size => (
                <Button variant="secondary" onClick={() => setSizeDemo(size)}>
                  size="{size}"
                </Button>
              )}
            </For>
          </Row>
          <Dialog
            open={sizeDemo() !== undefined}
            onClose={() => setSizeDemo(undefined)}
            title={`Dialog — ${
              demoSize()
                ? `size="${demoSize() ?? ''}"`
                : demoMeasure()
                  ? `width="${demoMeasure() ?? ''}"`
                  : sizeDemo() === 'rem'
                    ? 'widthRem={34}'
                    : 'default'
            }`}
            width={demoMeasure()}
            widthRem={sizeDemo() === 'rem' ? 34 : undefined}
            size={demoSize()}
            actions={
              <>
                <CancelButton onClick={() => setSizeDemo(undefined)} />
                <DialogSaveButton onClick={() => setSizeDemo(undefined)} />
              </>
            }
          >
            {/* Workbench sizes get tall line-list content (their reason to
                exist); the card sizes get the two-column form. */}
            <Show
              when={demoSize()}
              fallback={
                <FormColumns>
                  <FormColumn>
                    <FormSection title="Patient details">
                      <TextField label="First name" />
                      <TextField label="Last name" />
                    </FormSection>
                  </FormColumn>
                  <FormColumn>
                    <FormSection title="Contact">
                      <TextField label="Address" />
                      <TextField label="Phone" />
                    </FormSection>
                  </FormColumn>
                </FormColumns>
              }
            >
              <div class={styles.workbench}>
                <For each={WORKBENCH_ROWS}>
                  {line => (
                    <div class={styles.workbenchRow}>
                      <span class={styles.workbenchCode}>{line.code}</span>
                      <span class={styles.workbenchName}>{line.name}</span>
                      <span class={styles.workbenchPacks}>
                        {line.packs} packs
                      </span>
                    </div>
                  )}
                </For>
              </div>
            </Show>
          </Dialog>
        </DashboardCard>

        <DashboardCard
          id="dialog-errors"
          title="Error dialogs — one per failure condition"
        >
          <Lead>
            <code>ErrorDialog</code> is the blocking error modal (ui-standards ›
            error dialogs; spec D109) — it retired{' '}
            <em>Oops! Something's gone wrong</em>. The <code>condition</code>{' '}
            picks fixed calm copy so a health worker understands what happened
            from the title and buttons alone: the primary is{' '}
            <strong>the fix</strong> (Retry / Try again), <strong>Close</strong>{' '}
            keeps the user on their screen, and the raw technical string appears
            only inside <strong>Show details</strong> — collapsed for a server
            error, open for the unmapped fallback, omitted entirely for the
            self-explanatory conditions. The support block carries a quotable
            timestamp-based reference. <strong>Go to dashboard</strong> is a
            quiet tertiary affordance, never a peer button — and the
            during-an-edit modifier drops it and adds the reassurance line, so
            leaving never costs the user their entry. In the app the global
            unexpected-error modal maps the transport failure to the condition
            automatically; nothing composes this dialog by hand.
          </Lead>
          <Row>
            <Button
              variant="secondary"
              onClick={() => setErrorDemo('unreachable')}
            >
              Can't reach the server
            </Button>
            <Button variant="secondary" onClick={() => setErrorDemo('timeout')}>
              Connection timed out
            </Button>
            <Button variant="secondary" onClick={() => setErrorDemo('server')}>
              Server error
            </Button>
            <Button variant="secondary" onClick={() => setErrorDemo('unknown')}>
              Unmapped fallback
            </Button>
            <Button variant="secondary" onClick={() => setErrorDemo('edit')}>
              During an edit
            </Button>
            <span class={styles.outcome} role="status">
              {errorOutcome()}
            </span>
          </Row>
          <ErrorDialog
            open={errorDemo() !== undefined}
            condition={errorCondition()}
            duringEdit={errorDemo() === 'edit'}
            details={{
              reference: 'e2d0-2026-07-30T09:18Z',
              cause:
                errorDemo() === 'server'
                  ? 'HTTP 503'
                  : 'unhandled — TypeError: undefined is not an object',
              store: 'CHC Ermera (5B28…5DF9)',
              request:
                errorDemo() === 'edit'
                  ? 'mutation upsertStocktakeLines'
                  : 'query stockLines',
            }}
            onClose={() => closeErrorDemo('Closed — still on this screen.')}
            onRetry={() => closeErrorDemo('Retry — the app would reload.')}
            onDashboard={() =>
              closeErrorDemo('Dashboard — the app would go to the root.')
            }
          />
        </DashboardCard>

        <DashboardCard
          id="dialog-store-selector"
          title="Store selector — in a blocking Dialog"
        >
          <Lead>
            The <code>StoreSelector</code> library component — hairline-divided
            list rows naming each store, with <code>Current</code> /{' '}
            <code>Default</code> / <code>Last used</code> StatusChips, the
            pinned rows under a <em>Recent stores</em> heading and the rest
            under <em>All stores</em>, a <code>TextField</code> search only for
            long lists (7+ stores), and a quiet always-open opt-in on one line
            BELOW the list (a pressed-state button, not a checkbox — it is a
            once-ever preference, so it does not hold the slot above the search
            that the panel's actual task needs). Search matches name or code
            ignoring case and accents — type <code>depot</code> to find{' '}
            <em>Dépôt Régional</em>, or <code>cs-men</code> to match a code the
            row does not display; a query that matches nothing names itself in
            the empty state and offers to clear. Clicking a row enters it
            directly (no Continue button, no follow-up prompt — issue #193);
            arrow keys move the highlight and Enter confirms it; the toggle
            state rides along as <code>onConfirm</code>'s{' '}
            <code>alwaysOpen</code> flag. Here it fills a{' '}
            <code>
              dismissable={'{'}false{'}'}
            </code>{' '}
            Dialog — blocking (no scrim/Escape dismiss, an answer is required);
            in the app it fills the routed store-selection screen's login frame.
          </Lead>
          <Row>
            <Button onClick={() => setStoreOpen(true)}>
              Open store selection
            </Button>
          </Row>
          <Show when={chosen()}>
            <Note>{chosen()}</Note>
          </Show>
          <Dialog
            open={storeOpen()}
            onClose={() => setStoreOpen(false)}
            dismissable={false}
            title="Select a store"
          >
            {/* hideTitle: the Dialog's heading carries the title here, exactly
                as the app's store-switch modal does — without it the panel's
                own <h2> repeats it. */}
            <StoreSelector
              stores={STORES}
              hideTitle
              defaultStoreId="AFCA0C9F0743AB43B779FB9EA2E64EAF"
              lastUsedStoreId="5B28901C52396E4BB098B9862CCF5DF9"
              currentStoreId="5B28901C52396E4BB098B9862CCF5DF9"
              pinnedCount={2}
              onConfirm={(id, alwaysOpen) => {
                const store = STORES.find(s => s.id === id);
                setChosen(
                  store
                    ? `Entered ${store.name}${alwaysOpen ? ' (always open)' : ''}`
                    : ''
                );
                setStoreOpen(false);
              }}
            />
          </Dialog>
        </DashboardCard>
      </Stack>
    </ContentContainer>
  );
};
